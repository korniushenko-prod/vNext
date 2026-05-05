#include "storage/storage_crc.hpp"

#include <cstring>
#include <iomanip>
#include <sstream>
#include <type_traits>
#include <utility>

namespace controller::storage {
namespace {

constexpr std::uint32_t kSnapshotMagic = 0x53434647U;
constexpr std::uint32_t kSnapshotVersion = 1U;
constexpr const char* kSnapshotIssueCode = "STORAGE_INTERNAL_SNAPSHOT_ERROR";

struct BinaryWriter {
  ByteBuffer bytes;

  void write_u8(std::uint8_t value) {
    bytes.push_back(value);
  }

  void write_bool(bool value) {
    write_u8(value ? 1U : 0U);
  }

  void write_u32(std::uint32_t value) {
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      bytes.push_back(static_cast<std::uint8_t>((value >> (index * 8U)) & 0xffU));
    }
  }

  void write_u64(std::uint64_t value) {
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      bytes.push_back(static_cast<std::uint8_t>((value >> (index * 8U)) & 0xffU));
    }
  }

  void write_i32(std::int32_t value) {
    write_u32(static_cast<std::uint32_t>(value));
  }

  void write_double(double value) {
    static_assert(sizeof(double) == sizeof(std::uint64_t), "double must be 64-bit for storage snapshot");
    std::uint64_t bits = 0U;
    std::memcpy(&bits, &value, sizeof(bits));
    write_u64(bits);
  }

  void write_string(const std::string& value) {
    write_u32(static_cast<std::uint32_t>(value.size()));
    bytes.insert(bytes.end(), value.begin(), value.end());
  }
};

struct BinaryReader {
  const ByteBuffer& bytes;
  std::size_t offset{0U};
  std::string error;

  bool read_u8(std::uint8_t& value) {
    if (!require(1U, "Unexpected end of snapshot while reading byte.")) {
      return false;
    }
    value = bytes[offset++];
    return true;
  }

  bool read_bool(bool& value) {
    std::uint8_t raw = 0U;
    if (!read_u8(raw)) {
      return false;
    }
    if (raw > 1U) {
      error = "Invalid boolean value in snapshot.";
      return false;
    }
    value = raw == 1U;
    return true;
  }

  bool read_u32(std::uint32_t& value) {
    if (!require(sizeof(value), "Unexpected end of snapshot while reading uint32.")) {
      return false;
    }
    value = 0U;
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      value |= static_cast<std::uint32_t>(bytes[offset++]) << (index * 8U);
    }
    return true;
  }

  bool read_u64(std::uint64_t& value) {
    if (!require(sizeof(value), "Unexpected end of snapshot while reading uint64.")) {
      return false;
    }
    value = 0U;
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      value |= static_cast<std::uint64_t>(bytes[offset++]) << (index * 8U);
    }
    return true;
  }

  bool read_i32(std::int32_t& value) {
    std::uint32_t raw = 0U;
    if (!read_u32(raw)) {
      return false;
    }
    value = static_cast<std::int32_t>(raw);
    return true;
  }

  bool read_int(int& value) {
    std::int32_t raw = 0;
    if (!read_i32(raw)) {
      return false;
    }
    value = static_cast<int>(raw);
    return true;
  }

  bool read_double(double& value) {
    static_assert(sizeof(double) == sizeof(std::uint64_t), "double must be 64-bit for storage snapshot");
    std::uint64_t bits = 0U;
    if (!read_u64(bits)) {
      return false;
    }
    std::memcpy(&value, &bits, sizeof(value));
    return true;
  }

  bool read_string(std::string& value) {
    std::uint32_t length = 0U;
    if (!read_u32(length)) {
      return false;
    }
    if (!require(length, "Unexpected end of snapshot while reading string.")) {
      return false;
    }
    value.assign(reinterpret_cast<const char*>(bytes.data() + offset), length);
    offset += length;
    return true;
  }

  bool require(std::size_t size, const char* message) {
    if (offset + size > bytes.size()) {
      error = message;
      return false;
    }
    return true;
  }
};

template <typename EnumType>
void write_enum(BinaryWriter& writer, EnumType value) {
  static_assert(std::is_enum<EnumType>::value, "EnumType must be an enum.");
  writer.write_i32(static_cast<std::int32_t>(value));
}

template <typename EnumType>
bool read_enum(BinaryReader& reader, EnumType& value) {
  static_assert(std::is_enum<EnumType>::value, "EnumType must be an enum.");
  std::int32_t raw = 0;
  if (!reader.read_i32(raw)) {
    return false;
  }
  value = static_cast<EnumType>(raw);
  return true;
}

template <typename T, typename WriteFn>
void write_optional(BinaryWriter& writer, const std::optional<T>& value, WriteFn&& write_fn) {
  writer.write_bool(value.has_value());
  if (value.has_value()) {
    write_fn(*value);
  }
}

template <typename T, typename ReadFn>
bool read_optional(BinaryReader& reader, std::optional<T>& value, ReadFn&& read_fn) {
  bool present = false;
  if (!reader.read_bool(present)) {
    return false;
  }
  if (!present) {
    value.reset();
    return true;
  }

  T decoded{};
  if (!read_fn(decoded)) {
    return false;
  }
  value = std::move(decoded);
  return true;
}

template <typename T, typename WriteFn>
void write_vector(BinaryWriter& writer, const std::vector<T>& values, WriteFn&& write_fn) {
  writer.write_u32(static_cast<std::uint32_t>(values.size()));
  for (const auto& value : values) {
    write_fn(value);
  }
}

template <typename T, typename ReadFn>
bool read_vector(BinaryReader& reader, std::vector<T>& values, ReadFn&& read_fn) {
  std::uint32_t size = 0U;
  if (!reader.read_u32(size)) {
    return false;
  }

  values.clear();
  values.reserve(size);
  for (std::uint32_t index = 0U; index < size; ++index) {
    T decoded{};
    if (!read_fn(decoded)) {
      return false;
    }
    values.push_back(std::move(decoded));
  }
  return true;
}

void write_identity(BinaryWriter& writer, const config::ConfigIdentity& identity) {
  writer.write_string(identity.id);
  writer.write_string(identity.name);
  writer.write_bool(identity.enabled);
}

template <typename T>
bool read_identity(BinaryReader& reader, T& identity) {
  return reader.read_string(identity.id) &&
         reader.read_string(identity.name) &&
         reader.read_bool(identity.enabled);
}

void write_string_map(BinaryWriter& writer, const std::map<std::string, std::string>& values) {
  writer.write_u32(static_cast<std::uint32_t>(values.size()));
  for (const auto& [key, value] : values) {
    writer.write_string(key);
    writer.write_string(value);
  }
}

bool read_string_map(BinaryReader& reader, std::map<std::string, std::string>& values) {
  std::uint32_t size = 0U;
  if (!reader.read_u32(size)) {
    return false;
  }

  values.clear();
  for (std::uint32_t index = 0U; index < size; ++index) {
    std::string key;
    std::string value;
    if (!reader.read_string(key) || !reader.read_string(value)) {
      return false;
    }
    values.emplace(std::move(key), std::move(value));
  }
  return true;
}

void write_digital_input_settings(BinaryWriter& writer, const config::DigitalInputSettings& value) {
  writer.write_bool(value.inverted);
  writer.write_bool(value.pullup_enabled);
}

bool read_digital_input_settings(BinaryReader& reader, config::DigitalInputSettings& value) {
  return reader.read_bool(value.inverted) &&
         reader.read_bool(value.pullup_enabled);
}

void write_analog_input_settings(BinaryWriter& writer, const config::AnalogInputSettings& value) {
  writer.write_double(value.raw_min);
  writer.write_double(value.raw_max);
  writer.write_double(value.engineering_min);
  writer.write_double(value.engineering_max);
  writer.write_string(value.unit);
}

bool read_analog_input_settings(BinaryReader& reader, config::AnalogInputSettings& value) {
  return reader.read_double(value.raw_min) &&
         reader.read_double(value.raw_max) &&
         reader.read_double(value.engineering_min) &&
         reader.read_double(value.engineering_max) &&
         reader.read_string(value.unit);
}

void write_input_pulse_settings(BinaryWriter& writer, const config::InputPulseSettings& value) {
  writer.write_u32(value.debounce_us);
  writer.write_double(value.max_frequency_hz);
  writer.write_bool(value.count_rising_edge);
}

bool read_input_pulse_settings(BinaryReader& reader, config::InputPulseSettings& value) {
  return reader.read_u32(value.debounce_us) &&
         reader.read_double(value.max_frequency_hz) &&
         reader.read_bool(value.count_rising_edge);
}

void write_device_info_config(BinaryWriter& writer, const config::DeviceInfoConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.description);
}

bool read_device_info_config(BinaryReader& reader, config::DeviceInfoConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.description);
}

void write_board_pin_binding_config(BinaryWriter& writer, const config::BoardPinBindingConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.target_id);
  write_optional<int>(writer, value.gpio, [&](int gpio) { writer.write_i32(gpio); });
}

bool read_board_pin_binding_config(BinaryReader& reader, config::BoardPinBindingConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.target_id) &&
         read_optional<int>(reader, value.gpio, [&](int& gpio) { return reader.read_int(gpio); });
}

void write_board_stepper_pin_config(BinaryWriter& writer, const config::BoardStepperPinConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.target_id);
  write_optional<int>(writer, value.step_gpio, [&](int gpio) { writer.write_i32(gpio); });
  write_optional<int>(writer, value.dir_gpio, [&](int gpio) { writer.write_i32(gpio); });
  write_optional<int>(writer, value.enable_gpio, [&](int gpio) { writer.write_i32(gpio); });
}

bool read_board_stepper_pin_config(BinaryReader& reader, config::BoardStepperPinConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.target_id) &&
         read_optional<int>(reader, value.step_gpio, [&](int& gpio) { return reader.read_int(gpio); }) &&
         read_optional<int>(reader, value.dir_gpio, [&](int& gpio) { return reader.read_int(gpio); }) &&
         read_optional<int>(reader, value.enable_gpio, [&](int& gpio) { return reader.read_int(gpio); });
}

void write_board_display_pin_config(BinaryWriter& writer, const config::BoardDisplayPinConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.bus_name);
  write_optional<int>(writer, value.sda_gpio, [&](int gpio) { writer.write_i32(gpio); });
  write_optional<int>(writer, value.scl_gpio, [&](int gpio) { writer.write_i32(gpio); });
}

bool read_board_display_pin_config(BinaryReader& reader, config::BoardDisplayPinConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.bus_name) &&
         read_optional<int>(reader, value.sda_gpio, [&](int& gpio) { return reader.read_int(gpio); }) &&
         read_optional<int>(reader, value.scl_gpio, [&](int& gpio) { return reader.read_int(gpio); });
}

void write_board_config(BinaryWriter& writer, const config::BoardConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.module_name);
  write_vector(writer, value.input_pins, [&](const auto& item) { write_board_pin_binding_config(writer, item); });
  write_vector(writer, value.relay_pins, [&](const auto& item) { write_board_pin_binding_config(writer, item); });
  write_vector(writer, value.pwm_pins, [&](const auto& item) { write_board_pin_binding_config(writer, item); });
  write_vector(writer, value.pulse_input_pins, [&](const auto& item) { write_board_pin_binding_config(writer, item); });
  write_vector(writer, value.stepper_pins, [&](const auto& item) { write_board_stepper_pin_config(writer, item); });
  write_vector(writer, value.motor_pins, [&](const auto& item) { write_board_pin_binding_config(writer, item); });
  write_vector(writer, value.display_pins, [&](const auto& item) { write_board_display_pin_config(writer, item); });
}

bool read_board_config(BinaryReader& reader, config::BoardConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.module_name) &&
         read_vector(reader, value.input_pins, [&](auto& item) { return read_board_pin_binding_config(reader, item); }) &&
         read_vector(reader, value.relay_pins, [&](auto& item) { return read_board_pin_binding_config(reader, item); }) &&
         read_vector(reader, value.pwm_pins, [&](auto& item) { return read_board_pin_binding_config(reader, item); }) &&
         read_vector(reader, value.pulse_input_pins, [&](auto& item) { return read_board_pin_binding_config(reader, item); }) &&
         read_vector(reader, value.stepper_pins, [&](auto& item) { return read_board_stepper_pin_config(reader, item); }) &&
         read_vector(reader, value.motor_pins, [&](auto& item) { return read_board_pin_binding_config(reader, item); }) &&
         read_vector(reader, value.display_pins, [&](auto& item) { return read_board_display_pin_config(reader, item); });
}

void write_input_config(BinaryWriter& writer, const config::InputConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.kind);
  writer.write_string(value.signal_path);
  write_optional<config::DigitalInputSettings>(writer, value.di, [&](const auto& item) { write_digital_input_settings(writer, item); });
  write_optional<config::AnalogInputSettings>(writer, value.ai, [&](const auto& item) { write_analog_input_settings(writer, item); });
  write_optional<config::InputPulseSettings>(writer, value.pulse, [&](const auto& item) { write_input_pulse_settings(writer, item); });
}

bool read_input_config(BinaryReader& reader, config::InputConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.kind) &&
         reader.read_string(value.signal_path) &&
         read_optional<config::DigitalInputSettings>(reader, value.di, [&](auto& item) { return read_digital_input_settings(reader, item); }) &&
         read_optional<config::AnalogInputSettings>(reader, value.ai, [&](auto& item) { return read_analog_input_settings(reader, item); }) &&
         read_optional<config::InputPulseSettings>(reader, value.pulse, [&](auto& item) { return read_input_pulse_settings(reader, item); });
}

void write_relay_config(BinaryWriter& writer, const config::RelayConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.role);
  write_enum(writer, value.safe_state);
  write_optional<std::string>(writer, value.interlock_group, [&](const auto& item) { writer.write_string(item); });
}

bool read_relay_config(BinaryReader& reader, config::RelayConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.role) &&
         read_enum(reader, value.safe_state) &&
         read_optional<std::string>(reader, value.interlock_group, [&](auto& item) { return reader.read_string(item); });
}

void write_pwm_output_config(BinaryWriter& writer, const config::PwmOutputConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.role);
  write_enum(writer, value.safe_state);
  writer.write_double(value.output_min);
  writer.write_double(value.output_max);
  write_optional<std::string>(writer, value.interlock_group, [&](const auto& item) { writer.write_string(item); });
}

bool read_pwm_output_config(BinaryReader& reader, config::PwmOutputConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.role) &&
         read_enum(reader, value.safe_state) &&
         reader.read_double(value.output_min) &&
         reader.read_double(value.output_max) &&
         read_optional<std::string>(reader, value.interlock_group, [&](auto& item) { return reader.read_string(item); });
}

void write_pulse_input_config(BinaryWriter& writer, const config::PulseInputConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.source_input_id);
  writer.write_u32(value.debounce_us);
  writer.write_bool(value.count_rising_edge);
  writer.write_double(value.scale);
}

bool read_pulse_input_config(BinaryReader& reader, config::PulseInputConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.source_input_id) &&
         reader.read_u32(value.debounce_us) &&
         reader.read_bool(value.count_rising_edge) &&
         reader.read_double(value.scale);
}

void write_flowmeter_config(BinaryWriter& writer, const config::FlowmeterConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.pulse_input_id);
  writer.write_double(value.k_factor);
  writer.write_u32(value.averaging_window_ms);
  writer.write_bool(value.protected_lifetime_pulse_total);
  writer.write_bool(value.protected_lifetime_volume_total);
  write_optional<double>(writer, value.batch_target_volume, [&](double item) { writer.write_double(item); });
}

bool read_flowmeter_config(BinaryReader& reader, config::FlowmeterConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.pulse_input_id) &&
         reader.read_double(value.k_factor) &&
         reader.read_u32(value.averaging_window_ms) &&
         reader.read_bool(value.protected_lifetime_pulse_total) &&
         reader.read_bool(value.protected_lifetime_volume_total) &&
         read_optional<double>(reader, value.batch_target_volume, [&](double& item) { return reader.read_double(item); });
}

void write_pid_controller_config(BinaryWriter& writer, const config::PidControllerConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.mode);
  writer.write_string(value.pv_source);
  writer.write_string(value.output_target_id);
  writer.write_u32(value.sample_time_ms);
  writer.write_double(value.output_min);
  writer.write_double(value.output_max);
  write_optional<double>(writer, value.integral_min, [&](double item) { writer.write_double(item); });
  write_optional<double>(writer, value.integral_max, [&](double item) { writer.write_double(item); });
  writer.write_double(value.kp);
  writer.write_double(value.ki);
  writer.write_double(value.kd);
}

bool read_pid_controller_config(BinaryReader& reader, config::PidControllerConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.mode) &&
         reader.read_string(value.pv_source) &&
         reader.read_string(value.output_target_id) &&
         reader.read_u32(value.sample_time_ms) &&
         reader.read_double(value.output_min) &&
         reader.read_double(value.output_max) &&
         read_optional<double>(reader, value.integral_min, [&](double& item) { return reader.read_double(item); }) &&
         read_optional<double>(reader, value.integral_max, [&](double& item) { return reader.read_double(item); }) &&
         reader.read_double(value.kp) &&
         reader.read_double(value.ki) &&
         reader.read_double(value.kd);
}

void write_stepper_config(BinaryWriter& writer, const config::StepperConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.role);
  write_enum(writer, value.safe_state);
  write_optional<std::string>(writer, value.interlock_group, [&](const auto& item) { writer.write_string(item); });
  writer.write_double(value.max_speed_steps_per_second);
  writer.write_double(value.max_accel_steps_per_second_sq);
}

bool read_stepper_config(BinaryReader& reader, config::StepperConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.role) &&
         read_enum(reader, value.safe_state) &&
         read_optional<std::string>(reader, value.interlock_group, [&](auto& item) { return reader.read_string(item); }) &&
         reader.read_double(value.max_speed_steps_per_second) &&
         reader.read_double(value.max_accel_steps_per_second_sq);
}

void write_motor_config(BinaryWriter& writer, const config::MotorConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.role);
  write_enum(writer, value.safe_state);
  write_optional<std::string>(writer, value.interlock_group, [&](const auto& item) { writer.write_string(item); });
  writer.write_double(value.output_min);
  writer.write_double(value.output_max);
}

bool read_motor_config(BinaryReader& reader, config::MotorConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.role) &&
         read_enum(reader, value.safe_state) &&
         read_optional<std::string>(reader, value.interlock_group, [&](auto& item) { return reader.read_string(item); }) &&
         reader.read_double(value.output_min) &&
         reader.read_double(value.output_max);
}

void write_timer_config(BinaryWriter& writer, const config::TimerConfig& value) {
  write_identity(writer, value);
  writer.write_u32(value.duration_ms);
  writer.write_bool(value.auto_restart);
}

bool read_timer_config(BinaryReader& reader, config::TimerConfig& value) {
  return read_identity(reader, value) &&
         reader.read_u32(value.duration_ms) &&
         reader.read_bool(value.auto_restart);
}

void write_alarm_config(BinaryWriter& writer, const config::AlarmConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.severity);
  write_vector(writer, value.condition_paths, [&](const auto& item) { writer.write_string(item); });
  write_optional<std::string>(writer, value.latch_timer_id, [&](const auto& item) { writer.write_string(item); });
}

bool read_alarm_config(BinaryReader& reader, config::AlarmConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.severity) &&
         read_vector(reader, value.condition_paths, [&](auto& item) { return reader.read_string(item); }) &&
         read_optional<std::string>(reader, value.latch_timer_id, [&](auto& item) { return reader.read_string(item); });
}

void write_rule_condition_config(BinaryWriter& writer, const config::RuleConditionConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.signal_path);
  writer.write_string(value.operation);
  writer.write_string(value.compare_value);
}

bool read_rule_condition_config(BinaryReader& reader, config::RuleConditionConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.signal_path) &&
         reader.read_string(value.operation) &&
         reader.read_string(value.compare_value);
}

void write_rule_action_config(BinaryWriter& writer, const config::RuleActionConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.target_id);
  writer.write_string(value.command);
  write_optional<double>(writer, value.numeric_value, [&](double item) { writer.write_double(item); });
}

bool read_rule_action_config(BinaryReader& reader, config::RuleActionConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.target_id) &&
         reader.read_string(value.command) &&
         read_optional<double>(reader, value.numeric_value, [&](double& item) { return reader.read_double(item); });
}

void write_rule_config(BinaryWriter& writer, const config::RuleConfig& value) {
  write_identity(writer, value);
  write_vector(writer, value.conditions, [&](const auto& item) { write_rule_condition_config(writer, item); });
  write_vector(writer, value.actions, [&](const auto& item) { write_rule_action_config(writer, item); });
}

bool read_rule_config(BinaryReader& reader, config::RuleConfig& value) {
  return read_identity(reader, value) &&
         read_vector(reader, value.conditions, [&](auto& item) { return read_rule_condition_config(reader, item); }) &&
         read_vector(reader, value.actions, [&](auto& item) { return read_rule_action_config(reader, item); });
}

void write_program_action_config(BinaryWriter& writer, const config::ProgramActionConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.target_actuator_id);
  writer.write_string(value.command);
  write_optional<double>(writer, value.numeric_value, [&](double item) { writer.write_double(item); });
}

bool read_program_action_config(BinaryReader& reader, config::ProgramActionConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.target_actuator_id) &&
         reader.read_string(value.command) &&
         read_optional<double>(reader, value.numeric_value, [&](double& item) { return reader.read_double(item); });
}

void write_program_transition_config(BinaryWriter& writer, const config::ProgramTransitionConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.to);
  writer.write_string(value.condition_path);
}

bool read_program_transition_config(BinaryReader& reader, config::ProgramTransitionConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.to) &&
         reader.read_string(value.condition_path);
}

void write_program_state_config(BinaryWriter& writer, const config::ProgramStateConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.type);
  writer.write_bool(value.non_skippable);
  write_optional<std::uint32_t>(writer, value.min_time_ms, [&](std::uint32_t item) { writer.write_u32(item); });
  write_optional<std::uint32_t>(writer, value.max_time_ms, [&](std::uint32_t item) { writer.write_u32(item); });
  write_optional<std::string>(writer, value.on_timeout, [&](const auto& item) { writer.write_string(item); });
  write_optional<std::string>(writer, value.on_fault, [&](const auto& item) { writer.write_string(item); });
  write_vector(writer, value.entry_actions, [&](const auto& item) { write_program_action_config(writer, item); });
  write_vector(writer, value.active_actions, [&](const auto& item) { write_program_action_config(writer, item); });
  write_vector(writer, value.exit_actions, [&](const auto& item) { write_program_action_config(writer, item); });
  write_vector(writer, value.transitions, [&](const auto& item) { write_program_transition_config(writer, item); });
}

bool read_program_state_config(BinaryReader& reader, config::ProgramStateConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.type) &&
         reader.read_bool(value.non_skippable) &&
         read_optional<std::uint32_t>(reader, value.min_time_ms, [&](std::uint32_t& item) { return reader.read_u32(item); }) &&
         read_optional<std::uint32_t>(reader, value.max_time_ms, [&](std::uint32_t& item) { return reader.read_u32(item); }) &&
         read_optional<std::string>(reader, value.on_timeout, [&](auto& item) { return reader.read_string(item); }) &&
         read_optional<std::string>(reader, value.on_fault, [&](auto& item) { return reader.read_string(item); }) &&
         read_vector(reader, value.entry_actions, [&](auto& item) { return read_program_action_config(reader, item); }) &&
         read_vector(reader, value.active_actions, [&](auto& item) { return read_program_action_config(reader, item); }) &&
         read_vector(reader, value.exit_actions, [&](auto& item) { return read_program_action_config(reader, item); }) &&
         read_vector(reader, value.transitions, [&](auto& item) { return read_program_transition_config(reader, item); });
}

void write_program_config(BinaryWriter& writer, const config::ProgramConfig& value) {
  write_identity(writer, value);
  write_enum(writer, value.type);
  writer.write_string(value.initial_state);
  writer.write_string(value.normal_stop_state);
  writer.write_string(value.trip_state);
  writer.write_string(value.lockout_state);
  write_vector(writer, value.states, [&](const auto& item) { write_program_state_config(writer, item); });
}

bool read_program_config(BinaryReader& reader, config::ProgramConfig& value) {
  return read_identity(reader, value) &&
         read_enum(reader, value.type) &&
         reader.read_string(value.initial_state) &&
         reader.read_string(value.normal_stop_state) &&
         reader.read_string(value.trip_state) &&
         reader.read_string(value.lockout_state) &&
         read_vector(reader, value.states, [&](auto& item) { return read_program_state_config(reader, item); });
}

void write_template_binding_config(BinaryWriter& writer, const config::TemplateBindingConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.template_type_id);
  write_optional<std::string>(writer, value.object_id, [&](const auto& item) { writer.write_string(item); });
  write_string_map(writer, value.bindings);
}

bool read_template_binding_config(BinaryReader& reader, config::TemplateBindingConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.template_type_id) &&
         read_optional<std::string>(reader, value.object_id, [&](auto& item) { return reader.read_string(item); }) &&
         read_string_map(reader, value.bindings);
}

void write_network_config(BinaryWriter& writer, const config::NetworkConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.hostname);
  writer.write_string(value.ssid);
  writer.write_string(value.password);
  writer.write_bool(value.dhcp_enabled);
}

bool read_network_config(BinaryReader& reader, config::NetworkConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.hostname) &&
         reader.read_string(value.ssid) &&
         reader.read_string(value.password) &&
         reader.read_bool(value.dhcp_enabled);
}

void write_display_config(BinaryWriter& writer, const config::DisplayConfig& value) {
  write_identity(writer, value);
  writer.write_string(value.driver);
  write_optional<int>(writer, value.width, [&](int item) { writer.write_i32(item); });
  write_optional<int>(writer, value.height, [&](int item) { writer.write_i32(item); });
}

bool read_display_config(BinaryReader& reader, config::DisplayConfig& value) {
  return read_identity(reader, value) &&
         reader.read_string(value.driver) &&
         read_optional<int>(reader, value.width, [&](int& item) { return reader.read_int(item); }) &&
         read_optional<int>(reader, value.height, [&](int& item) { return reader.read_int(item); });
}

void write_storage_config(BinaryWriter& writer, const config::StorageConfig& value) {
  write_identity(writer, value);
  writer.write_bool(value.protect_lifetime_totalizers);
  write_optional<std::uint32_t>(writer, value.save_every_pulses, [&](std::uint32_t item) { writer.write_u32(item); });
  write_optional<std::uint32_t>(writer, value.save_every_seconds, [&](std::uint32_t item) { writer.write_u32(item); });
}

bool read_storage_config(BinaryReader& reader, config::StorageConfig& value) {
  return read_identity(reader, value) &&
         reader.read_bool(value.protect_lifetime_totalizers) &&
         read_optional<std::uint32_t>(reader, value.save_every_pulses, [&](std::uint32_t& item) { return reader.read_u32(item); }) &&
         read_optional<std::uint32_t>(reader, value.save_every_seconds, [&](std::uint32_t& item) { return reader.read_u32(item); });
}

void write_device_config(BinaryWriter& writer, const config::DeviceConfig& value) {
  writer.write_u32(kSnapshotMagic);
  writer.write_u32(kSnapshotVersion);
  writer.write_u32(value.schema_version);
  writer.write_u32(value.config_version);
  write_device_info_config(writer, value.device);
  write_board_config(writer, value.board);
  write_vector(writer, value.inputs, [&](const auto& item) { write_input_config(writer, item); });
  write_vector(writer, value.relays, [&](const auto& item) { write_relay_config(writer, item); });
  write_vector(writer, value.pwm_outputs, [&](const auto& item) { write_pwm_output_config(writer, item); });
  write_vector(writer, value.pulse_inputs, [&](const auto& item) { write_pulse_input_config(writer, item); });
  write_vector(writer, value.flowmeters, [&](const auto& item) { write_flowmeter_config(writer, item); });
  write_vector(writer, value.pid_controllers, [&](const auto& item) { write_pid_controller_config(writer, item); });
  write_vector(writer, value.steppers, [&](const auto& item) { write_stepper_config(writer, item); });
  write_vector(writer, value.motors, [&](const auto& item) { write_motor_config(writer, item); });
  write_vector(writer, value.timers, [&](const auto& item) { write_timer_config(writer, item); });
  write_vector(writer, value.alarms, [&](const auto& item) { write_alarm_config(writer, item); });
  write_vector(writer, value.rules, [&](const auto& item) { write_rule_config(writer, item); });
  write_vector(writer, value.programs, [&](const auto& item) { write_program_config(writer, item); });
  write_vector(writer, value.templates, [&](const auto& item) { write_template_binding_config(writer, item); });
  write_network_config(writer, value.network);
  write_display_config(writer, value.display);
  write_storage_config(writer, value.storage);
}

bool read_device_config(BinaryReader& reader, config::DeviceConfig& value) {
  std::uint32_t magic = 0U;
  std::uint32_t version = 0U;
  if (!reader.read_u32(magic) || !reader.read_u32(version)) {
    return false;
  }
  if (magic != kSnapshotMagic) {
    reader.error = "Snapshot magic is invalid.";
    return false;
  }
  if (version != kSnapshotVersion) {
    reader.error = "Snapshot version is unsupported.";
    return false;
  }

  return reader.read_u32(value.schema_version) &&
         reader.read_u32(value.config_version) &&
         read_device_info_config(reader, value.device) &&
         read_board_config(reader, value.board) &&
         read_vector(reader, value.inputs, [&](auto& item) { return read_input_config(reader, item); }) &&
         read_vector(reader, value.relays, [&](auto& item) { return read_relay_config(reader, item); }) &&
         read_vector(reader, value.pwm_outputs, [&](auto& item) { return read_pwm_output_config(reader, item); }) &&
         read_vector(reader, value.pulse_inputs, [&](auto& item) { return read_pulse_input_config(reader, item); }) &&
         read_vector(reader, value.flowmeters, [&](auto& item) { return read_flowmeter_config(reader, item); }) &&
         read_vector(reader, value.pid_controllers, [&](auto& item) { return read_pid_controller_config(reader, item); }) &&
         read_vector(reader, value.steppers, [&](auto& item) { return read_stepper_config(reader, item); }) &&
         read_vector(reader, value.motors, [&](auto& item) { return read_motor_config(reader, item); }) &&
         read_vector(reader, value.timers, [&](auto& item) { return read_timer_config(reader, item); }) &&
         read_vector(reader, value.alarms, [&](auto& item) { return read_alarm_config(reader, item); }) &&
         read_vector(reader, value.rules, [&](auto& item) { return read_rule_config(reader, item); }) &&
         read_vector(reader, value.programs, [&](auto& item) { return read_program_config(reader, item); }) &&
         read_vector(reader, value.templates, [&](auto& item) { return read_template_binding_config(reader, item); }) &&
         read_network_config(reader, value.network) &&
         read_display_config(reader, value.display) &&
         read_storage_config(reader, value.storage);
}

StorageIssue snapshot_issue(const std::string& message) {
  return StorageIssue{"snapshot", kSnapshotIssueCode, StorageSeverity::error, message};
}

}  // namespace

bool StorageOutcome::has_errors() const {
  for (const auto& issue : issues) {
    if (issue.severity == StorageSeverity::error) {
      return true;
    }
  }
  return false;
}

bool StorageOutcome::has_warnings() const {
  for (const auto& issue : issues) {
    if (issue.severity == StorageSeverity::warning) {
      return true;
    }
  }
  return false;
}

void StorageOutcome::add_issue(StorageIssue issue) {
  issues.push_back(std::move(issue));
}

std::uint32_t crc32(const ByteBuffer& bytes) {
  std::uint32_t crc = 0xffffffffU;
  for (const std::uint8_t byte : bytes) {
    crc ^= static_cast<std::uint32_t>(byte);
    for (int bit = 0; bit < 8; ++bit) {
      const bool lsb_set = (crc & 1U) != 0U;
      crc >>= 1U;
      if (lsb_set) {
        crc ^= 0xedb88320U;
      }
    }
  }
  return ~crc;
}

std::string crc32_fingerprint(std::uint32_t value) {
  std::ostringstream stream;
  stream << std::hex << std::nouppercase << std::setfill('0') << std::setw(8) << value;
  return stream.str();
}

ByteBuffer build_config_snapshot(const config::DeviceConfig& config) {
  BinaryWriter writer;
  write_device_config(writer, config);
  return writer.bytes;
}

StorageResult<config::DeviceConfig> parse_config_snapshot(const ByteBuffer& bytes) {
  StorageResult<config::DeviceConfig> result;

  BinaryReader reader{bytes, 0U, {}};
  config::DeviceConfig config;
  if (!read_device_config(reader, config)) {
    result.add_issue(snapshot_issue(reader.error.empty() ? "Failed to decode snapshot." : reader.error));
    return result;
  }

  if (reader.offset != bytes.size()) {
    result.add_issue(snapshot_issue("Snapshot contains trailing bytes and is not deterministic."));
    return result;
  }

  result.value = std::move(config);
  return result;
}

}  // namespace controller::storage
