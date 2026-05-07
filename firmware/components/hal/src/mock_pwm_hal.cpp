#include "hal/pwm_hal.hpp"

#include <optional>

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "MockPwmHal is not initialized");
}

HalStatus unknown_id_status(const std::string& output_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown pwm output: " + output_id);
}

HalStatus fault_status(const std::string& output_id) {
  return HalStatus::error(HalErrorCode::fault, "pwm output is faulted: " + output_id);
}

}  // namespace

MockPwmHal::MockPwmHal(std::vector<PwmOutputChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.limits,
            channel.initial_duty,
            channel.initial_enabled,
            channel.faulted});
  }
}

HalStatus MockPwmHal::initialize() {
  for (auto& [id, channel] : channels_) {
    const auto validation = validate_limits(
        channel.limits.duty_min,
        channel.limits.duty_max,
        channel.limits.duty_safe);
    if (!validation.ok()) {
      return HalStatus::error(validation.code, "invalid PWM limits for " + id + ": " + validation.message);
    }

    channel.duty_percent = clamp_duty(channel.duty_percent, channel.limits);
  }

  initialized_ = true;
  return HalStatus::success();
}

HalStatus MockPwmHal::set_duty_percent(const std::string& output_id, PwmDutyPercent duty_percent) {
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
  return HalStatus::success();
}

HalResult<PwmDutyPercent> MockPwmHal::get_duty_percent(const std::string& output_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return {unknown_id_status(output_id), std::nullopt};
  }

  return {HalStatus::success(), channel->duty_percent};
}

HalStatus MockPwmHal::set_enabled(const std::string& output_id, bool enabled) {
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

  channel->enabled = enabled;
  return HalStatus::success();
}

HalResult<bool> MockPwmHal::get_enabled(const std::string& output_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return {unknown_id_status(output_id), std::nullopt};
  }

  return {HalStatus::success(), channel->enabled};
}

HalStatus MockPwmHal::configure_limits(
    const std::string& output_id,
    PwmDutyPercent duty_min,
    PwmDutyPercent duty_max,
    PwmDutyPercent duty_safe) {
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
  return HalStatus::success();
}

HalStatus MockPwmHal::apply_safe_state(const std::string& output_id) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return unknown_id_status(output_id);
  }

  channel->duty_percent = channel->limits.duty_safe;
  channel->enabled = false;
  return HalStatus::success();
}

HalStatus MockPwmHal::set_fault(const std::string& output_id, bool faulted) {
  auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return unknown_id_status(output_id);
  }

  channel->faulted = faulted;
  if (faulted) {
    channel->enabled = false;
  }
  return HalStatus::success();
}

HalResult<PwmLimits> MockPwmHal::get_limits(const std::string& output_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(output_id);
  if (channel == nullptr) {
    return {unknown_id_status(output_id), std::nullopt};
  }

  return {HalStatus::success(), channel->limits};
}

HalStatus MockPwmHal::validate_limits(
    PwmDutyPercent duty_min,
    PwmDutyPercent duty_max,
    PwmDutyPercent duty_safe) {
  if (duty_min < 0.0 || duty_max > 100.0 || duty_safe < 0.0 || duty_safe > 100.0) {
    return HalStatus::error(HalErrorCode::invalid_range, "PWM duty must stay within 0..100 percent");
  }
  if (duty_max < duty_min) {
    return HalStatus::error(HalErrorCode::invalid_range, "duty_max must be greater than or equal to duty_min");
  }
  if (duty_safe < duty_min || duty_safe > duty_max) {
    return HalStatus::error(
        HalErrorCode::invalid_range,
        "duty_safe must be within the configured min/max range");
  }
  return HalStatus::success();
}

PwmDutyPercent MockPwmHal::clamp_duty(PwmDutyPercent duty, const PwmLimits& limits) {
  if (duty < limits.duty_min) {
    return limits.duty_min;
  }
  if (duty > limits.duty_max) {
    return limits.duty_max;
  }
  return duty;
}

MockPwmHal::ChannelState* MockPwmHal::find_channel(const std::string& output_id) {
  const auto it = channels_.find(output_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const MockPwmHal::ChannelState* MockPwmHal::find_channel(const std::string& output_id) const {
  const auto it = channels_.find(output_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
