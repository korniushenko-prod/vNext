#include "hal/stepper_hal.hpp"

#include <cmath>
#include <optional>

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "MockStepperHal is not initialized");
}

HalStatus unknown_id_status(const std::string& stepper_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown stepper: " + stepper_id);
}

HalStatus fault_status(const std::string& stepper_id) {
  return HalStatus::error(HalErrorCode::fault, "stepper is faulted: " + stepper_id);
}

}  // namespace

MockStepperHal::MockStepperHal(std::vector<StepperChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.initial_direction,
            channel.initial_enabled,
            channel.initial_fault,
            channel.initial_stop_mode,
            channel.initial_step_rate_hz});
  }
}

HalStatus MockStepperHal::initialize() {
  initialized_ = true;
  return HalStatus::success();
}

HalStatus MockStepperHal::set_enabled(const std::string& stepper_id, bool enabled) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return unknown_id_status(stepper_id);
  }
  if (channel->faulted && enabled) {
    return fault_status(stepper_id);
  }

  channel->enabled = enabled;
  if (!enabled) {
    channel->step_rate_hz = 0.0;
  }
  return HalStatus::success();
}

HalResult<bool> MockStepperHal::get_enabled(const std::string& stepper_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return {unknown_id_status(stepper_id), std::nullopt};
  }

  return {HalStatus::success(), channel->enabled};
}

HalStatus MockStepperHal::stop(const std::string& stepper_id) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return unknown_id_status(stepper_id);
  }

  channel->enabled = false;
  channel->last_stop_mode = StepperStopMode::hold;
  channel->step_rate_hz = 0.0;
  return HalStatus::success();
}

HalStatus MockStepperHal::emergency_stop(const std::string& stepper_id) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return unknown_id_status(stepper_id);
  }

  channel->enabled = false;
  channel->last_stop_mode = StepperStopMode::emergency;
  channel->step_rate_hz = 0.0;
  return HalStatus::success();
}

HalStatus MockStepperHal::set_direction(const std::string& stepper_id, StepperDirection direction) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return unknown_id_status(stepper_id);
  }
  if (channel->faulted) {
    return fault_status(stepper_id);
  }

  channel->direction = direction;
  return HalStatus::success();
}

HalResult<StepperDirection> MockStepperHal::get_direction(const std::string& stepper_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return {unknown_id_status(stepper_id), std::nullopt};
  }

  return {HalStatus::success(), channel->direction};
}

HalStatus MockStepperHal::set_step_rate_hz(const std::string& stepper_id, const double step_rate_hz) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return unknown_id_status(stepper_id);
  }
  if (channel->faulted && step_rate_hz > 0.0) {
    return fault_status(stepper_id);
  }
  if (!std::isfinite(step_rate_hz) || step_rate_hz < 0.0) {
    return HalStatus::error(HalErrorCode::invalid_range, "step rate must be finite and >= 0");
  }

  channel->step_rate_hz = step_rate_hz;
  return HalStatus::success();
}

HalResult<double> MockStepperHal::get_step_rate_hz(const std::string& stepper_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return {unknown_id_status(stepper_id), std::nullopt};
  }

  return {HalStatus::success(), channel->step_rate_hz};
}

HalResult<bool> MockStepperHal::get_fault(const std::string& stepper_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return {unknown_id_status(stepper_id), std::nullopt};
  }

  return {HalStatus::success(), channel->faulted};
}

HalResult<StepperStopMode> MockStepperHal::get_last_stop_mode(const std::string& stepper_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return {unknown_id_status(stepper_id), std::nullopt};
  }

  return {HalStatus::success(), channel->last_stop_mode};
}

HalStatus MockStepperHal::set_fault(const std::string& stepper_id, bool faulted) {
  auto* channel = find_channel(stepper_id);
  if (channel == nullptr) {
    return unknown_id_status(stepper_id);
  }

  channel->faulted = faulted;
  if (faulted) {
    channel->enabled = false;
    channel->last_stop_mode = StepperStopMode::emergency;
    channel->step_rate_hz = 0.0;
  }
  return HalStatus::success();
}

MockStepperHal::ChannelState* MockStepperHal::find_channel(const std::string& stepper_id) {
  const auto it = channels_.find(stepper_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const MockStepperHal::ChannelState* MockStepperHal::find_channel(const std::string& stepper_id) const {
  const auto it = channels_.find(stepper_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
