#pragma once

#include <array>
#include <cstdint>
#include <cstddef>
#include <sstream>
#include <string>
#include <vector>

namespace controller::hal {

constexpr int kUnboundPin = -1;

struct ReservedBoardPin {
  int gpio{kUnboundPin};
  const char* group{""};
  const char* purpose{""};
};

struct BringupTestPins {
  int test_relay_pin{kUnboundPin};
  int test_di_pin{kUnboundPin};
  int test_pwm_pin{kUnboundPin};
  int test_pulse_pin{kUnboundPin};
  int test_ai_pin{kUnboundPin};
};

struct StatusLedPin {
  int gpio{kUnboundPin};
  bool active_high{true};
};

struct OledBoardConfig {
  bool present{false};
  int sda_pin{kUnboundPin};
  int scl_pin{kUnboundPin};
  int reset_pin{kUnboundPin};
  std::uint8_t i2c_address{0x3CU};
  std::uint32_t i2c_frequency_hz{400000U};
  std::size_t line_count{8U};
  std::size_t chars_per_line{21U};
  bool rotate_180{false};
};

struct BoardProfileValidationIssue {
  std::string field;
  std::string message;
};

inline bool is_unbound_pin(const int gpio) {
  return gpio < 0;
}

inline bool is_valid_esp32_gpio(const int gpio) {
  return gpio >= 0 && gpio <= 39;
}

inline bool is_output_capable_esp32_gpio(const int gpio) {
  return is_valid_esp32_gpio(gpio) && gpio < 34;
}

inline bool is_input_only_esp32_gpio(const int gpio) {
  return gpio >= 34 && gpio <= 39;
}

inline bool is_boot_sensitive_esp32_gpio(const int gpio) {
  switch (gpio) {
    case 0:
    case 2:
    case 4:
    case 5:
    case 12:
    case 15:
      return true;
    default:
      return false;
  }
}

inline bool is_adc1_capable_esp32_gpio(const int gpio) {
  switch (gpio) {
    case 32:
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
      return true;
    default:
      return false;
  }
}

inline std::string gpio_label(const int gpio) {
  return is_unbound_pin(gpio) ? std::string{"unbound"} : "GPIO" + std::to_string(gpio);
}

template <std::size_t N>
inline bool pin_is_reserved(const std::array<ReservedBoardPin, N>& reserved_pins, const int gpio) {
  for (const auto& pin : reserved_pins) {
    if (pin.gpio == gpio) {
      return true;
    }
  }
  return false;
}

template <std::size_t N>
inline std::string reserved_pin_reason(const std::array<ReservedBoardPin, N>& reserved_pins, const int gpio) {
  for (const auto& pin : reserved_pins) {
    if (pin.gpio == gpio) {
      std::ostringstream stream;
      stream << "GPIO" << gpio << " is reserved for " << pin.group << " (" << pin.purpose << ")";
      return stream.str();
    }
  }
  return {};
}

}  // namespace controller::hal
