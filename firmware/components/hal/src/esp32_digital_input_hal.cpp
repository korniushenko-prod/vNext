#include "hal/esp32_hal.hpp"

#include <optional>

#include "driver/gpio.h"

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "Esp32DigitalInputHal is not initialized");
}

HalStatus unknown_id_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown digital input: " + input_id);
}

HalStatus fault_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::fault, "digital input is faulted: " + input_id);
}

}  // namespace

Esp32DigitalInputHal::Esp32DigitalInputHal(std::vector<Esp32DigitalInputChannelConfig> channels) {
  for (const auto& channel : channels) {
    const bool logical_state = apply_polarity(channel.initial_raw_state, channel.polarity);
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.gpio,
            channel.polarity,
            channel.debounce_ms,
            channel.validity,
            channel.initial_raw_state,
            logical_state,
            logical_state,
            0U,
            channel.pullup_enabled,
            channel.pulldown_enabled,
            !is_unbound_pin(channel.gpio),
        });
  }
}

HalStatus Esp32DigitalInputHal::initialize() {
  for (auto& [id, channel] : channels_) {
    (void)id;
    if (!channel.bound) {
      channel.validity = InputValidity::invalid;
      continue;
    }
    if (!is_valid_esp32_gpio(channel.gpio)) {
      return HalStatus::error(
          HalErrorCode::invalid_range,
          "digital input uses invalid GPIO" + std::to_string(channel.gpio));
    }

    gpio_config_t config{};
    config.pin_bit_mask = 1ULL << channel.gpio;
    config.mode = GPIO_MODE_INPUT;
    config.pull_up_en = channel.pullup_enabled ? GPIO_PULLUP_ENABLE : GPIO_PULLUP_DISABLE;
    config.pull_down_en = channel.pulldown_enabled ? GPIO_PULLDOWN_ENABLE : GPIO_PULLDOWN_DISABLE;
    config.intr_type = GPIO_INTR_DISABLE;
    if (const auto error = gpio_config(&config); error != ESP_OK) {
      return HalStatus::error(HalErrorCode::fault, "gpio_config failed for digital input GPIO" + std::to_string(channel.gpio));
    }

    channel.raw_state = gpio_get_level(static_cast<gpio_num_t>(channel.gpio)) != 0;
    channel.pending_state = apply_polarity(channel.raw_state, channel.polarity);
    channel.debounced_state = channel.pending_state;
  }

  initialized_ = true;
  return HalStatus::success();
}

HalResult<bool> Esp32DigitalInputHal::read_raw(const std::string& input_id) const {
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
    return {HalStatus::success(), false};
  }

  return {HalStatus::success(), gpio_get_level(static_cast<gpio_num_t>(channel->gpio)) != 0};
}

HalResult<bool> Esp32DigitalInputHal::read_debounced(const std::string& input_id, const MonotonicTimeMs now_ms) {
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
  if (!channel->bound) {
    return {HalStatus::success(), false};
  }

  const bool raw_state = gpio_get_level(static_cast<gpio_num_t>(channel->gpio)) != 0;
  if (raw_state != channel->raw_state) {
    channel->raw_state = raw_state;
    channel->pending_state = apply_polarity(raw_state, channel->polarity);
    channel->last_change_ms = now_ms;
  }

  if (channel->debounced_state != channel->pending_state &&
      now_ms >= channel->last_change_ms + channel->debounce_ms) {
    channel->debounced_state = channel->pending_state;
  }

  return {HalStatus::success(), channel->debounced_state};
}

HalStatus Esp32DigitalInputHal::configure_debounce(const std::string& input_id, const std::uint32_t debounce_ms) {
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

HalStatus Esp32DigitalInputHal::configure_polarity(const std::string& input_id, const InputPolarity polarity) {
  if (!initialized_) {
    return not_initialized_status();
  }

  auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return unknown_id_status(input_id);
  }

  channel->polarity = polarity;
  channel->pending_state = apply_polarity(channel->raw_state, polarity);
  channel->debounced_state = channel->pending_state;
  return HalStatus::success();
}

HalResult<InputValidity> Esp32DigitalInputHal::get_validity(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }

  return {HalStatus::success(), channel->validity};
}

bool Esp32DigitalInputHal::apply_polarity(const bool raw_state, const InputPolarity polarity) {
  return polarity == InputPolarity::active_high ? raw_state : !raw_state;
}

Esp32DigitalInputHal::ChannelState* Esp32DigitalInputHal::find_channel(const std::string& input_id) {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const Esp32DigitalInputHal::ChannelState* Esp32DigitalInputHal::find_channel(const std::string& input_id) const {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
