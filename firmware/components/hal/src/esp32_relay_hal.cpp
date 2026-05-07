#include "hal/esp32_hal.hpp"

#include <optional>

#include "driver/gpio.h"

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "Esp32RelayHal is not initialized");
}

HalStatus unknown_id_status(const std::string& relay_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown relay: " + relay_id);
}

bool level_for_state(const RelayState state, const bool active_high) {
  const bool on = state == RelayState::on;
  return active_high ? on : !on;
}

HalStatus configure_output_pin(const int gpio, const bool level_high) {
  gpio_config_t config{};
  config.pin_bit_mask = 1ULL << gpio;
  config.mode = GPIO_MODE_OUTPUT;
  config.pull_down_en = GPIO_PULLDOWN_DISABLE;
  config.pull_up_en = GPIO_PULLUP_DISABLE;
  config.intr_type = GPIO_INTR_DISABLE;
  if (const auto error = gpio_config(&config); error != ESP_OK) {
    return HalStatus::error(HalErrorCode::fault, "gpio_config failed for relay GPIO" + std::to_string(gpio));
  }
  if (const auto error = gpio_set_level(static_cast<gpio_num_t>(gpio), level_high ? 1 : 0); error != ESP_OK) {
    return HalStatus::error(HalErrorCode::fault, "gpio_set_level failed for relay GPIO" + std::to_string(gpio));
  }
  return HalStatus::success();
}

}  // namespace

Esp32RelayHal::Esp32RelayHal(std::vector<Esp32RelayChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.gpio,
            channel.safe_state,
            channel.safe_state,
            channel.startup_state,
            channel.active_high,
            !is_unbound_pin(channel.gpio),
        });
  }
}

HalStatus Esp32RelayHal::initialize() {
  for (auto& [id, channel] : channels_) {
    (void)id;
    channel.state = channel.safe_state;
    if (!channel.bound) {
      continue;
    }
    if (!is_valid_esp32_gpio(channel.gpio) || !is_output_capable_esp32_gpio(channel.gpio)) {
      return HalStatus::error(
          HalErrorCode::invalid_range,
          "relay channel uses invalid output GPIO" + std::to_string(channel.gpio));
    }
    const auto status = configure_output_pin(channel.gpio, level_for_state(channel.startup_state, channel.active_high));
    if (!status.ok()) {
      return status;
    }
    channel.state = channel.startup_state;
  }

  initialized_ = true;
  return HalStatus::success();
}

HalStatus Esp32RelayHal::set_state(const std::string& relay_id, const RelayState state) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return unknown_id_status(relay_id);
  }

  if (!channel->bound) {
    channel->state = channel->safe_state;
    return HalStatus::success();
  }

  if (const auto error = gpio_set_level(
          static_cast<gpio_num_t>(channel->gpio),
          level_for_state(state, channel->active_high) ? 1 : 0);
      error != ESP_OK) {
    channel->state = channel->safe_state;
    return HalStatus::error(HalErrorCode::fault, "failed to drive relay GPIO" + std::to_string(channel->gpio));
  }

  channel->state = state;
  return HalStatus::success();
}

HalResult<RelayState> Esp32RelayHal::get_state(const std::string& relay_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return {unknown_id_status(relay_id), std::nullopt};
  }

  return {HalStatus::success(), channel->state};
}

HalStatus Esp32RelayHal::apply_safe_state(const std::string& relay_id) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return unknown_id_status(relay_id);
  }

  return set_state(relay_id, channel->safe_state);
}

HalStatus Esp32RelayHal::apply_all_safe_states() {
  if (!initialized_) {
    return not_initialized_status();
  }

  for (auto& [id, channel] : channels_) {
    (void)channel;
    const auto status = apply_safe_state(id);
    if (!status.ok()) {
      return status;
    }
  }

  return HalStatus::success();
}

HalResult<RelayState> Esp32RelayHal::get_safe_state(const std::string& relay_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(relay_id);
  if (channel == nullptr) {
    return {unknown_id_status(relay_id), std::nullopt};
  }

  return {HalStatus::success(), channel->safe_state};
}

Esp32RelayHal::ChannelState* Esp32RelayHal::find_channel(const std::string& relay_id) {
  const auto it = channels_.find(relay_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const Esp32RelayHal::ChannelState* Esp32RelayHal::find_channel(const std::string& relay_id) const {
  const auto it = channels_.find(relay_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
