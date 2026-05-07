#include "hal/esp32_hal.hpp"

#include <cmath>
#include <cstdint>
#include <optional>

#include "driver/ledc.h"

namespace controller::hal {

namespace {

constexpr ledc_mode_t kLedcMode = LEDC_LOW_SPEED_MODE;
constexpr ledc_timer_t kLedcTimer = LEDC_TIMER_0;

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "Esp32PwmHal is not initialized");
}

HalStatus unknown_id_status(const std::string& output_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown pwm output: " + output_id);
}

HalStatus fault_status(const std::string& output_id) {
  return HalStatus::error(HalErrorCode::fault, "pwm output is faulted: " + output_id);
}

ledc_timer_bit_t resolution_to_ledc_bits(const int bits) {
  switch (bits) {
    case 1:
      return LEDC_TIMER_1_BIT;
    case 2:
      return LEDC_TIMER_2_BIT;
    case 3:
      return LEDC_TIMER_3_BIT;
    case 4:
      return LEDC_TIMER_4_BIT;
    case 5:
      return LEDC_TIMER_5_BIT;
    case 6:
      return LEDC_TIMER_6_BIT;
    case 7:
      return LEDC_TIMER_7_BIT;
    case 8:
      return LEDC_TIMER_8_BIT;
    case 9:
      return LEDC_TIMER_9_BIT;
    case 10:
      return LEDC_TIMER_10_BIT;
    case 11:
      return LEDC_TIMER_11_BIT;
    case 12:
    default:
      return LEDC_TIMER_12_BIT;
  }
}

std::uint32_t duty_to_raw(const PwmDutyPercent logical_duty, const int resolution_bits, const bool active_high) {
  const double clamped = logical_duty < 0.0 ? 0.0 : (logical_duty > 100.0 ? 100.0 : logical_duty);
  const double logical_off = active_high ? clamped : (100.0 - clamped);
  const auto max_duty = static_cast<double>((1U << resolution_bits) - 1U);
  return static_cast<std::uint32_t>(std::lround((logical_off / 100.0) * max_duty));
}

}  // namespace

Esp32PwmHal::Esp32PwmHal(std::vector<Esp32PwmOutputChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.gpio,
            channel.ledc_channel,
            channel.frequency_hz,
            channel.resolution_bits,
            channel.limits,
            channel.initial_duty,
            channel.initial_enabled,
            channel.active_high,
            channel.faulted,
            !is_unbound_pin(channel.gpio),
        });
  }
}

HalStatus Esp32PwmHal::initialize() {
  bool timer_configured = false;

  for (auto& [id, channel] : channels_) {
    const auto validation = validate_limits(
        channel.limits.duty_min,
        channel.limits.duty_max,
        channel.limits.duty_safe);
    if (!validation.ok()) {
      return HalStatus::error(validation.code, "invalid PWM limits for " + id + ": " + validation.message);
    }
    channel.duty_percent = clamp_duty(channel.duty_percent, channel.limits);

    if (!channel.bound) {
      continue;
    }
    if (!is_valid_esp32_gpio(channel.gpio) || !is_output_capable_esp32_gpio(channel.gpio)) {
      return HalStatus::error(
          HalErrorCode::invalid_range,
          "pwm output uses invalid GPIO" + std::to_string(channel.gpio));
    }

    if (!timer_configured) {
      ledc_timer_config_t timer_config{};
      timer_config.speed_mode = kLedcMode;
      timer_config.timer_num = kLedcTimer;
      timer_config.duty_resolution = resolution_to_ledc_bits(channel.resolution_bits);
      timer_config.freq_hz = channel.frequency_hz;
      timer_config.clk_cfg = LEDC_AUTO_CLK;
      if (const auto error = ledc_timer_config(&timer_config); error != ESP_OK) {
        return HalStatus::error(HalErrorCode::fault, "ledc_timer_config failed");
      }
      timer_configured = true;
    }

    ledc_channel_config_t channel_config{};
    channel_config.gpio_num = channel.gpio;
    channel_config.speed_mode = kLedcMode;
    channel_config.channel = static_cast<ledc_channel_t>(channel.ledc_channel);
    channel_config.intr_type = LEDC_INTR_DISABLE;
    channel_config.timer_sel = kLedcTimer;
    channel_config.duty = 0U;
    channel_config.hpoint = 0U;
    if (const auto error = ledc_channel_config(&channel_config); error != ESP_OK) {
      return HalStatus::error(HalErrorCode::fault, "ledc_channel_config failed for GPIO" + std::to_string(channel.gpio));
    }
  }

  initialized_ = true;
  for (auto& [id, channel] : channels_) {
    (void)id;
    const auto status = apply_hardware_state(channel);
    if (!status.ok()) {
      return status;
    }
  }
  return HalStatus::success();
}

HalStatus Esp32PwmHal::set_duty_percent(const std::string& output_id, const PwmDutyPercent duty_percent) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return unknown_id_status(output_id);
  }
  if (channel->faulted) {
    return fault_status(output_id);
  }

  channel->duty_percent = clamp_duty(duty_percent, channel->limits);
  return apply_hardware_state(*channel);
}

HalResult<PwmDutyPercent> Esp32PwmHal::get_duty_percent(const std::string& output_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return {unknown_id_status(output_id), std::nullopt};
  }

  return {HalStatus::success(), channel->duty_percent};
}

HalStatus Esp32PwmHal::set_enabled(const std::string& output_id, const bool enabled) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return unknown_id_status(output_id);
  }
  if (channel->faulted && enabled) {
    return fault_status(output_id);
  }

  channel->enabled = channel->bound ? enabled : false;
  return apply_hardware_state(*channel);
}

HalResult<bool> Esp32PwmHal::get_enabled(const std::string& output_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return {unknown_id_status(output_id), std::nullopt};
  }

  return {HalStatus::success(), channel->enabled};
}

HalStatus Esp32PwmHal::configure_limits(
    const std::string& output_id,
    const PwmDutyPercent duty_min,
    const PwmDutyPercent duty_max,
    const PwmDutyPercent duty_safe) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return unknown_id_status(output_id);
  }

  const auto validation = validate_limits(duty_min, duty_max, duty_safe);
  if (!validation.ok()) {
    return validation;
  }

  channel->limits = PwmLimits{duty_min, duty_max, duty_safe};
  channel->duty_percent = clamp_duty(channel->duty_percent, channel->limits);
  return apply_hardware_state(*channel);
}

HalStatus Esp32PwmHal::apply_safe_state(const std::string& output_id) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return unknown_id_status(output_id);
  }

  channel->duty_percent = channel->limits.duty_safe;
  channel->enabled = false;
  return apply_hardware_state(*channel);
}

HalStatus Esp32PwmHal::validate_limits(
    const PwmDutyPercent duty_min,
    const PwmDutyPercent duty_max,
    const PwmDutyPercent duty_safe) {
  if (duty_min < 0.0 || duty_max > 100.0 || duty_safe < 0.0 || duty_safe > 100.0) {
    return HalStatus::error(HalErrorCode::invalid_range, "PWM duty must stay within 0..100 percent");
  }
  if (duty_max < duty_min) {
    return HalStatus::error(HalErrorCode::invalid_range, "duty_max must be greater than or equal to duty_min");
  }
  if (duty_safe < duty_min || duty_safe > duty_max) {
    return HalStatus::error(HalErrorCode::invalid_range, "duty_safe must be within the configured min/max range");
  }
  return HalStatus::success();
}

PwmDutyPercent Esp32PwmHal::clamp_duty(const PwmDutyPercent duty, const PwmLimits& limits) {
  if (duty < limits.duty_min) {
    return limits.duty_min;
  }
  if (duty > limits.duty_max) {
    return limits.duty_max;
  }
  return duty;
}

HalStatus Esp32PwmHal::apply_hardware_state(ChannelState& channel) {
  if (!channel.bound) {
    channel.enabled = false;
    channel.duty_percent = channel.limits.duty_safe;
    return HalStatus::success();
  }

  const auto duty_raw = duty_to_raw(channel.enabled ? channel.duty_percent : 0.0, channel.resolution_bits, channel.active_high);
  if (const auto error = ledc_set_duty(kLedcMode, static_cast<ledc_channel_t>(channel.ledc_channel), duty_raw);
      error != ESP_OK) {
    return HalStatus::error(HalErrorCode::fault, "ledc_set_duty failed for PWM GPIO" + std::to_string(channel.gpio));
  }
  if (const auto error = ledc_update_duty(kLedcMode, static_cast<ledc_channel_t>(channel.ledc_channel)); error != ESP_OK) {
    return HalStatus::error(HalErrorCode::fault, "ledc_update_duty failed for PWM GPIO" + std::to_string(channel.gpio));
  }

  return HalStatus::success();
}

Esp32PwmHal::ChannelState* Esp32PwmHal::find_channel(const std::string& output_id) {
  const auto it = channels_.find(output_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const Esp32PwmHal::ChannelState* Esp32PwmHal::find_channel(const std::string& output_id) const {
  const auto it = channels_.find(output_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
