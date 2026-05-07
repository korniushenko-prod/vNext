#pragma once

#include <array>
#include <sstream>
#include <string>
#include <vector>

#include "hal/board_profile.hpp"
#include "hal/esp32_hal.hpp"

namespace controller::hal {

class LilygoT3V161BoardProfile {
 public:
  explicit LilygoT3V161BoardProfile(BringupTestPins test_pins = {})
      : test_pins_(test_pins) {}

  static constexpr const char* id() {
    return "lilygo_t3_v1_6_1";
  }

  static constexpr const char* name() {
    return "LILYGO T3 V1.6.1 / LoRa32 V2.1.6";
  }

  static constexpr const char* soc() {
    return "ESP32";
  }

  static constexpr const OledBoardConfig& oled() {
    return oled_config_;
  }

  static constexpr const StatusLedPin& status_led() {
    return status_led_;
  }

  static constexpr const std::array<ReservedBoardPin, 16U>& reserved_pins() {
    return reserved_pins_;
  }

  const BringupTestPins& test_pins() const {
    return test_pins_;
  }

  bool is_reserved_pin(const int gpio) const {
    return pin_is_reserved(reserved_pins_, gpio);
  }

  std::string reserved_reason(const int gpio) const {
    return reserved_pin_reason(reserved_pins_, gpio);
  }

  std::vector<BoardProfileValidationIssue> validate() const {
    std::vector<BoardProfileValidationIssue> issues;
    validate_general_pin("test_relay_pin", test_pins_.test_relay_pin, true, false, issues);
    validate_general_pin("test_di_pin", test_pins_.test_di_pin, false, false, issues);
    validate_general_pin("test_pwm_pin", test_pins_.test_pwm_pin, true, false, issues);
    validate_general_pin("test_pulse_pin", test_pins_.test_pulse_pin, false, false, issues);
    validate_general_pin("test_ai_pin", test_pins_.test_ai_pin, false, true, issues);

    if (!is_unbound_pin(test_pins_.test_relay_pin) && test_pins_.test_relay_pin == test_pins_.test_pwm_pin) {
      issues.push_back({"test_pwm_pin", "test_pwm_pin must not reuse test_relay_pin."});
    }
    if (!is_unbound_pin(test_pins_.test_di_pin) && test_pins_.test_di_pin == test_pins_.test_pulse_pin) {
      issues.push_back({"test_pulse_pin", "test_pulse_pin must not reuse test_di_pin."});
    }

    return issues;
  }

  std::vector<std::string> test_pin_summary() const {
    return {
        summarize_pin("test_relay_pin", test_pins_.test_relay_pin),
        summarize_pin("test_di_pin", test_pins_.test_di_pin),
        summarize_pin("test_pwm_pin", test_pins_.test_pwm_pin),
        summarize_pin("test_pulse_pin", test_pins_.test_pulse_pin),
        summarize_pin("test_ai_pin", test_pins_.test_ai_pin),
    };
  }

  std::vector<Esp32RelayChannelConfig> make_relay_channels() const {
    return {{
        "bringup.relay.test",
        test_pins_.test_relay_pin,
        RelayState::off,
        RelayState::off,
        true,
    }};
  }

  std::vector<Esp32DigitalInputChannelConfig> make_digital_input_channels() const {
    return {{
        "bringup.di.test",
        test_pins_.test_di_pin,
        InputPolarity::active_high,
        20U,
        false,
        false,
        false,
        is_unbound_pin(test_pins_.test_di_pin) ? InputValidity::invalid : InputValidity::valid,
    }};
  }

  std::vector<Esp32AnalogInputChannelConfig> make_analog_input_channels() const {
    return {{
        "bringup.ai.test",
        test_pins_.test_ai_pin,
        AnalogScaling{0, 4095, 0.0, 3.3},
        true,
        is_unbound_pin(test_pins_.test_ai_pin) ? InputValidity::invalid : InputValidity::valid,
    }};
  }

  std::vector<Esp32PwmOutputChannelConfig> make_pwm_channels() const {
    return {{
        "bringup.pwm.test",
        test_pins_.test_pwm_pin,
        0,
        1000,
        10,
        PwmLimits{0.0, 100.0, 0.0},
        0.0,
        false,
        true,
        false,
    }};
  }

  std::vector<Esp32PulseInputChannelConfig> make_pulse_input_channels() const {
    return {{
        "bringup.pulse.test",
        test_pins_.test_pulse_pin,
        false,
        false,
        true,
        is_unbound_pin(test_pins_.test_pulse_pin) ? InputValidity::invalid : InputValidity::valid,
    }};
  }

  Esp32DisplayConfig make_display_config() const {
    return {
        DisplayConfig{oled_config_.line_count, oled_config_.chars_per_line, true},
        oled_config_.sda_pin,
        oled_config_.scl_pin,
        oled_config_.reset_pin,
        oled_config_.i2c_address,
        oled_config_.i2c_frequency_hz,
        oled_config_.rotate_180,
    };
  }

 private:
  static inline std::string summarize_pin(const std::string& name, const int gpio) {
    return name + "=" + gpio_label(gpio);
  }

  void validate_general_pin(
      const std::string& field,
      const int gpio,
      const bool must_support_output,
      const bool must_support_adc1,
      std::vector<BoardProfileValidationIssue>& issues) const {
    if (is_unbound_pin(gpio)) {
      return;
    }
    if (!is_valid_esp32_gpio(gpio)) {
      issues.push_back({field, field + " must be an ESP32 GPIO in the 0..39 range or unbound."});
      return;
    }
    if (is_reserved_pin(gpio)) {
      issues.push_back({field, reserved_reason(gpio)});
    }
    if (is_boot_sensitive_esp32_gpio(gpio)) {
      issues.push_back({field, field + " must not use a boot-sensitive ESP32 strap pin."});
    }
    if (must_support_output && !is_output_capable_esp32_gpio(gpio)) {
      issues.push_back({field, field + " must use an output-capable GPIO."});
    }
    if (must_support_adc1 && !is_adc1_capable_esp32_gpio(gpio)) {
      issues.push_back({field, field + " must use an ADC1-capable GPIO."});
    }
  }

  BringupTestPins test_pins_;

  static constexpr OledBoardConfig oled_config_{
      true,
      21,
      22,
      -1,
      0x3CU,
      400000U,
      8U,
      21U,
      false,
  };

  static constexpr StatusLedPin status_led_{25, true};

  static constexpr std::array<ReservedBoardPin, 16U> reserved_pins_{{
      {21, "OLED", "SDA"},
      {22, "OLED", "SCL"},
      {16, "OLED", "RESET"},
      {13, "SD", "CS"},
      {15, "SD", "MOSI"},
      {2, "SD", "MISO"},
      {14, "SD", "SCK"},
      {5, "LoRa", "SCK"},
      {19, "LoRa", "MISO"},
      {27, "LoRa", "MOSI"},
      {23, "LoRa", "RESET"},
      {33, "LoRa", "DIO1"},
      {32, "LoRa", "DIO2"},
      {18, "LoRa", "CS"},
      {35, "Battery", "Battery ADC"},
      {25, "Status LED", "On-board LED"},
  }};
};

inline LilygoT3V161BoardProfile make_lilygo_t3_v1_6_1_profile(const BringupTestPins& test_pins = {}) {
  return LilygoT3V161BoardProfile(test_pins);
}

}  // namespace controller::hal
