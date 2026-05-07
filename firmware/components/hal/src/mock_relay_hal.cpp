#include "hal/relay_hal.hpp"

#include <optional>

namespace controller::hal {

namespace {

HalStatus not_initialized_status(const char* interface_name) {
  return HalStatus::error(
      HalErrorCode::not_initialized,
      std::string(interface_name) + " is not initialized");
}

HalStatus unknown_id_status(const char* kind, const std::string& id) {
  return HalStatus::error(HalErrorCode::unknown_id, std::string("unknown ") + kind + ": " + id);
}

}  // namespace

MockRelayHal::MockRelayHal(std::vector<RelayChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{channel.startup_state, channel.safe_state, channel.startup_state});
  }
}

HalStatus MockRelayHal::initialize() {
  for (auto& [id, channel] : channels_) {
    (void)id;
    channel.state = channel.startup_state;
  }
  initialized_ = true;
  return HalStatus::success();
}

HalStatus MockRelayHal::set_state(const std::string& relay_id, RelayState state) {
  if (!initialized_) {
    return not_initialized_status("MockRelayHal");
  }

  auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return unknown_id_status("relay", relay_id);
  }

  channel->state = state;
  return HalStatus::success();
}

HalResult<RelayState> MockRelayHal::get_state(const std::string& relay_id) const {
  if (!initialized_) {
    return {not_initialized_status("MockRelayHal"), std::nullopt};
  }

  const auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return {unknown_id_status("relay", relay_id), std::nullopt};
  }

  return {HalStatus::success(), channel->state};
}

HalStatus MockRelayHal::apply_safe_state(const std::string& relay_id) {
  if (!initialized_) {
    return not_initialized_status("MockRelayHal");
  }

  auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return unknown_id_status("relay", relay_id);
  }

  channel->state = channel->safe_state;
  return HalStatus::success();
}

HalStatus MockRelayHal::apply_all_safe_states() {
  if (!initialized_) {
    return not_initialized_status("MockRelayHal");
  }

  for (auto& [id, channel] : channels_) {
    (void)id;
    channel.state = channel.safe_state;
  }

  return HalStatus::success();
}

HalResult<RelayState> MockRelayHal::get_safe_state(const std::string& relay_id) const {
  if (!initialized_) {
    return {not_initialized_status("MockRelayHal"), std::nullopt};
  }

  const auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return {unknown_id_status("relay", relay_id), std::nullopt};
  }

  return {HalStatus::success(), channel->safe_state};
}

MockRelayHal::ChannelState* MockRelayHal::find_channel(const std::string& relay_id) {
  const auto it = channels_.find(relay_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const MockRelayHal::ChannelState* MockRelayHal::find_channel(const std::string& relay_id) const {
  const auto it = channels_.find(relay_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
