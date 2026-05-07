#include "hal/esp32_hal.hpp"

#include <optional>

#include "driver/adc.h"

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "Esp32AnalogInputHal is not initialized");
}

HalStatus unknown_id_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::unknown_id, "unknown analog input: " + input_id);
}

HalStatus fault_status(const std::string& input_id) {
  return HalStatus::error(HalErrorCode::fault, "analog input is faulted: " + input_id);
}

int gpio_to_adc1_channel(const int gpio) {
  switch (gpio) {
    case 32:
      return static_cast<int>(ADC1_CHANNEL_4);
    case 33:
      return static_cast<int>(ADC1_CHANNEL_5);
    case 34:
      return static_cast<int>(ADC1_CHANNEL_6);
    case 35:
      return static_cast<int>(ADC1_CHANNEL_7);
    case 36:
      return static_cast<int>(ADC1_CHANNEL_0);
    case 39:
      return static_cast<int>(ADC1_CHANNEL_3);
    default:
      return -1;
  }
}

}  // namespace

Esp32AnalogInputHal::Esp32AnalogInputHal(std::vector<Esp32AnalogInputChannelConfig> channels) {
  for (const auto& channel : channels) {
    channels_.emplace(
        channel.id,
        ChannelState{
            channel.gpio,
            gpio_to_adc1_channel(channel.gpio),
            channel.scaling,
            channel.clamp_enabled,
            channel.validity,
            !is_unbound_pin(channel.gpio),
        });
  }
}

HalStatus Esp32AnalogInputHal::initialize() {
  for (auto& [id, channel] : channels_) {
    const auto validation = validate_scaling(
        channel.scaling.raw_min,
        channel.scaling.raw_max,
        channel.scaling.engineering_min,
        channel.scaling.engineering_max);
    if (!validation.ok()) {
      return HalStatus::error(validation.code, "invalid analog scaling for " + id + ": " + validation.message);
    }

    if (!channel.bound) {
      channel.validity = InputValidity::invalid;
      continue;
    }
    if (!is_adc1_capable_esp32_gpio(channel.gpio) || channel.adc_channel < 0) {
      return HalStatus::error(
          HalErrorCode::invalid_range,
          "analog input uses unsupported ADC GPIO" + std::to_string(channel.gpio));
    }

    adc1_config_width(ADC_WIDTH_BIT_12);
    adc1_config_channel_atten(static_cast<adc1_channel_t>(channel.adc_channel), ADC_ATTEN_DB_12);
  }

  initialized_ = true;
  return HalStatus::success();
}

HalResult<AnalogRawValue> Esp32AnalogInputHal::read_raw(const std::string& input_id) const {
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
    return {HalStatus::success(), AnalogRawValue{0}};
  }

  return {
      HalStatus::success(),
      static_cast<AnalogRawValue>(adc1_get_raw(static_cast<adc1_channel_t>(channel->adc_channel)))};
}

HalResult<AnalogEngineeringValue> Esp32AnalogInputHal::read_scaled(const std::string& input_id) const {
  const auto raw = read_raw(input_id);
  if (!raw.ok()) {
    return {raw.status, std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  return {
      HalStatus::success(),
      scale_value(*raw.value, channel->scaling, channel->clamp_enabled)};
}

HalStatus Esp32AnalogInputHal::configure_scaling(
    const std::string& input_id,
    const AnalogRawValue raw_min,
    const AnalogRawValue raw_max,
    const AnalogEngineeringValue engineering_min,
    const AnalogEngineeringValue engineering_max) {
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

HalStatus Esp32AnalogInputHal::configure_clamp(const std::string& input_id, const bool enabled) {
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

HalResult<InputValidity> Esp32AnalogInputHal::get_validity(const std::string& input_id) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto* channel = find_channel(input_id);
  if (channel == nullptr) {
    return {unknown_id_status(input_id), std::nullopt};
  }

  return {HalStatus::success(), channel->validity};
}

HalStatus Esp32AnalogInputHal::validate_scaling(
    const AnalogRawValue raw_min,
    const AnalogRawValue raw_max,
    const AnalogEngineeringValue engineering_min,
    const AnalogEngineeringValue engineering_max) {
  if (raw_max <= raw_min) {
    return HalStatus::error(HalErrorCode::invalid_range, "raw_max must be greater than raw_min");
  }
  if (engineering_max == engineering_min) {
    return HalStatus::error(HalErrorCode::invalid_range, "engineering_max must differ from engineering_min");
  }
  return HalStatus::success();
}

AnalogEngineeringValue Esp32AnalogInputHal::scale_value(
    AnalogRawValue raw_value,
    const AnalogScaling& scaling,
    const bool clamp_enabled) {
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

Esp32AnalogInputHal::ChannelState* Esp32AnalogInputHal::find_channel(const std::string& input_id) {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

const Esp32AnalogInputHal::ChannelState* Esp32AnalogInputHal::find_channel(const std::string& input_id) const {
  const auto it = channels_.find(input_id);
  return it == channels_.end() ? nullptr : &it->second;
}

}  // namespace controller::hal
