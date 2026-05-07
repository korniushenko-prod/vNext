#include "hal/digital_input_hal.hpp"

#include <optional>

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "MockDigitalInputHal is not initialized");
}

HalStatus unknown_id_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown digital input: " + input_id);
}

HalStatus fault_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::fault, "digital input is faulted: " + input_id);
}

}  // namespace

MockDigitalInputHal::MockDigitalInputHal(std::vector<DigitalInputChannelConfig> channels) {
  for (const auto& channel : channels) {
    const bool logical_state = apply_polarity(channel.initial_raw_state, channel.polarity);
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.polarity,
            channel.debounce_ms,
            channel.validity,
            channel.initial_raw_state,
            logical_state,
            logical_state,
            0U});
  }
}

HalStatus MockDigitalInputHal::initialize() {
  initialized_ = true;
  return HalStatus::success();
}

HalResult<bool> MockDigitalInputHal::read_raw(const std::string& input_id) const {
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

  return {HalStatus::success(), channel->raw_state};
}

HalResult<bool> MockDigitalInputHal::read_debounced(const std::string& input_id, MonotonicTimeMs now_ms) {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }
  if (channel->validity == InputValidity::faulted) {
    return {fault_status(input_id), std::nullopt};
  }

  if (channel->debounced_state != channel->pending_state &&
      now_ms >= channel->last_change_ms + channel->debounce_ms) {
    channel->debounced_state = channel->pending_state;
  }

  return {HalStatus::success(), channel->debounced_state};
}

HalStatus MockDigitalInputHal::configure_debounce(const std::string& input_id, std::uint32_t debounce_ms) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->debounce_ms = debounce_ms;
  return HalStatus::success();
}

HalStatus MockDigitalInputHal::configure_polarity(const std::string& input_id, InputPolarity polarity) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->polarity = polarity;
  const bool logical_state = apply_polarity(channel->raw_state, polarity);
  channel->pending_state = logical_state;
  channel->debounced_state = logical_state;
  return HalStatus::success();
}

HalResult<InputValidity> MockDigitalInputHal::get_validity(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }

  return {HalStatus::success(), channel->validity};
}

HalStatus MockDigitalInputHal::set_mock_raw_state(
    const std::string& input_id,
    bool raw_state,
    MonotonicTimeMs now_ms) {
  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  if (channel->raw_state == raw_state) {
    return HalStatus::success();
  }

  channel->raw_state = raw_state;
  channel->pending_state = apply_polarity(raw_state, channel->polarity);
  channel->last_change_ms = now_ms;
  return HalStatus::success();
}

HalStatus MockDigitalInputHal::set_validity(const std::string& input_id, InputValidity validity) {
  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->validity = validity;
  return HalStatus::success();
}

bool MockDigitalInputHal::apply_polarity(bool raw_state, InputPolarity polarity) {
  return polarity == InputPolarity::active_high ? raw_state : !raw_state;
}

MockDigitalInputHal::ChannelState* MockDigitalInputHal::find_channel(const std::string& input_id) {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const MockDigitalInputHal::ChannelState* MockDigitalInputHal::find_channel(const std::string& input_id) const {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
