#include "config/config_validation.hpp"

#include <algorithm>
#include <cctype>
#include <map>
#include <set>
#include <string>
#include <unordered_set>
#include <utility>

namespace controller::config {
namespace {

constexpr const char* kInvalidSchemaVersion = "INVALID_SCHEMA_VERSION";
constexpr const char* kInvalidConfigVersion = "INVALID_CONFIG_VERSION";
constexpr const char* kDuplicateId = "DUPLICATE_ID";
constexpr const char* kEmptyId = "EMPTY_ID";
constexpr const char* kEmptyName = "EMPTY_NAME";
constexpr const char* kUnknownReference = "UNKNOWN_REFERENCE";
constexpr const char* kInvalidRange = "INVALID_RANGE";
constexpr const char* kInvalidProgramStateTarget = "INVALID_PROGRAM_STATE_TARGET";
constexpr const char* kInvalidSafeState = "INVALID_SAFE_STATE";
constexpr const char* kInvalidKFactor = "INVALID_K_FACTOR";
constexpr const char* kInvalidPidTarget = "INVALID_PID_TARGET";
constexpr const char* kInvalidSaveInterval = "INVALID_SAVE_INTERVAL";
constexpr const char* kMissingRequiredField = "MISSING_REQUIRED_FIELD";

void add_error(ValidationResult& result, std::string path, std::string code, std::string message) {
  result.add_issue(ValidationIssue{std::move(path), std::move(code), ValidationSeverity::error, std::move(message)});
}

void add_warning(ValidationResult& result, std::string path, std::string code, std::string message) {
  result.add_issue(ValidationIssue{std::move(path), std::move(code), ValidationSeverity::warning, std::move(message)});
}

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](unsigned char ch) { return !std::isspace(ch); });
}

bool looks_like_signal_path(const std::string& value) {
  if (!has_text(value)) {
    return false;
  }

  if (std::isspace(static_cast<unsigned char>(value.front())) || std::isspace(static_cast<unsigned char>(value.back()))) {
    return false;
  }

  return std::none_of(value.begin(), value.end(), [](unsigned char ch) { return std::isspace(ch); });
}

template <typename T>
void validate_identity(const T& entity, const std::string& path, ValidationResult& result) {
  if (!has_text(entity.id)) {
    add_error(result, path + ".id", kEmptyId, "Identifier must not be empty.");
  }
  if (!has_text(entity.name)) {
    add_error(result, path + ".name", kEmptyName, "Name must not be empty.");
  }
}

template <typename T>
void validate_unique_ids(const std::vector<T>& items, const std::string& path, ValidationResult& result) {
  std::unordered_set<std::string> seen_ids;
  for (std::size_t index = 0; index < items.size(); ++index) {
    const auto& item = items[index];
    const std::string item_path = path + "[" + std::to_string(index) + "]";
    validate_identity(item, item_path, result);

    if (has_text(item.id) && !seen_ids.insert(item.id).second) {
      add_error(result, item_path + ".id", kDuplicateId, "Identifier '" + item.id + "' is duplicated in " + path + ".");
    }
  }
}

template <typename T>
std::unordered_set<std::string> collect_ids(const std::vector<T>& items) {
  std::unordered_set<std::string> ids;
  for (const auto& item : items) {
    if (has_text(item.id)) {
      ids.insert(item.id);
    }
  }
  return ids;
}

std::unordered_set<std::string> collect_actuator_ids(const DeviceConfig& config) {
  std::unordered_set<std::string> ids = collect_ids(config.relays);
  const auto insert_all = [&ids](const auto& collection) {
    for (const auto& item : collection) {
      if (has_text(item.id)) {
        ids.insert(item.id);
      }
    }
  };

  insert_all(config.pwm_outputs);
  insert_all(config.steppers);
  insert_all(config.motors);
  return ids;
}

std::unordered_set<std::string> collect_known_object_ids(const DeviceConfig& config) {
  std::unordered_set<std::string> ids;
  const auto insert_all = [&ids](const auto& collection) {
    for (const auto& item : collection) {
      if (has_text(item.id)) {
        ids.insert(item.id);
      }
    }
  };

  insert_all(config.inputs);
  insert_all(config.relays);
  insert_all(config.pwm_outputs);
  insert_all(config.pulse_inputs);
  insert_all(config.flowmeters);
  insert_all(config.pid_controllers);
  insert_all(config.steppers);
  insert_all(config.motors);
  insert_all(config.timers);
  insert_all(config.alarms);
  insert_all(config.rules);
  insert_all(config.programs);
  return ids;
}

void validate_gpio_duplicates(const BoardConfig& board, ValidationResult& result) {
  std::map<int, std::string> assigned;

  const auto register_gpio = [&](std::optional<int> gpio, const std::string& path, const std::string& owner) {
    if (!gpio.has_value()) {
      return;
    }

    auto [it, inserted] = assigned.emplace(*gpio, owner);
    if (!inserted) {
      add_error(
          result,
          path,
          kDuplicateId,
          "GPIO " + std::to_string(*gpio) + " is assigned to both '" + it->second + "' and '" + owner + "'.");
    }
  };

  for (std::size_t index = 0; index < board.input_pins.size(); ++index) {
    register_gpio(board.input_pins[index].gpio, "board.input_pins[" + std::to_string(index) + "].gpio", board.input_pins[index].target_id);
  }
  for (std::size_t index = 0; index < board.relay_pins.size(); ++index) {
    register_gpio(board.relay_pins[index].gpio, "board.relay_pins[" + std::to_string(index) + "].gpio", board.relay_pins[index].target_id);
  }
  for (std::size_t index = 0; index < board.pwm_pins.size(); ++index) {
    register_gpio(board.pwm_pins[index].gpio, "board.pwm_pins[" + std::to_string(index) + "].gpio", board.pwm_pins[index].target_id);
  }
  for (std::size_t index = 0; index < board.pulse_input_pins.size(); ++index) {
    register_gpio(
        board.pulse_input_pins[index].gpio,
        "board.pulse_input_pins[" + std::to_string(index) + "].gpio",
        board.pulse_input_pins[index].target_id);
  }
  for (std::size_t index = 0; index < board.motor_pins.size(); ++index) {
    register_gpio(board.motor_pins[index].gpio, "board.motor_pins[" + std::to_string(index) + "].gpio", board.motor_pins[index].target_id);
  }
  for (std::size_t index = 0; index < board.stepper_pins.size(); ++index) {
    register_gpio(
        board.stepper_pins[index].step_gpio,
        "board.stepper_pins[" + std::to_string(index) + "].step_gpio",
        board.stepper_pins[index].target_id + ".step");
    register_gpio(
        board.stepper_pins[index].dir_gpio,
        "board.stepper_pins[" + std::to_string(index) + "].dir_gpio",
        board.stepper_pins[index].target_id + ".dir");
    register_gpio(
        board.stepper_pins[index].enable_gpio,
        "board.stepper_pins[" + std::to_string(index) + "].enable_gpio",
        board.stepper_pins[index].target_id + ".enable");
  }
  for (std::size_t index = 0; index < board.display_pins.size(); ++index) {
    register_gpio(
        board.display_pins[index].sda_gpio,
        "board.display_pins[" + std::to_string(index) + "].sda_gpio",
        board.display_pins[index].id + ".sda");
    register_gpio(
        board.display_pins[index].scl_gpio,
        "board.display_pins[" + std::to_string(index) + "].scl_gpio",
        board.display_pins[index].id + ".scl");
  }
}

bool is_fuel_or_ignition(ActuatorRole role) {
  return role == ActuatorRole::fuel || role == ActuatorRole::ignition;
}

template <typename T>
void validate_interlock_reference(const T& item, const std::string& path, ValidationResult& result) {
  if (item.interlock_group.has_value() && !has_text(*item.interlock_group)) {
    add_error(result, path + ".interlock_group", kMissingRequiredField, "Interlock group reference must not be blank.");
  }
}

}  // namespace

bool ValidationResult::has_errors() const {
  return std::any_of(issues.begin(), issues.end(), [](const ValidationIssue& issue) {
    return issue.severity == ValidationSeverity::error;
  });
}

bool ValidationResult::has_warnings() const {
  return std::any_of(issues.begin(), issues.end(), [](const ValidationIssue& issue) {
    return issue.severity == ValidationSeverity::warning;
  });
}

ValidationResult validate_config(const DeviceConfig& config) {
  ValidationResult result{};

  if (config.schema_version == 0U) {
    add_error(result, "schema_version", kInvalidSchemaVersion, "schema_version must be greater than zero.");
  }
  if (config.config_version == 0U) {
    add_error(result, "config_version", kInvalidConfigVersion, "config_version must be greater than zero.");
  }

  validate_identity(config.device, "device", result);
  validate_identity(config.board, "board", result);
  validate_identity(config.network, "network", result);
  validate_identity(config.display, "display", result);
  validate_identity(config.storage, "storage", result);

  if (!has_text(config.board.name)) {
    add_error(result, "board.name", kMissingRequiredField, "Board name must be defined.");
  }
  validate_gpio_duplicates(config.board, result);

  validate_unique_ids(config.inputs, "inputs", result);
  validate_unique_ids(config.relays, "relays", result);
  validate_unique_ids(config.pwm_outputs, "pwm_outputs", result);
  validate_unique_ids(config.pulse_inputs, "pulse_inputs", result);
  validate_unique_ids(config.flowmeters, "flowmeters", result);
  validate_unique_ids(config.pid_controllers, "pid_controllers", result);
  validate_unique_ids(config.steppers, "steppers", result);
  validate_unique_ids(config.motors, "motors", result);
  validate_unique_ids(config.timers, "timers", result);
  validate_unique_ids(config.alarms, "alarms", result);
  validate_unique_ids(config.rules, "rules", result);
  validate_unique_ids(config.programs, "programs", result);
  validate_unique_ids(config.templates, "templates", result);

  validate_unique_ids(config.board.input_pins, "board.input_pins", result);
  validate_unique_ids(config.board.relay_pins, "board.relay_pins", result);
  validate_unique_ids(config.board.pwm_pins, "board.pwm_pins", result);
  validate_unique_ids(config.board.pulse_input_pins, "board.pulse_input_pins", result);
  validate_unique_ids(config.board.stepper_pins, "board.stepper_pins", result);
  validate_unique_ids(config.board.motor_pins, "board.motor_pins", result);
  validate_unique_ids(config.board.display_pins, "board.display_pins", result);

  const input_ids = collect_ids(config.inputs);
  const relay_ids = collect_ids(config.relays);
  const pulse_input_ids = collect_ids(config.pulse_inputs);
  const timer_ids = collect_ids(config.timers);
  const actuator_ids = collect_actuator_ids(config);
  const stepper_ids = collect_ids(config.steppers);
  const motor_ids = collect_ids(config.motors);
  const pwm_ids = collect_ids(config.pwm_outputs);
  const known_object_ids = collect_known_object_ids(config);

  for (std::size_t index = 0; index < config.board.input_pins.size(); ++index) {
    const auto& pin = config.board.input_pins[index];
    if (pin.enabled && has_text(pin.target_id) && !input_ids.count(pin.target_id)) {
      add_error(result, "board.input_pins[" + std::to_string(index) + "].target_id", kUnknownReference, "Board input pin references unknown input '" + pin.target_id + "'.");
    }
  }
  for (std::size_t index = 0; index < config.board.relay_pins.size(); ++index) {
    const auto& pin = config.board.relay_pins[index];
    if (pin.enabled && has_text(pin.target_id) && !relay_ids.count(pin.target_id)) {
      add_error(result, "board.relay_pins[" + std::to_string(index) + "].target_id", kUnknownReference, "Board relay pin references unknown relay '" + pin.target_id + "'.");
    }
  }
  for (std::size_t index = 0; index < config.board.pwm_pins.size(); ++index) {
    const auto& pin = config.board.pwm_pins[index];
    if (pin.enabled && has_text(pin.target_id) && !pwm_ids.count(pin.target_id)) {
      add_error(result, "board.pwm_pins[" + std::to_string(index) + "].target_id", kUnknownReference, "Board PWM pin references unknown PWM output '" + pin.target_id + "'.");
    }
  }
  for (std::size_t index = 0; index < config.board.pulse_input_pins.size(); ++index) {
    const auto& pin = config.board.pulse_input_pins[index];
    if (pin.enabled && has_text(pin.target_id) && !pulse_input_ids.count(pin.target_id)) {
      add_error(result, "board.pulse_input_pins[" + std::to_string(index) + "].target_id", kUnknownReference, "Board pulse pin references unknown pulse input '" + pin.target_id + "'.");
    }
  }
  for (std::size_t index = 0; index < config.board.stepper_pins.size(); ++index) {
    const auto& pin = config.board.stepper_pins[index];
    if (pin.enabled && has_text(pin.target_id) && !stepper_ids.count(pin.target_id)) {
      add_error(result, "board.stepper_pins[" + std::to_string(index) + "].target_id", kUnknownReference, "Board stepper pin references unknown stepper '" + pin.target_id + "'.");
    }
  }
  for (std::size_t index = 0; index < config.board.motor_pins.size(); ++index) {
    const auto& pin = config.board.motor_pins[index];
    if (pin.enabled && has_text(pin.target_id) && !motor_ids.count(pin.target_id)) {
      add_error(result, "board.motor_pins[" + std::to_string(index) + "].target_id", kUnknownReference, "Board motor pin references unknown motor '" + pin.target_id + "'.");
    }
  }
  for (std::size_t index = 0; index < config.board.display_pins.size(); ++index) {
    const auto& pin = config.board.display_pins[index];
    if (pin.enabled && !has_text(pin.bus_name)) {
      add_error(result, "board.display_pins[" + std::to_string(index) + "].bus_name", kMissingRequiredField, "Enabled display pin mapping must define a bus name.");
    }
  }

  for (std::size_t index = 0; index < config.inputs.size(); ++index) {
    const auto& input = config.inputs[index];
    const std::string path = "inputs[" + std::to_string(index) + "]";
    if (!input.enabled) {
      continue;
    }

    switch (input.kind) {
      case InputKind::disabled:
        add_error(result, path + ".kind", kMissingRequiredField, "Enabled input cannot use disabled kind.");
        break;
      case InputKind::di:
        if (!input.di.has_value()) {
          add_error(result, path + ".di", kMissingRequiredField, "Digital input settings are required for DI inputs.");
        }
        break;
      case InputKind::ai:
        if (!input.ai.has_value()) {
          add_error(result, path + ".ai", kMissingRequiredField, "Analog input settings are required for AI inputs.");
        } else if (!(input.ai->raw_min < input.ai->raw_max && input.ai->engineering_min < input.ai->engineering_max)) {
          add_error(result, path + ".ai", kInvalidRange, "Analog scaling ranges must be strictly increasing.");
        }
        break;
      case InputKind::pulse:
      case InputKind::flow_source:
        if (!input.pulse.has_value()) {
          add_error(result, path + ".pulse", kMissingRequiredField, "Pulse input settings are required for pulse-capable inputs.");
        } else {
          if (input.pulse->debounce_us == 0U) {
            add_error(result, path + ".pulse.debounce_us", kInvalidRange, "Pulse debounce must be greater than zero.");
          }
          if (input.pulse->max_frequency_hz <= 0.0) {
            add_error(result, path + ".pulse.max_frequency_hz", kInvalidRange, "Pulse max frequency must be greater than zero.");
          }
        }
        break;
    }
  }

  for (std::size_t index = 0; index < config.relays.size(); ++index) {
    const auto& relay = config.relays[index];
    const std::string path = "relays[" + std::to_string(index) + "]";
    validate_interlock_reference(relay, path, result);
    if (is_fuel_or_ignition(relay.role) && relay.safe_state != SafeState::off) {
      add_error(result, path + ".safe_state", kInvalidSafeState, "Fuel and ignition relays must explicitly fail safe OFF.");
    }
  }

  for (std::size_t index = 0; index < config.pwm_outputs.size(); ++index) {
    const auto& output = config.pwm_outputs[index];
    const std::string path = "pwm_outputs[" + std::to_string(index) + "]";
    validate_interlock_reference(output, path, result);
    if (output.output_min > output.output_max) {
      add_error(result, path, kInvalidRange, "PWM output_min must be less than or equal to output_max.");
    }
    if (is_fuel_or_ignition(output.role) && output.safe_state != SafeState::off) {
      add_error(result, path + ".safe_state", kInvalidSafeState, "Fuel and ignition PWM outputs must explicitly fail safe OFF.");
    }
  }

  for (std::size_t index = 0; index < config.pulse_inputs.size(); ++index) {
    const auto& pulse = config.pulse_inputs[index];
    const std::string path = "pulse_inputs[" + std::to_string(index) + "]";
    if (pulse.enabled && !has_text(pulse.source_input_id)) {
      add_error(result, path + ".source_input_id", kMissingRequiredField, "Enabled pulse input must reference a source input.");
    }
    if (pulse.enabled && has_text(pulse.source_input_id) && !input_ids.count(pulse.source_input_id)) {
      add_error(result, path + ".source_input_id", kUnknownReference, "Pulse input references unknown source input '" + pulse.source_input_id + "'.");
    }
    if (pulse.enabled && pulse.debounce_us == 0U) {
      add_error(result, path + ".debounce_us", kInvalidRange, "Pulse input debounce must be greater than zero.");
    }
    if (pulse.enabled && pulse.scale <= 0.0) {
      add_error(result, path + ".scale", kInvalidRange, "Pulse input scale must be greater than zero.");
    }
  }

  for (std::size_t index = 0; index < config.flowmeters.size(); ++index) {
    const auto& flowmeter = config.flowmeters[index];
    const std::string path = "flowmeters[" + std::to_string(index) + "]";
    if (!flowmeter.enabled) {
      continue;
    }
    if (!pulse_input_ids.count(flowmeter.pulse_input_id)) {
      add_error(result, path + ".pulse_input_id", kUnknownReference, "Flowmeter references unknown pulse input '" + flowmeter.pulse_input_id + "'.");
    }
    if (flowmeter.k_factor <= 0.0) {
      add_error(result, path + ".k_factor", kInvalidKFactor, "Flowmeter k_factor must be greater than zero.");
    }
    if (flowmeter.averaging_window_ms == 0U) {
      add_error(result, path + ".averaging_window_ms", kInvalidRange, "Flowmeter averaging window must be greater than zero.");
    }
    if (flowmeter.batch_target_volume.has_value() && *flowmeter.batch_target_volume <= 0.0) {
      add_error(result, path + ".batch_target_volume", kInvalidRange, "Batch target volume must be greater than zero when configured.");
    }
  }

  for (std::size_t index = 0; index < config.pid_controllers.size(); ++index) {
    const auto& pid = config.pid_controllers[index];
    const std::string path = "pid_controllers[" + std::to_string(index) + "]";
    if (!pid.enabled) {
      continue;
    }
    if (!has_text(pid.pv_source)) {
      add_error(result, path + ".pv_source", kMissingRequiredField, "PID controller must reference a non-empty PV source.");
    } else if (!looks_like_signal_path(pid.pv_source)) {
      add_warning(result, path + ".pv_source", "SUSPICIOUS_SIGNAL_PATH", "PID PV source path looks unusual and should be reviewed.");
    }
    if (!actuator_ids.count(pid.output_target_id)) {
      add_error(result, path + ".output_target_id", kInvalidPidTarget, "PID controller references unknown output target '" + pid.output_target_id + "'.");
    }
    if (pid.sample_time_ms == 0U) {
      add_error(result, path + ".sample_time_ms", kInvalidRange, "PID sample_time_ms must be greater than zero.");
    }
    if (pid.output_min > pid.output_max) {
      add_error(result, path, kInvalidRange, "PID output_min must be less than or equal to output_max.");
    }
    if (pid.integral_min.has_value() && pid.integral_max.has_value() && *pid.integral_min > *pid.integral_max) {
      add_error(result, path, kInvalidRange, "PID integral_min must be less than or equal to integral_max.");
    }
  }

  for (std::size_t index = 0; index < config.steppers.size(); ++index) {
    const auto& stepper = config.steppers[index];
    const std::string path = "steppers[" + std::to_string(index) + "]";
    validate_interlock_reference(stepper, path, result);
    if (is_fuel_or_ignition(stepper.role) && stepper.safe_state != SafeState::off) {
      add_error(result, path + ".safe_state", kInvalidSafeState, "Fuel and ignition steppers must explicitly fail safe OFF.");
    }
  }

  for (std::size_t index = 0; index < config.motors.size(); ++index) {
    const auto& motor = config.motors[index];
    const std::string path = "motors[" + std::to_string(index) + "]";
    validate_interlock_reference(motor, path, result);
    if (motor.output_min > motor.output_max) {
      add_error(result, path, kInvalidRange, "Motor output_min must be less than or equal to output_max.");
    }
    if (is_fuel_or_ignition(motor.role) && motor.safe_state != SafeState::off) {
      add_error(result, path + ".safe_state", kInvalidSafeState, "Fuel and ignition motors must explicitly fail safe OFF.");
    }
  }

  for (std::size_t index = 0; index < config.alarms.size(); ++index) {
    const auto& alarm = config.alarms[index];
    const std::string path = "alarms[" + std::to_string(index) + "]";
    if (alarm.latch_timer_id.has_value() && !timer_ids.count(*alarm.latch_timer_id)) {
      add_error(result, path + ".latch_timer_id", kUnknownReference, "Alarm references unknown timer '" + *alarm.latch_timer_id + "'.");
    }
    for (std::size_t condition_index = 0; condition_index < alarm.condition_paths.size(); ++condition_index) {
      if (!looks_like_signal_path(alarm.condition_paths[condition_index])) {
        add_warning(result, path + ".condition_paths[" + std::to_string(condition_index) + "]", "SUSPICIOUS_SIGNAL_PATH", "Alarm condition path looks unusual and should be reviewed.");
      }
    }
  }

  for (std::size_t index = 0; index < config.rules.size(); ++index) {
    const auto& rule = config.rules[index];
    const std::string path = "rules[" + std::to_string(index) + "]";
    validate_unique_ids(rule.conditions, path + ".conditions", result);
    validate_unique_ids(rule.actions, path + ".actions", result);

    for (std::size_t action_index = 0; action_index < rule.actions.size(); ++action_index) {
      const auto& action = rule.actions[action_index];
      if (has_text(action.target_id) && !actuator_ids.count(action.target_id)) {
        add_error(result, path + ".actions[" + std::to_string(action_index) + "].target_id", kUnknownReference, "Rule action references unknown actuator '" + action.target_id + "'.");
      }
    }

    for (std::size_t condition_index = 0; condition_index < rule.conditions.size(); ++condition_index) {
      const auto& condition = rule.conditions[condition_index];
      if (has_text(condition.signal_path) && !looks_like_signal_path(condition.signal_path)) {
        add_warning(result, path + ".conditions[" + std::to_string(condition_index) + "].signal_path", "SUSPICIOUS_SIGNAL_PATH", "Rule condition path looks unusual and should be reviewed.");
      }
    }
  }

  for (std::size_t index = 0; index < config.programs.size(); ++index) {
    const auto& program = config.programs[index];
    const std::string path = "programs[" + std::to_string(index) + "]";
    validate_unique_ids(program.states, path + ".states", result);

    if (!has_text(program.initial_state)) {
      add_error(result, path + ".initial_state", kMissingRequiredField, "Program must define initial_state.");
    }
    if (!has_text(program.normal_stop_state)) {
      add_error(result, path + ".normal_stop_state", kMissingRequiredField, "Program must define normal_stop_state.");
    }
    if (!has_text(program.trip_state)) {
      add_error(result, path + ".trip_state", kMissingRequiredField, "Program must define trip_state.");
    }
    if (!has_text(program.lockout_state)) {
      add_error(result, path + ".lockout_state", kMissingRequiredField, "Program must define lockout_state.");
    }

    std::unordered_set<std::string> state_ids = collect_ids(program.states);
    const auto validate_state_target = [&](const std::optional<std::string>& target, const std::string& target_path) {
      if (target.has_value() && has_text(*target) && !state_ids.count(*target)) {
        add_error(result, target_path, kInvalidProgramStateTarget, "State target '" + *target + "' does not exist in the program.");
      }
    };

    if (has_text(program.initial_state) && !state_ids.count(program.initial_state)) {
      add_error(result, path + ".initial_state", kInvalidProgramStateTarget, "initial_state does not reference an existing state.");
    }
    if (has_text(program.normal_stop_state) && !state_ids.count(program.normal_stop_state)) {
      add_error(result, path + ".normal_stop_state", kInvalidProgramStateTarget, "normal_stop_state does not reference an existing state.");
    }
    if (has_text(program.trip_state) && !state_ids.count(program.trip_state)) {
      add_error(result, path + ".trip_state", kInvalidProgramStateTarget, "trip_state does not reference an existing state.");
    }
    if (has_text(program.lockout_state) && !state_ids.count(program.lockout_state)) {
      add_error(result, path + ".lockout_state", kInvalidProgramStateTarget, "lockout_state does not reference an existing state.");
    }

    for (std::size_t state_index = 0; state_index < program.states.size(); ++state_index) {
      const auto& state = program.states[state_index];
      const std::string state_path = path + ".states[" + std::to_string(state_index) + "]";
      validate_state_target(state.on_timeout, state_path + ".on_timeout");
      validate_state_target(state.on_fault, state_path + ".on_fault");

      const auto validate_actions = [&](const auto& actions, const std::string& actions_path) {
        validate_unique_ids(actions, actions_path, result);
        for (std::size_t action_index = 0; action_index < actions.size(); ++action_index) {
          const auto& action = actions[action_index];
          if (has_text(action.target_actuator_id) && !actuator_ids.count(action.target_actuator_id)) {
            add_error(result, actions_path + "[" + std::to_string(action_index) + "].target_actuator_id", kUnknownReference, "Program action references unknown actuator '" + action.target_actuator_id + "'.");
          }
        }
      };

      validate_actions(state.entry_actions, state_path + ".entry_actions");
      validate_actions(state.active_actions, state_path + ".active_actions");
      validate_actions(state.exit_actions, state_path + ".exit_actions");
      validate_unique_ids(state.transitions, state_path + ".transitions", result);

      for (std::size_t transition_index = 0; transition_index < state.transitions.size(); ++transition_index) {
        const auto& transition = state.transitions[transition_index];
        if (!state_ids.count(transition.to)) {
          add_error(result, state_path + ".transitions[" + std::to_string(transition_index) + "].to", kInvalidProgramStateTarget, "Transition target '" + transition.to + "' does not exist.");
        }
        if (has_text(transition.condition_path) && !looks_like_signal_path(transition.condition_path)) {
          add_warning(result, state_path + ".transitions[" + std::to_string(transition_index) + "].condition_path", "SUSPICIOUS_SIGNAL_PATH", "Transition condition path looks unusual and should be reviewed.");
        }
      }
    }
  }

  for (std::size_t index = 0; index < config.templates.size(); ++index) {
    const auto& binding = config.templates[index];
    const std::string path = "templates[" + std::to_string(index) + "]";
    static const std::set<std::string> known_templates = {"smart_relay", "pump", "flow", "dosing", "pid_pump", "compressor", "burner_supervisory", "incinerator_supervisory", "custom"};

    if (!known_templates.count(binding.template_type_id)) {
      add_warning(result, path + ".template_type_id", "UNKNOWN_TEMPLATE_TYPE", "Template type '" + binding.template_type_id + "' is not in the known template list and should be reviewed.");
    }
    if (binding.object_id.has_value() && has_text(*binding.object_id) && !known_object_ids.count(*binding.object_id)) {
      add_error(result, path + ".object_id", kUnknownReference, "Template binding references unknown object '" + *binding.object_id + "'.");
    }
  }

  if (config.storage.enabled) {
    if (config.storage.save_every_pulses.has_value() && *config.storage.save_every_pulses == 0U) {
      add_error(result, "storage.save_every_pulses", kInvalidSaveInterval, "storage.save_every_pulses must be positive when configured.");
    }
    if (config.storage.save_every_seconds.has_value() && *config.storage.save_every_seconds == 0U) {
      add_error(result, "storage.save_every_seconds", kInvalidSaveInterval, "storage.save_every_seconds must be positive when configured.");
    }
  }

  if (config.display.enabled) {
    if (!has_text(config.display.driver)) {
      add_error(result, "display.driver", kMissingRequiredField, "Enabled display config must define a driver.");
    }
    if (config.display.width.has_value() && *config.display.width <= 0) {
      add_error(result, "display.width", kInvalidRange, "Display width must be positive.");
    }
    if (config.display.height.has_value() && *config.display.height <= 0) {
      add_error(result, "display.height", kInvalidRange, "Display height must be positive.");
    }
  }

  if (config.network.enabled && !has_text(config.network.hostname)) {
    add_error(result, "network.hostname", kMissingRequiredField, "Network hostname must not be empty.");
  }

  result.valid = !result.has_errors();
  return result;
}

}  // namespace controller::config
