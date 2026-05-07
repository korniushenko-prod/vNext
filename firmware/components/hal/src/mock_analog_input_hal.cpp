#include "hal/analog_input_hal.hpp"

#include <optional>

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "MockAnalogInputHal is not initialized");
}

HalStatus unknown_id_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown analog input: " + input_id);
}

HalStatus fault_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::fault, "analog input is faulted: " + input_id);
}

}  // namespace

MockAnalogInputHal::MockAnalogInputHal(std::vector<AnalogInputChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.scaling,
            channel.clamp_enabled,
            channel.initial_raw_value,
            channel.validity});
  }
}

HalStatus MockAnalogInputHal::initialize() {
  for (const auto& [id, channel] : channels_) {
    const auto validation = validate_scaling(
        channel.scaling.raw_min,
        channel.scaling.raw_max,
        channel.scaling.engineering_min,
        channel.scaling.engineering_max);
    if (!validation.ok()) {
      return HalStatus::error(
          validation.code,
          "invalid analog scaling for " + id + ": " + validation.message);
    }
  }

  initialized_ = true;
  return HalStatus::success();
}

HalResult<AnalogRawValue> MockAnalogInputHal::read_raw(const std::string& input_id) const {
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

  return {HalStatus::success(), channel->raw_value};
}

HalResult<AnalogEngineeringValue> MockAnalogInputHal::read_scaled(const std::string& input_id) const {
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

  return {
      HalStatus::success(),
      scale_value(channel->raw_value, channel->scaling, channel->clamp_enabled)};
}

HalStatus MockAnalogInputHal::configure_scaling(
    const std::string& input_id,
    AnalogRawValue raw_min,
    AnalogRawValue raw_max,
    AnalogEngineeringValue engineering_min,
    AnalogEngineeringValue engineering_max) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  const auto validation = validate_scaling(raw_min, raw_max, engineering_min, engineering_max);
  if (!validation.ok()) {
    return validation;
  }

  channel->scaling = AnalogScaling{raw_min, raw_max, engineering_min, engineering_max};
  return HalStatus::success();
}

HalStatus MockAnalogInputHal::configure_clamp(const std::string& input_id, bool enabled) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->clamp_enabled = enabled;
  return HalStatus::success();
}

HalResult<InputValidity> MockAnalogInputHal::get_validity(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }

  return {HalStatus::success(), channel->validity};
}

HalStatus MockAnalogInputHal::set_mock_raw_value(const std::string& input_id, AnalogRawValue raw_value) {
  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->raw_value = raw_value;
  return HalStatus::success();
}

HalStatus MockAnalogInputHal::set_validity(const std::string& input_id, InputValidity validity) {
  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->validity = validity;
  return HalStatus::success();
}

HalStatus MockAnalogInputHal::validate_scaling(
    AnalogRawValue raw_min,
    AnalogRawValue raw_max,
    AnalogEngineeringValue engineering_min,
    AnalogEngineeringValue engineering_max) {
  if (raw_max <= raw_min) {
    return HalStatus::error(HalErrorCode::invalid_range, "raw_max must be greater than raw_min");
  }
  if (engineering_max == engineering_min) {
    return HalStatus::error(
        HalErrorCode::invalid_range,
        "engineering_max must differ from engineering_min");
  }
  return HalStatus::success();
}

AnalogEngineeringValue MockAnalogInputHal::scale_value(
    AnalogRawValue raw_value,
    const AnalogScaling& scaling,
    bool clamp_enabled) {
  AnalogRawValue working_raw = raw_value;
  if (clamp_enabled) {
    if (working_raw < scaling.raw_min) {
      working_raw = scaling.raw_min;
    } else if (working_raw > scaling.raw_max) {
      working_raw = scaling.raw_max;
    }
  }

  const auto raw_span = static_cast<double>(scaling.raw_max - scaling.raw_min);
  const auto engineering_span = scaling.engineering_max - scaling.engineering_min;
  const auto ratio = static_cast<double>(working_raw - scaling.raw_min) / raw_span;
  return scaling.engineering_min + (ratio * engineering_span);
}

MockAnalogInputHal::ChannelState* MockAnalogInputHal::find_channel(const std::string& input_id) {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const MockAnalogInputHal::ChannelState* MockAnalogInputHal::find_channel(const std::string& input_id) const {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
