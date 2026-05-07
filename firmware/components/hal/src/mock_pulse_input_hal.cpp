#include "hal/pulse_input_hal.hpp"

#include <optional>

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "MockPulseInputHal is not initialized");
}

HalStatus unknown_id_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown pulse input: " + input_id);
}

HalStatus fault_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::fault, "pulse input is faulted: " + input_id);
}

}  // namespace

MockPulseInputHal::MockPulseInputHal(std::vector<PulseInputChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.initial_count,
            channel.initial_frequency_hz,
            channel.resettable,
            channel.validity});
  }
}

HalStatus MockPulseInputHal::initialize() {
  initialized_ = true;
  return HalStatus::success();
}

HalResult<PulseCount> MockPulseInputHal::get_count(const std::string& input_id) const {
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

  return {HalStatus::success(), channel->count};
}

HalStatus MockPulseInputHal::reset_count(const std::string& input_id) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }
  if (!channel->resettable) {
    return HalStatus::error(
        HalErrorCode::write_denied,
        "pulse input count reset is denied: " + input_id);
  }

  channel->count = 0U;
  return HalStatus::success();
}

HalResult<double> MockPulseInputHal::get_frequency_hz(const std::string& input_id) const {
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

  return {HalStatus::success(), channel->frequency_hz};
}

HalResult<InputValidity> MockPulseInputHal::get_validity(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }

  return {HalStatus::success(), channel->validity};
}

HalStatus MockPulseInputHal::increment_mock_count(const std::string& input_id, PulseCount delta) {
  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->count += delta;
  return HalStatus::success();
}

HalStatus MockPulseInputHal::set_mock_frequency_hz(const std::string& input_id, double frequency_hz) {
  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }
  if (frequency_hz < 0.0) {
    return HalStatus::error(HalErrorCode::invalid_range, "frequency_hz must be non-negative");
  }

  channel->frequency_hz = frequency_hz;
  return HalStatus::success();
}

HalStatus MockPulseInputHal::set_validity(const std::string& input_id, InputValidity validity) {
  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->validity = validity;
  return HalStatus::success();
}

MockPulseInputHal::ChannelState* MockPulseInputHal::find_channel(const std::string& input_id) {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const MockPulseInputHal::ChannelState* MockPulseInputHal::find_channel(const std::string& input_id) const {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
