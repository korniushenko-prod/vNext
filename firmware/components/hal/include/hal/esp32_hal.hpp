#pragma once

#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <vector>

#include "hal/analog_input_hal.hpp"
#include "hal/board_profile.hpp"
#include "hal/digital_input_hal.hpp"
#include "hal/display_hal.hpp"
#include "hal/pulse_input_hal.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"

namespace controller::hal {

struct Esp32RelayChannelConfig {
  std::string id;
  int gpio{kUnboundPin};
  RelayState safe_state{RelayState::off};
  RelayState startup_state{RelayState::off};
  bool active_high{true};
};

struct Esp32DigitalInputChannelConfig {
  std::string id;
  int gpio{kUnboundPin};
  InputPolarity polarity{InputPolarity::active_high};
  std::uint32_t debounce_ms{0U};
  bool pullup_enabled{false};
  bool pulldown_enabled{false};
  bool initial_raw_state{false};
  InputValidity validity{InputValidity::valid};
};

struct Esp32AnalogInputChannelConfig {
  std::string id;
  int gpio{kUnboundPin};
  AnalogScaling scaling{};
  bool clamp_enabled{false};
  InputValidity validity{InputValidity::valid};
};

struct Esp32PwmOutputChannelConfig {
  std::string id;
  int gpio{kUnboundPin};
  int ledc_channel{0};
  int frequency_hz{1000};
  int resolution_bits{10};
  PwmLimits limits{};
  PwmDutyPercent initial_duty{0.0};
  bool initial_enabled{false};
  bool active_high{true};
  bool faulted{false};
};

struct Esp32PulseInputChannelConfig {
  std::string id;
  int gpio{kUnboundPin};
  bool pullup_enabled{false};
  bool pulldown_enabled{false};
  bool resettable{true};
  InputValidity validity{InputValidity::valid};
};

struct Esp32DisplayConfig {
  DisplayConfig layout{8U, 21U, true};
  int sda_pin{kUnboundPin};
  int scl_pin{kUnboundPin};
  int reset_pin{kUnboundPin};
  std::uint8_t i2c_address{0x3CU};
  std::uint32_t i2c_frequency_hz{400000U};
  bool rotate_180{false};
};

class Esp32RelayHal final : public RelayHal {
 public:
  explicit Esp32RelayHal(std::vector<Esp32RelayChannelConfig> channels = {});

  HalStatus initialize() override;
  HalStatus set_state(const std::string& relay_id, RelayState state) override;
  HalResult<RelayState> get_state(const std::string& relay_id) const override;
  HalStatus apply_safe_state(const std::string& relay_id) override;
  HalStatus apply_all_safe_states() override;
  HalResult<RelayState> get_safe_state(const std::string& relay_id) const override;

 private:
  struct ChannelState {
    int gpio{kUnboundPin};
    RelayState state{RelayState::off};
    RelayState safe_state{RelayState::off};
    RelayState startup_state{RelayState::off};
    bool active_high{true};
    bool bound{false};
  };

  ChannelState* find_channel(const std::string& relay_id);
  const ChannelState* find_channel(const std::string& relay_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

class Esp32DigitalInputHal final : public DigitalInputHal {
 public:
  explicit Esp32DigitalInputHal(std::vector<Esp32DigitalInputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalResult<bool> read_raw(const std::string& input_id) const override;
  HalResult<bool> read_debounced(const std::string& input_id, MonotonicTimeMs now_ms) override;
  HalStatus configure_debounce(const std::string& input_id, std::uint32_t debounce_ms) override;
  HalStatus configure_polarity(const std::string& input_id, InputPolarity polarity) override;
  HalResult<InputValidity> get_validity(const std::string& input_id) const override;

 private:
  struct ChannelState {
    int gpio{kUnboundPin};
    InputPolarity polarity{InputPolarity::active_high};
    std::uint32_t debounce_ms{0U};
    InputValidity validity{InputValidity::valid};
    bool raw_state{false};
    bool pending_state{false};
    bool debounced_state{false};
    MonotonicTimeMs last_change_ms{0U};
    bool pullup_enabled{false};
    bool pulldown_enabled{false};
    bool bound{false};
  };

  static bool apply_polarity(bool raw_state, InputPolarity polarity);
  ChannelState* find_channel(const std::string& input_id);
  const ChannelState* find_channel(const std::string& input_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

class Esp32AnalogInputHal final : public AnalogInputHal {
 public:
  explicit Esp32AnalogInputHal(std::vector<Esp32AnalogInputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalResult<AnalogRawValue> read_raw(const std::string& input_id) const override;
  HalResult<AnalogEngineeringValue> read_scaled(const std::string& input_id) const override;
  HalStatus configure_scaling(
      const std::string& input_id,
      AnalogRawValue raw_min,
      AnalogRawValue raw_max,
      AnalogEngineeringValue engineering_min,
      AnalogEngineeringValue engineering_max) override;
  HalStatus configure_clamp(const std::string& input_id, bool enabled) override;
  HalResult<InputValidity> get_validity(const std::string& input_id) const override;

 private:
  struct ChannelState {
    int gpio{kUnboundPin};
    int adc_channel{-1};
    AnalogScaling scaling{};
    bool clamp_enabled{false};
    InputValidity validity{InputValidity::valid};
    bool bound{false};
  };

  static HalStatus validate_scaling(
      AnalogRawValue raw_min,
      AnalogRawValue raw_max,
      AnalogEngineeringValue engineering_min,
      AnalogEngineeringValue engineering_max);
  static AnalogEngineeringValue scale_value(
      AnalogRawValue raw_value,
      const AnalogScaling& scaling,
      bool clamp_enabled);
  ChannelState* find_channel(const std::string& input_id);
  const ChannelState* find_channel(const std::string& input_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

class Esp32PwmHal final : public PwmHal {
 public:
  explicit Esp32PwmHal(std::vector<Esp32PwmOutputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalStatus set_duty_percent(const std::string& output_id, PwmDutyPercent duty_percent) override;
  HalResult<PwmDutyPercent> get_duty_percent(const std::string& output_id) const override;
  HalStatus set_enabled(const std::string& output_id, bool enabled) override;
  HalResult<bool> get_enabled(const std::string& output_id) const override;
  HalStatus configure_limits(
      const std::string& output_id,
      PwmDutyPercent duty_min,
      PwmDutyPercent duty_max,
      PwmDutyPercent duty_safe) override;
  HalStatus apply_safe_state(const std::string& output_id) override;

 private:
  struct ChannelState {
    int gpio{kUnboundPin};
    int ledc_channel{0};
    int frequency_hz{1000};
    int resolution_bits{10};
    PwmLimits limits{};
    PwmDutyPercent duty_percent{0.0};
    bool enabled{false};
    bool active_high{true};
    bool faulted{false};
    bool bound{false};
  };

  static HalStatus validate_limits(
      PwmDutyPercent duty_min,
      PwmDutyPercent duty_max,
      PwmDutyPercent duty_safe);
  static PwmDutyPercent clamp_duty(PwmDutyPercent duty, const PwmLimits& limits);
  HalStatus apply_hardware_state(ChannelState& channel);
  ChannelState* find_channel(const std::string& output_id);
  const ChannelState* find_channel(const std::string& output_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

class Esp32PulseInputHal final : public PulseInputHal {
 public:
  explicit Esp32PulseInputHal(std::vector<Esp32PulseInputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalResult<PulseCount> get_count(const std::string& input_id) const override;
  HalStatus reset_count(const std::string& input_id) override;
  HalResult<double> get_frequency_hz(const std::string& input_id) const override;
  HalResult<InputValidity> get_validity(const std::string& input_id) const override;

 private:
  struct ChannelState {
    int gpio{kUnboundPin};
    bool pullup_enabled{false};
    bool pulldown_enabled{false};
    bool resettable{true};
    InputValidity validity{InputValidity::valid};
    volatile std::uint32_t count{0U};
    mutable MonotonicTimeMs last_frequency_sample_ms{0U};
    mutable std::uint32_t last_frequency_sample_count{0U};
    bool bound{false};
  };

  static void handle_gpio_isr(void* arg);
  ChannelState* find_channel(const std::string& input_id);
  const ChannelState* find_channel(const std::string& input_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
  bool isr_service_installed_{false};
};

class Esp32DisplayHal final : public DisplayHal {
 public:
  explicit Esp32DisplayHal(Esp32DisplayConfig config = {});

  HalStatus initialize() override;
  HalStatus clear() override;
  HalStatus write_line(std::size_t index, const std::string& text) override;
  HalStatus set_backlight(bool enabled) override;
  std::size_t line_count() const override;
  std::optional<std::size_t> line_width() const override;

 private:
  HalStatus ensure_valid_index(std::size_t index) const;

  Esp32DisplayConfig config_;
  std::vector<std::string> lines_;
  bool backlight_enabled_{false};
  bool initialized_{false};
};

}  // namespace controller::hal
