#include "hal/esp32_hal.hpp"

#include <optional>

#include "driver/gpio.h"
#include "esp_timer.h"

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "Esp32PulseInputHal is not initialized");
}

HalStatus unknown_id_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown pulse input: " + input_id);
}

HalStatus fault_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::fault, "pulse input is faulted: " + input_id);
}

MonotonicTimeMs monotonic_ms() {
  return static_cast<MonotonicTimeMs>(esp_timer_get_time() / 1000ULL);
}

}  // namespace

Esp32PulseInputHal::Esp32PulseInputHal(std::vector<Esp32PulseInputChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.gpio,
            channel.pullup_enabled,
            channel.pulldown_enabled,
            channel.resettable,
            channel.validity,
            0U,
            0U,
            0U,
            !is_unbound_pin(channel.gpio),
        });
  }
}

HalStatus Esp32PulseInputHal::initialize() {
  if (const auto error = gpio_install_isr_service(0); error != ESP_OK && error != ESP_ERR_INVALID_STATE) {
    return HalStatus::error(HalErrorCode::fault, "gpio_install_isr_service failed");
  }
  isr_service_installed_ = true;

  for (auto& [id, channel] : channels_) {
    (void)id;
    channel.last_frequency_sample_ms = monotonic_ms();

    if (!channel.bound) {
      channel.validity = InputValidity::invalid;
      continue;
    }
    if (!is_valid_esp32_gpio(channel.gpio)) {
      return HalStatus::error(
          HalErrorCode::invalid_range,
          "pulse input uses invalid GPIO" + std::to_string(channel.gpio));
    }

    gpio_config_t config{};
    config.pin_bit_mask = 1ULL << channel.gpio;
    config.mode = GPIO_MODE_INPUT;
    config.pull_up_en = channel.pullup_enabled ? GPIO_PULLUP_ENABLE : GPIO_PULLUP_DISABLE;
    config.pull_down_en = channel.pulldown_enabled ? GPIO_PULLDOWN_ENABLE : GPIO_PULLDOWN_DISABLE;
    config.intr_type = GPIO_INTR_POSEDGE;
    if (const auto error = gpio_config(&config); error != ESP_OK) {
      return HalStatus::error(HalErrorCode::fault, "gpio_config failed for pulse input GPIO" + std::to_string(channel.gpio));
    }
    if (const auto error =
            gpio_isr_handler_add(static_cast<gpio_num_t>(channel.gpio), &Esp32PulseInputHal::handle_gpio_isr, &channel);
        error != ESP_OK) {
      return HalStatus::error(HalErrorCode::fault, "gpio_isr_handler_add failed for GPIO" + std::to_string(channel.gpio));
    }
  }

  initialized_ = true;
  return HalStatus::success();
}

HalResult<PulseCount> Esp32PulseInputHal::get_count(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }
  if (channel->validity == InputValidity::faulted) {
    return {fault_status(input_id), std::nullopt};
  }

  return {HalStatus::success(), static_cast<PulseCount>(channel->count)};
}

HalStatus Esp32PulseInputHal::reset_count(const std::string& input_id) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }
  if (!channel->resettable) {
    return HalStatus::error(HalErrorCode::write_denied, "pulse input count reset is denied: " + input_id);
  }

  channel->count = 0U;
  channel->last_frequency_sample_count = 0U;
  channel->last_frequency_sample_ms = monotonic_ms();
  return HalStatus::success();
}

HalResult<double> Esp32PulseInputHal::get_frequency_hz(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }
  if (channel->validity == InputValidity::faulted) {
    return {fault_status(input_id), std::nullopt};
  }
  if (!channel->bound) {
    return {HalStatus::success(), 0.0};
  }

  const auto now_ms = monotonic_ms();
  const auto elapsed_ms = now_ms > channel->last_frequency_sample_ms ? now_ms - channel->last_frequency_sample_ms : 0U;
  const auto count_now = channel->count;
  const auto delta_count = count_now >= channel->last_frequency_sample_count ? (count_now - channel->last_frequency_sample_count) : 0U;

  double frequency_hz = 0.0;
  if (elapsed_ms > 0U) {
    frequency_hz = (static_cast<double>(delta_count) * 1000.0) / static_cast<double>(elapsed_ms);
  }

  channel->last_frequency_sample_ms = now_ms;
  channel->last_frequency_sample_count = count_now;
  return {HalStatus::success(), frequency_hz};
}

HalResult<InputValidity> Esp32PulseInputHal::get_validity(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }

  return {HalStatus::success(), channel->validity};
}

void Esp32PulseInputHal::handle_gpio_isr(void* arg) {
  auto* channel = static_cast<ChannelState*>(arg);
  if (channel != nullptr) {
    channel->count = channel->count + 1U;
  }
}

Esp32PulseInputHal::ChannelState* Esp32PulseInputHal::find_channel(const std::string& input_id) {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const Esp32PulseInputHal::ChannelState* Esp32PulseInputHal::find_channel(const std::string& input_id) const {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
