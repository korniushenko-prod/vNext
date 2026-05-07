#include "actuators/motor_service.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <limits>
#include <string>
#include <utility>
#include <variant>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::actuators {

namespace {

using controller::hal::RelayState;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalErrorCode;
using controller::signals::SignalSnapshot;
using controller::signals::SignalType;
using controller::signals::SignalValue;

constexpr double kSpeedEpsilon = 0.000001;

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](const unsigned char ch) {
    return !std::isspace(ch);
  });
}

bool is_finite(const double value) {
  return std::isfinite(value);
}

bool speed_is_zero(const double value) {
  return std::fabs(value) <= kSpeedEpsilon;
}

double clamp_percent(const double value, const double minimum, const double maximum) {
  return std::max(minimum, std::min(maximum, value));
}

double normalize_requested_speed(const MotorDescriptor& descriptor, const bool run, const double speed_percent) {
  if (!run || speed_percent <= 0.0) {
    return 0.0;
  }

  return clamp_percent(speed_percent, descriptor.min_speed_percent, descriptor.max_speed_percent);
}

double ramp_toward(
    const double current,
    const double target,
    const double percent_per_second,
    const MotorTimestampMs delta_ms) {
  if (delta_ms == 0U || speed_is_zero(current - target)) {
    return current;
  }

  const double max_delta = percent_per_second * (static_cast<double>(delta_ms) / 1000.0);
  if (current < target) {
    return std::min(target, current + max_delta);
  }
  return std::max(target, current - max_delta);
}

double launch_speed(const MotorDescriptor& descriptor, const double target_speed) {
  if (target_speed <= 0.0 || descriptor.min_speed_percent <= 0.0) {
    return 0.0;
  }

  return std::min(descriptor.min_speed_percent, target_speed);
}

bool has_start_boost(const MotorDescriptor& descriptor) {
  return descriptor.start_boost_percent.has_value() && descriptor.start_boost_ms.has_value() &&
         *descriptor.start_boost_ms > 0U;
}

std::int64_t to_signal_int64(const std::uint64_t value) {
  constexpr auto max_value = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

void append_issue(
    MotorValidationResult& result,
    const MotorErrorCode code,
    const std::string& field,
    const std::string& message) {
  result.issues.push_back(MotorValidationIssue{code, field, message});
  if (result.status.ok()) {
    result.status = MotorStatus::error(code, message);
  }
}

std::string motor_owner(const std::string& id) {
  return "motor:" + id;
}

std::string motor_base_path(const std::string& id) {
  return "motor." + id;
}

SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type,
    const std::string& unit = "") {
  return SignalDescriptor{
      path,
      name,
      "Motor service runtime signal",
      type,
      unit,
      "motor_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

MotorStatus wrap_signal_publish_error(
    const controller::signals::SignalStatus& status,
    const std::string& context) {
  return MotorStatus::error(MotorErrorCode::motor_signal_publish_failed, context + ": " + status.message);
}

MotorStatus wrap_signal_read_error(
    const controller::signals::SignalStatus& status,
    const std::string& context) {
  return MotorStatus::error(MotorErrorCode::motor_signal_read_failed, context + ": " + status.message);
}

MotorStatus wrap_actuator_error(
    const ActuatorStatus& status,
    const std::string& context) {
  return MotorStatus::error(MotorErrorCode::motor_output_request_failed, context + ": " + status.message);
}

MotorStatus register_signal_if_missing(
    controller::signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const MotorTimestampMs now_ms) {
  if (registry.has_signal(descriptor.path)) {
    return MotorStatus::error(
        MotorErrorCode::motor_signal_publish_failed,
        "Signal '" + descriptor.path + "' is already registered.");
  }

  const auto result = registry.register_signal(descriptor, initial_value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_publish_error(result.status, "Failed to register signal '" + descriptor.path + "'");
  }
  return MotorStatus::success();
}

MotorStatus update_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const SignalValue& value,
    const MotorTimestampMs now_ms) {
  const auto result = registry.update_signal(path, value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_publish_error(result.status, "Failed to update signal '" + path + "'");
  }
  return MotorStatus::success();
}

RelayState direction_to_relay_state(const MotorDirection direction) {
  return direction == MotorDirection::reverse ? RelayState::on : RelayState::off;
}

bool signal_snapshot_is_usable(const SignalSnapshot& snapshot) {
  return snapshot.initialized && snapshot.valid && !snapshot.fault && !snapshot.stale && snapshot.value.has_value();
}

}  // namespace

const char* to_string(const MotorDirection direction) {
  switch (direction) {
    case MotorDirection::forward:
      return "forward";
    case MotorDirection::reverse:
      return "reverse";
  }

  return "unknown";
}

const char* to_string(const MotorRuntimeState state) {
  switch (state) {
    case MotorRuntimeState::stopped:
      return "stopped";
    case MotorRuntimeState::starting_boost:
      return "starting_boost";
    case MotorRuntimeState::ramping_up:
      return "ramping_up";
    case MotorRuntimeState::running:
      return "running";
    case MotorRuntimeState::ramping_down:
      return "ramping_down";
    case MotorRuntimeState::reversing_delay:
      return "reversing_delay";
    case MotorRuntimeState::fault:
      return "fault";
  }

  return "unknown";
}

const char* to_string(const MotorHistoryEventType event_type) {
  switch (event_type) {
    case MotorHistoryEventType::registered:
      return "registered";
    case MotorHistoryEventType::command_received:
      return "command_received";
    case MotorHistoryEventType::started:
      return "started";
    case MotorHistoryEventType::stopped:
      return "stopped";
    case MotorHistoryEventType::direction_changed:
      return "direction_changed";
    case MotorHistoryEventType::fault_entered:
      return "fault_entered";
    case MotorHistoryEventType::fault_cleared:
      return "fault_cleared";
    case MotorHistoryEventType::output_requested:
      return "output_requested";
    case MotorHistoryEventType::output_cleared:
      return "output_cleared";
  }

  return "unknown";
}

const char* to_string(const MotorErrorCode code) {
  switch (code) {
    case MotorErrorCode::ok:
      return "OK";
    case MotorErrorCode::motor_already_registered:
      return "MOTOR_ALREADY_REGISTERED";
    case MotorErrorCode::motor_not_found:
      return "MOTOR_NOT_FOUND";
    case MotorErrorCode::motor_invalid_descriptor:
      return "MOTOR_INVALID_DESCRIPTOR";
    case MotorErrorCode::motor_invalid_command:
      return "MOTOR_INVALID_COMMAND";
    case MotorErrorCode::motor_reverse_not_allowed:
      return "MOTOR_REVERSE_NOT_ALLOWED";
    case MotorErrorCode::motor_direction_unsupported:
      return "MOTOR_DIRECTION_UNSUPPORTED";
    case MotorErrorCode::motor_fault_active:
      return "MOTOR_FAULT_ACTIVE";
    case MotorErrorCode::motor_output_request_failed:
      return "MOTOR_OUTPUT_REQUEST_FAILED";
    case MotorErrorCode::motor_signal_publish_failed:
      return "MOTOR_SIGNAL_PUBLISH_FAILED";
    case MotorErrorCode::motor_signal_read_failed:
      return "MOTOR_SIGNAL_READ_FAILED";
  }

  return "MOTOR_UNKNOWN";
}

MotorService::MotorService(
    controller::signals::SignalRegistry& signal_registry,
    ActuatorManager& actuator_manager,
    const std::size_t history_capacity)
    : signal_registry_(signal_registry), actuator_manager_(actuator_manager), history_(history_capacity) {}

MotorValidationResult MotorService::validate_descriptor(
    const MotorDescriptor& descriptor,
    const std::optional<std::string> existing_motor_id) const {
  MotorValidationResult result;

  if (!has_text(descriptor.id)) {
    append_issue(result, MotorErrorCode::motor_invalid_descriptor, "motor.id", "Motor id must not be empty.");
  } else if (!controller::signals::is_valid_signal_path(descriptor.id)) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.id",
        "Motor id '" + descriptor.id + "' must be a valid dot-separated signal-style id.");
  } else if (has_motor(descriptor.id) && (!existing_motor_id.has_value() || *existing_motor_id != descriptor.id)) {
    append_issue(
        result,
        MotorErrorCode::motor_already_registered,
        "motor.id",
        "Motor '" + descriptor.id + "' is already registered.");
  }

  if (!has_text(descriptor.name)) {
    append_issue(result, MotorErrorCode::motor_invalid_descriptor, "motor.name", "Motor name must not be empty.");
  }
  if (!has_text(descriptor.pwm_target_id)) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.pwm_target_id",
        "pwm_target_id must not be empty.");
  } else if (!actuator_manager_.has_target(descriptor.pwm_target_id)) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.pwm_target_id",
        "PWM target '" + descriptor.pwm_target_id + "' is not registered.");
  } else {
    const auto snapshot = actuator_manager_.get_snapshot(descriptor.pwm_target_id);
    if (!snapshot.ok() || snapshot.value->kind != ActuatorTargetKind::pwm) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.pwm_target_id",
          "Actuator target '" + descriptor.pwm_target_id + "' is not a PWM target.");
    }
  }

  if (descriptor.enable_target_id.has_value()) {
    if (!has_text(*descriptor.enable_target_id)) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.enable_target_id",
          "enable_target_id must not be blank when provided.");
    } else if (!actuator_manager_.has_target(*descriptor.enable_target_id)) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.enable_target_id",
          "Enable target '" + *descriptor.enable_target_id + "' is not registered.");
    } else {
      const auto snapshot = actuator_manager_.get_snapshot(*descriptor.enable_target_id);
      if (!snapshot.ok() || snapshot.value->kind != ActuatorTargetKind::relay) {
        append_issue(
            result,
            MotorErrorCode::motor_invalid_descriptor,
            "motor.enable_target_id",
            "Enable target '" + *descriptor.enable_target_id + "' must be a relay target.");
      }
    }
  }

  if (descriptor.direction_target_id.has_value()) {
    if (!has_text(*descriptor.direction_target_id)) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.direction_target_id",
          "direction_target_id must not be blank when provided.");
    } else if (!actuator_manager_.has_target(*descriptor.direction_target_id)) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.direction_target_id",
          "Direction target '" + *descriptor.direction_target_id + "' is not registered.");
    } else {
      const auto snapshot = actuator_manager_.get_snapshot(*descriptor.direction_target_id);
      if (!snapshot.ok() || snapshot.value->kind != ActuatorTargetKind::relay) {
        append_issue(
            result,
            MotorErrorCode::motor_invalid_descriptor,
            "motor.direction_target_id",
            "Direction target '" + *descriptor.direction_target_id + "' must be a relay target.");
      }
    }
  }

  if (descriptor.brake_target_id.has_value()) {
    if (!has_text(*descriptor.brake_target_id)) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.brake_target_id",
          "brake_target_id must not be blank when provided.");
    } else if (!actuator_manager_.has_target(*descriptor.brake_target_id)) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.brake_target_id",
          "Brake target '" + *descriptor.brake_target_id + "' is not registered.");
    } else {
      const auto snapshot = actuator_manager_.get_snapshot(*descriptor.brake_target_id);
      if (!snapshot.ok() || snapshot.value->kind != ActuatorTargetKind::relay) {
        append_issue(
            result,
            MotorErrorCode::motor_invalid_descriptor,
            "motor.brake_target_id",
            "Brake target '" + *descriptor.brake_target_id + "' must be a relay target.");
      }
    }
  }

  if (descriptor.allow_reverse && !descriptor.direction_target_id.has_value()) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.allow_reverse",
        "allow_reverse requires a direction_target_id in Stage 18.");
  }

  if (descriptor.min_speed_percent < 0.0 || descriptor.min_speed_percent > 100.0 ||
      descriptor.max_speed_percent < 0.0 || descriptor.max_speed_percent > 100.0 ||
      descriptor.safe_speed_percent < 0.0 || descriptor.safe_speed_percent > 100.0) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.speed_range",
        "min/max/safe speed percentages must stay within 0..100.");
  }
  if (descriptor.max_speed_percent < descriptor.min_speed_percent) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.speed_range",
        "min_speed_percent must be less than or equal to max_speed_percent.");
  }

  if (descriptor.start_boost_percent.has_value()) {
    if (!is_finite(*descriptor.start_boost_percent)) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.start_boost_percent",
          "start_boost_percent must be finite when provided.");
    } else if (*descriptor.start_boost_percent < descriptor.min_speed_percent || *descriptor.start_boost_percent > 100.0) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.start_boost_percent",
          "start_boost_percent must stay within min_speed_percent..100.");
    }
    if (!descriptor.start_boost_ms.has_value()) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.start_boost_ms",
          "start_boost_ms must be provided when start_boost_percent is configured.");
    }
  }
  if (descriptor.start_boost_ms.has_value()) {
    if (*descriptor.start_boost_ms == 0U) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.start_boost_ms",
          "start_boost_ms must be greater than zero when provided.");
    }
    if (!descriptor.start_boost_percent.has_value()) {
      append_issue(
          result,
          MotorErrorCode::motor_invalid_descriptor,
          "motor.start_boost_percent",
          "start_boost_percent must be provided when start_boost_ms is configured.");
    }
  }

  if (!is_finite(descriptor.ramp_up_percent_per_sec) || descriptor.ramp_up_percent_per_sec <= 0.0) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.ramp_up_percent_per_sec",
        "ramp_up_percent_per_sec must be finite and greater than zero.");
  }
  if (!is_finite(descriptor.ramp_down_percent_per_sec) || descriptor.ramp_down_percent_per_sec <= 0.0) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.ramp_down_percent_per_sec",
        "ramp_down_percent_per_sec must be finite and greater than zero.");
  }

  if (descriptor.fault_signal_path.has_value() && !has_text(*descriptor.fault_signal_path)) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.fault_signal_path",
        "fault_signal_path must not be blank when provided.");
  }
  if (descriptor.tach_signal_path.has_value() && !has_text(*descriptor.tach_signal_path)) {
    append_issue(
        result,
        MotorErrorCode::motor_invalid_descriptor,
        "motor.tach_signal_path",
        "tach_signal_path must not be blank when provided.");
  }

  if (result.status.ok()) {
    result.status = MotorStatus::success();
  }
  return result;
}

MotorOperationResult MotorService::register_motor(const MotorDescriptor& descriptor) {
  if (motors_by_id_.count(descriptor.id) != 0U) {
    return {MotorStatus::error(
        MotorErrorCode::motor_already_registered,
        "Motor '" + descriptor.id + "' is already registered.")};
  }

  const auto validation = validate_descriptor(descriptor);
  if (!validation.ok()) {
    return {validation.status.ok()
                ? MotorStatus::error(MotorErrorCode::motor_invalid_descriptor, "Motor descriptor validation failed.")
                : validation.status};
  }

  if (descriptor.publish_signals) {
    const auto signal_result = ensure_motor_signals_registered(descriptor);
    if (!signal_result.ok()) {
      return signal_result;
    }
  }

  MotorRecord record;
  record.descriptor = descriptor;
  record.last_reason = "registered";

  motor_order_.push_back(descriptor.id);
  motors_by_id_.emplace(descriptor.id, std::move(record));
  record_history(descriptor.id, MotorHistoryEventType::registered, 0U, "motor_service", "registered");
  increment_update_counter(motors_by_id_.at(descriptor.id));
  return publish_motor_signals(motors_by_id_.at(descriptor.id), 0U);
}

bool MotorService::has_motor(const std::string& id) const {
  return motors_by_id_.count(id) != 0U;
}

MotorResult<MotorDescriptor> MotorService::get_descriptor(const std::string& id) const {
  MotorResult<MotorDescriptor> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = MotorStatus::error(MotorErrorCode::motor_not_found, "Motor '" + id + "' is not registered.");
    return result;
  }

  result.status = MotorStatus::success();
  result.value = record->descriptor;
  return result;
}

std::vector<MotorDescriptor> MotorService::list_descriptors() const {
  std::vector<MotorDescriptor> descriptors;
  descriptors.reserve(motor_order_.size());
  for (const auto& id : motor_order_) {
    descriptors.push_back(motors_by_id_.at(id).descriptor);
  }
  return descriptors;
}

MotorOperationResult MotorService::command_motor(const std::string& id, const MotorCommand& command) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {MotorStatus::error(MotorErrorCode::motor_not_found, "Motor '" + id + "' is not registered.")};
  }
  if (record->runtime_fault) {
    return {MotorStatus::error(MotorErrorCode::motor_fault_active, "Motor '" + id + "' is faulted.")};
  }
  if (!is_finite(command.speed_percent) || command.speed_percent < 0.0 || command.speed_percent > 100.0) {
    return {MotorStatus::error(
        MotorErrorCode::motor_invalid_command,
        "Motor command speed_percent must be finite and within 0..100.")};
  }
  if (!has_text(command.source) || !has_text(command.reason)) {
    return {MotorStatus::error(
        MotorErrorCode::motor_invalid_command,
        "Motor commands require non-empty source and reason.")};
  }
  if (command.direction == MotorDirection::reverse) {
    if (!record->descriptor.allow_reverse) {
      return {MotorStatus::error(
          MotorErrorCode::motor_reverse_not_allowed,
          "Motor '" + id + "' does not allow reverse commands.")};
    }
    if (!record->descriptor.direction_target_id.has_value()) {
      return {MotorStatus::error(
          MotorErrorCode::motor_direction_unsupported,
          "Motor '" + id + "' does not have a direction target.")};
    }
  }

  record->requested_run = command.run && command.speed_percent > 0.0;
  record->requested_speed_percent =
      normalize_requested_speed(record->descriptor, record->requested_run, command.speed_percent);
  record->requested_direction = command.direction;
  record->requested_priority = command.priority;
  record->requested_source = command.source;
  record->requested_reason = command.reason;
  record->last_reason = command.reason;
  increment_update_counter(*record);
  record_history(
      id,
      MotorHistoryEventType::command_received,
      command.now_ms,
      command.source,
      command.reason,
      record->requested_speed_percent);
  return publish_motor_signals(*record, command.now_ms);
}

MotorOperationResult MotorService::stop_motor(
    const std::string& id,
    const MotorTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {MotorStatus::error(MotorErrorCode::motor_not_found, "Motor '" + id + "' is not registered.")};
  }
  if (!has_text(source) || !has_text(reason)) {
    return {MotorStatus::error(
        MotorErrorCode::motor_invalid_command,
        "stop_motor() requires non-empty source and reason.")};
  }

  record->requested_run = false;
  record->requested_speed_percent = 0.0;
  record->requested_source = source;
  record->requested_reason = reason;
  record->last_reason = reason;
  increment_update_counter(*record);
  record_history(id, MotorHistoryEventType::command_received, now_ms, source, reason, 0.0);
  return publish_motor_signals(*record, now_ms);
}

MotorOperationResult MotorService::clear_command(const std::string& id, const MotorTimestampMs now_ms) {
  return stop_motor(id, now_ms, "motor_service", "clear_command");
}

MotorService::OptionalSignalRead MotorService::read_optional_bool_signal(
    const std::optional<std::string>& path,
    const MotorTimestampMs now_ms) const {
  OptionalSignalRead read;
  if (!path.has_value()) {
    read.missing = true;
    read.status = MotorStatus::success();
    return read;
  }

  const auto signal_result = signal_registry_.read_signal(*path, now_ms);
  if (!signal_result.ok()) {
    if (signal_result.status.code == SignalErrorCode::signal_not_found ||
        signal_result.status.code == SignalErrorCode::signal_not_initialized) {
      read.missing = true;
      read.status = MotorStatus::success();
      return read;
    }
    read.status = wrap_signal_read_error(signal_result.status, "Failed to read signal '" + *path + "'");
    return read;
  }

  const auto& snapshot = *signal_result.value;
  if (!signal_snapshot_is_usable(snapshot)) {
    read.status = MotorStatus::error(
        MotorErrorCode::motor_signal_read_failed,
        "Signal '" + *path + "' is present but not usable.");
    return read;
  }

  const auto* bool_value = std::get_if<bool>(&*snapshot.value);
  if (bool_value == nullptr) {
    read.status = MotorStatus::error(
        MotorErrorCode::motor_signal_read_failed,
        "Signal '" + *path + "' must be boolean.");
    return read;
  }

  read.available = true;
  read.value_bool = *bool_value;
  read.status = MotorStatus::success();
  return read;
}

MotorService::OptionalSignalRead MotorService::read_optional_numeric_signal(
    const std::optional<std::string>& path,
    const MotorTimestampMs now_ms) const {
  OptionalSignalRead read;
  if (!path.has_value()) {
    read.missing = true;
    read.status = MotorStatus::success();
    return read;
  }

  const auto signal_result = signal_registry_.read_signal(*path, now_ms);
  if (!signal_result.ok()) {
    if (signal_result.status.code == SignalErrorCode::signal_not_found ||
        signal_result.status.code == SignalErrorCode::signal_not_initialized) {
      read.missing = true;
      read.status = MotorStatus::success();
      return read;
    }
    read.status = wrap_signal_read_error(signal_result.status, "Failed to read signal '" + *path + "'");
    return read;
  }

  const auto& snapshot = *signal_result.value;
  if (!signal_snapshot_is_usable(snapshot)) {
    read.status = MotorStatus::error(
        MotorErrorCode::motor_signal_read_failed,
        "Signal '" + *path + "' is present but not usable.");
    return read;
  }

  if (const auto* int_value = std::get_if<std::int64_t>(&*snapshot.value)) {
    read.available = true;
    read.value_number = static_cast<double>(*int_value);
    read.status = MotorStatus::success();
    return read;
  }
  if (const auto* double_value = std::get_if<double>(&*snapshot.value)) {
    read.available = true;
    read.value_number = *double_value;
    read.status = MotorStatus::success();
    return read;
  }

  read.status = MotorStatus::error(
      MotorErrorCode::motor_signal_read_failed,
      "Signal '" + *path + "' must be numeric.");
  return read;
}

MotorOperationResult MotorService::apply_direction_output(
    MotorRecord& record,
    const MotorTimestampMs now_ms,
    bool& actuator_dirty) {
  if (!record.descriptor.direction_target_id.has_value()) {
    return {MotorStatus::success()};
  }

  const RelayState desired_state = direction_to_relay_state(record.effective_direction);
  if (record.applied_direction_state.has_value() && *record.applied_direction_state == desired_state) {
    return {MotorStatus::success()};
  }

  const std::string reason =
      "Motor '" + record.descriptor.name + "' state=" + std::string(to_string(record.runtime_state)) +
      " dir=" + std::string(to_string(record.effective_direction));

  const auto submit_result = actuator_manager_.submit_request(ActuatorRequest{
      *record.descriptor.direction_target_id,
      motor_owner(record.descriptor.id),
      reason,
      record.requested_priority,
      now_ms,
      std::nullopt,
      RelayActuatorCommand{desired_state},
  });
  if (!submit_result.ok()) {
    return {wrap_actuator_error(
        submit_result.status,
        "Failed to submit direction request for motor '" + record.descriptor.id + "'")};
  }

  record.applied_direction_state = desired_state;
  actuator_dirty = true;
  record_history(
      record.descriptor.id,
      MotorHistoryEventType::output_requested,
      now_ms,
      motor_owner(record.descriptor.id),
      "direction_output_requested",
      desired_state == RelayState::on ? 1.0 : 0.0);
  return {MotorStatus::success()};
}

MotorOperationResult MotorService::apply_run_outputs(
    MotorRecord& record,
    const MotorTimestampMs now_ms,
    bool& actuator_dirty) {
  const std::string owner = motor_owner(record.descriptor.id);
  const std::string reason =
      "Motor '" + record.descriptor.name + "' state=" + std::string(to_string(record.runtime_state)) +
      " dir=" + std::string(to_string(record.effective_direction));

  if (record.descriptor.enable_target_id.has_value()) {
    const RelayState desired_enable = record.effective_run ? RelayState::on : RelayState::off;
    if (!record.applied_enable_state.has_value() || *record.applied_enable_state != desired_enable) {
      const auto enable_result = actuator_manager_.submit_request(ActuatorRequest{
          *record.descriptor.enable_target_id,
          owner,
          reason,
          record.requested_priority,
          now_ms,
          std::nullopt,
          RelayActuatorCommand{desired_enable},
      });
      if (!enable_result.ok()) {
        return {wrap_actuator_error(
            enable_result.status,
            "Failed to submit enable request for motor '" + record.descriptor.id + "'")};
      }

      record.applied_enable_state = desired_enable;
      actuator_dirty = true;
      record_history(
          record.descriptor.id,
          MotorHistoryEventType::output_requested,
          now_ms,
          owner,
          "enable_output_requested",
          desired_enable == RelayState::on ? 1.0 : 0.0);
    }
  }

  const PwmActuatorCommand desired_pwm{record.effective_speed_percent, record.effective_run};
  if (!record.applied_pwm_command.has_value() ||
      std::fabs(record.applied_pwm_command->duty_percent - desired_pwm.duty_percent) > kSpeedEpsilon ||
      record.applied_pwm_command->enabled != desired_pwm.enabled) {
    const auto pwm_result = actuator_manager_.submit_request(ActuatorRequest{
        record.descriptor.pwm_target_id,
        owner,
        reason,
        record.requested_priority,
        now_ms,
        std::nullopt,
        desired_pwm,
    });
    if (!pwm_result.ok()) {
      return {wrap_actuator_error(
          pwm_result.status,
          "Failed to submit PWM request for motor '" + record.descriptor.id + "'")};
    }

    record.applied_pwm_command = desired_pwm;
    actuator_dirty = true;
    record_history(
        record.descriptor.id,
        MotorHistoryEventType::output_requested,
        now_ms,
        owner,
        "pwm_output_requested",
        desired_pwm.duty_percent);
  }

  return apply_direction_output(record, now_ms, actuator_dirty);
}

MotorOperationResult MotorService::clear_motion_outputs(
    MotorRecord& record,
    const MotorTimestampMs now_ms,
    bool& actuator_dirty) {
  const std::string owner = motor_owner(record.descriptor.id);

  if (record.applied_pwm_command.has_value()) {
    const auto remove_result = actuator_manager_.remove_request(record.descriptor.pwm_target_id, owner);
    if (!remove_result.ok() && remove_result.status.code != ActuatorErrorCode::actuator_not_found) {
      return {wrap_actuator_error(
          remove_result.status,
          "Failed to clear PWM request for motor '" + record.descriptor.id + "'")};
    }
    record.applied_pwm_command.reset();
    actuator_dirty = true;
    record_history(
        record.descriptor.id,
        MotorHistoryEventType::output_cleared,
        now_ms,
        owner,
        "pwm_output_cleared");
  }

  if (record.descriptor.enable_target_id.has_value() && record.applied_enable_state.has_value()) {
    const auto remove_result = actuator_manager_.remove_request(*record.descriptor.enable_target_id, owner);
    if (!remove_result.ok() && remove_result.status.code != ActuatorErrorCode::actuator_not_found) {
      return {wrap_actuator_error(
          remove_result.status,
          "Failed to clear enable request for motor '" + record.descriptor.id + "'")};
    }
    record.applied_enable_state.reset();
    actuator_dirty = true;
    record_history(
        record.descriptor.id,
        MotorHistoryEventType::output_cleared,
        now_ms,
        owner,
        "enable_output_cleared");
  }

  return {MotorStatus::success()};
}

MotorOperationResult MotorService::clear_all_outputs(
    MotorRecord& record,
    const MotorTimestampMs now_ms,
    bool& actuator_dirty) {
  const auto motion_clear = clear_motion_outputs(record, now_ms, actuator_dirty);
  if (!motion_clear.ok()) {
    return motion_clear;
  }

  if (record.descriptor.direction_target_id.has_value() && record.applied_direction_state.has_value()) {
    const auto remove_result = actuator_manager_.remove_request(
        *record.descriptor.direction_target_id,
        motor_owner(record.descriptor.id));
    if (!remove_result.ok() && remove_result.status.code != ActuatorErrorCode::actuator_not_found) {
      return {wrap_actuator_error(
          remove_result.status,
          "Failed to clear direction request for motor '" + record.descriptor.id + "'")};
    }
    record.applied_direction_state.reset();
    actuator_dirty = true;
    record_history(
        record.descriptor.id,
        MotorHistoryEventType::output_cleared,
        now_ms,
        motor_owner(record.descriptor.id),
        "direction_output_cleared");
  }

  return {MotorStatus::success()};
}

void MotorService::update_runtime_ms(MotorRecord& record, const MotorTimestampMs now_ms) {
  if (!record.last_tick_ms.has_value() || now_ms <= *record.last_tick_ms) {
    return;
  }

  if (record.effective_run && !speed_is_zero(record.effective_speed_percent)) {
    record.runtime_ms += (now_ms - *record.last_tick_ms);
  }
}

void MotorService::increment_update_counter(MotorRecord& record) {
  ++record.update_counter;
}

MotorOperationResult MotorService::ensure_motor_signals_registered(const MotorDescriptor& descriptor) {
  const auto base = motor_base_path(descriptor.id);
  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".enabled", descriptor.name + " enabled", SignalType::boolean),
      SignalValue{descriptor.enabled},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".runtime_state", descriptor.name + " runtime state", SignalType::string),
      SignalValue{std::string(to_string(MotorRuntimeState::stopped))},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".requested_run", descriptor.name + " requested run", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(
          base + ".requested_speed_percent",
          descriptor.name + " requested speed",
          SignalType::float64,
          "percent"),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".requested_direction", descriptor.name + " requested direction", SignalType::string),
      SignalValue{std::string(to_string(MotorDirection::forward))},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".effective_run", descriptor.name + " effective run", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(
          base + ".effective_speed_percent",
          descriptor.name + " effective speed",
          SignalType::float64,
          "percent"),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".effective_direction", descriptor.name + " effective direction", SignalType::string),
      SignalValue{std::string(to_string(MotorDirection::forward))},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".fault", descriptor.name + " fault", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".fault_reason", descriptor.name + " fault reason", SignalType::string),
      SignalValue{std::string{}},
      0U);
  if (!status.ok()) {
    return {status};
  }
  if (descriptor.tach_signal_path.has_value()) {
    status = register_signal_if_missing(
        signal_registry_,
        make_signal_descriptor(base + ".tach_value", descriptor.name + " tach value", SignalType::float64),
        SignalValue{std::numeric_limits<double>::quiet_NaN()},
        0U);
    if (!status.ok()) {
      return {status};
    }
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".runtime_ms", descriptor.name + " runtime ms", SignalType::int64, "ms"),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".start_count", descriptor.name + " start count", SignalType::int64),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_reason", descriptor.name + " last reason", SignalType::string),
      SignalValue{std::string{"registered"}},
      0U);
  if (!status.ok()) {
    return {status};
  }

  return {MotorStatus::success()};
}

MotorSnapshot MotorService::build_snapshot(const MotorRecord& record) const {
  MotorSnapshot snapshot;
  snapshot.id = record.descriptor.id;
  snapshot.name = record.descriptor.name;
  snapshot.enabled = record.descriptor.enabled;
  snapshot.runtime_state = record.runtime_state;
  snapshot.requested_run = record.requested_run;
  snapshot.requested_speed_percent = record.requested_speed_percent;
  snapshot.requested_direction = record.requested_direction;
  snapshot.effective_run = record.effective_run;
  snapshot.effective_speed_percent = record.effective_speed_percent;
  snapshot.effective_direction = record.effective_direction;
  snapshot.fault = record.runtime_fault;
  snapshot.fault_reason = record.fault_reason;
  snapshot.tach_value = record.tach_value;
  snapshot.runtime_ms = record.runtime_ms;
  snapshot.start_count = record.start_count;
  snapshot.last_reason = record.last_reason;
  snapshot.update_counter = record.update_counter;
  return snapshot;
}

MotorOperationResult MotorService::publish_motor_signals(const MotorRecord& record, const MotorTimestampMs now_ms) {
  if (!record.descriptor.publish_signals) {
    return {MotorStatus::success()};
  }

  const auto snapshot = build_snapshot(record);
  const auto base = motor_base_path(record.descriptor.id);

  auto status = update_signal(signal_registry_, base + ".enabled", SignalValue{snapshot.enabled}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".runtime_state",
      SignalValue{std::string(to_string(snapshot.runtime_state))},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".requested_run", SignalValue{snapshot.requested_run}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".requested_speed_percent",
      SignalValue{snapshot.requested_speed_percent},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".requested_direction",
      SignalValue{std::string(to_string(snapshot.requested_direction))},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".effective_run", SignalValue{snapshot.effective_run}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".effective_speed_percent",
      SignalValue{snapshot.effective_speed_percent},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".effective_direction",
      SignalValue{std::string(to_string(snapshot.effective_direction))},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".fault", SignalValue{snapshot.fault}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".fault_reason", SignalValue{snapshot.fault_reason}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  if (record.descriptor.tach_signal_path.has_value()) {
    const double tach_value =
        snapshot.tach_value.has_value() ? *snapshot.tach_value : std::numeric_limits<double>::quiet_NaN();
    status = update_signal(signal_registry_, base + ".tach_value", SignalValue{tach_value}, now_ms);
    if (!status.ok()) {
      return {status};
    }
  }
  status = update_signal(signal_registry_, base + ".runtime_ms", SignalValue{to_signal_int64(snapshot.runtime_ms)}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".start_count", SignalValue{to_signal_int64(snapshot.start_count)}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".last_reason", SignalValue{snapshot.last_reason}, now_ms);
  if (!status.ok()) {
    return {status};
  }

  return {MotorStatus::success()};
}

MotorOperationResult MotorService::tick(const MotorTimestampMs now_ms) {
  bool actuator_dirty = false;

  for (const auto& id : motor_order_) {
    auto& record = motors_by_id_.at(id);
    const bool moving_before = record.effective_run || !speed_is_zero(record.effective_speed_percent);
    const MotorDirection direction_before = record.effective_direction;
    const MotorTimestampMs previous_tick = record.last_tick_ms.has_value() ? *record.last_tick_ms : now_ms;
    const MotorTimestampMs delta_ms = now_ms > previous_tick ? (now_ms - previous_tick) : 0U;
    const double requested_speed =
        normalize_requested_speed(record.descriptor, record.requested_run, record.requested_speed_percent);

    update_runtime_ms(record, now_ms);

    const auto fault_read = read_optional_bool_signal(record.descriptor.fault_signal_path, now_ms);
    if (!fault_read.status.ok()) {
      return {fault_read.status};
    }

    const auto tach_read = read_optional_numeric_signal(record.descriptor.tach_signal_path, now_ms);
    if (!tach_read.status.ok()) {
      return {tach_read.status};
    }
    record.tach_value = tach_read.available ? tach_read.value_number : std::nullopt;

    bool fault_just_cleared = false;
    if (fault_read.available && fault_read.value_bool) {
      if (!record.runtime_fault) {
        record_history(
            record.descriptor.id,
            MotorHistoryEventType::fault_entered,
            now_ms,
            "signal_registry",
            "fault_signal_active");
      }
      record.runtime_fault = true;
      record.fault_reason = "fault_signal_active";
      record.requested_run = false;
      record.requested_speed_percent = 0.0;
      record.effective_run = false;
      record.effective_speed_percent = 0.0;
      record.runtime_state = MotorRuntimeState::fault;
      record.last_reason = record.fault_reason;

      if (record.descriptor.fault_clears_output) {
        const auto clear_result = clear_all_outputs(record, now_ms, actuator_dirty);
        if (!clear_result.ok()) {
          return clear_result;
        }
      } else {
        const auto clear_result = clear_motion_outputs(record, now_ms, actuator_dirty);
        if (!clear_result.ok()) {
          return clear_result;
        }
        const auto direction_result = apply_direction_output(record, now_ms, actuator_dirty);
        if (!direction_result.ok()) {
          return direction_result;
        }
      }

      increment_update_counter(record);
      record.last_tick_ms = now_ms;
      const auto publish_result = publish_motor_signals(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    if (record.runtime_fault) {
      record.runtime_fault = false;
      record.fault_reason.clear();
      record.requested_run = false;
      record.requested_speed_percent = 0.0;
      record.effective_run = false;
      record.effective_speed_percent = 0.0;
      record.runtime_state = MotorRuntimeState::stopped;
      record.last_reason = "fault_cleared_requires_fresh_run_command";
      record_history(
          record.descriptor.id,
          MotorHistoryEventType::fault_cleared,
          now_ms,
          "signal_registry",
          record.last_reason);
      fault_just_cleared = true;
    }

    if (!record.descriptor.enabled) {
      record.requested_run = false;
      record.requested_speed_percent = 0.0;
      record.effective_run = false;
      record.effective_speed_percent = 0.0;
      record.runtime_state = MotorRuntimeState::stopped;
      record.last_reason = "motor_disabled";
      const auto clear_result = clear_motion_outputs(record, now_ms, actuator_dirty);
      if (!clear_result.ok()) {
        return clear_result;
      }
      const auto direction_result = apply_direction_output(record, now_ms, actuator_dirty);
      if (!direction_result.ok()) {
        return direction_result;
      }

      increment_update_counter(record);
      record.last_tick_ms = now_ms;
      const auto publish_result = publish_motor_signals(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    if (!record.requested_run) {
      if (!speed_is_zero(record.effective_speed_percent)) {
        const double next_speed = ramp_toward(
            record.effective_speed_percent,
            0.0,
            record.descriptor.ramp_down_percent_per_sec,
            delta_ms);
        record.effective_speed_percent = speed_is_zero(next_speed) ? 0.0 : next_speed;
        record.effective_run = !speed_is_zero(record.effective_speed_percent);
        record.runtime_state =
            record.effective_run ? MotorRuntimeState::ramping_down : MotorRuntimeState::stopped;
        if (record.effective_run) {
          record.last_reason = "stop_ramp_down";
        } else if (!fault_just_cleared) {
          record.last_reason = "stopped";
        }
      } else {
        record.effective_speed_percent = 0.0;
        record.effective_run = false;
        record.runtime_state = MotorRuntimeState::stopped;
        if (record.requested_direction != record.effective_direction) {
          record.effective_direction = record.requested_direction;
          record.last_reason = "direction_changed_while_stopped";
        } else if (!fault_just_cleared) {
          record.last_reason = "stopped";
        }
      }
    } else if (record.requested_direction != record.effective_direction) {
      if (!speed_is_zero(record.effective_speed_percent)) {
        const double next_speed = ramp_toward(
            record.effective_speed_percent,
            0.0,
            record.descriptor.ramp_down_percent_per_sec,
            delta_ms);
        record.effective_speed_percent = speed_is_zero(next_speed) ? 0.0 : next_speed;
        record.effective_run = !speed_is_zero(record.effective_speed_percent);
        if (record.effective_run) {
          record.runtime_state = MotorRuntimeState::ramping_down;
          record.last_reason = "reverse_ramp_down";
        } else {
          record.runtime_state = MotorRuntimeState::reversing_delay;
          record.phase_started_ms = now_ms;
          record.last_reason = "reverse_delay";
        }
      } else {
        if (record.runtime_state != MotorRuntimeState::reversing_delay && !moving_before) {
          record.effective_direction = record.requested_direction;
          record.phase_started_ms = now_ms;
          record.start_count += 1U;
          record_history(
              record.descriptor.id,
              MotorHistoryEventType::started,
              now_ms,
              record.requested_source,
              "start_after_stopped_direction_change",
              requested_speed);
          if (has_start_boost(record.descriptor)) {
            record.runtime_state = MotorRuntimeState::starting_boost;
            record.effective_run = true;
            record.effective_speed_percent =
                clamp_percent(*record.descriptor.start_boost_percent, 0.0, record.descriptor.max_speed_percent);
            record.last_reason = "start_boost";
          } else {
            record.runtime_state = MotorRuntimeState::ramping_up;
            record.effective_run = true;
            record.effective_speed_percent = launch_speed(record.descriptor, requested_speed);
            record.last_reason = "restart_ramp_up";
            if (speed_is_zero(record.effective_speed_percent - requested_speed)) {
              record.runtime_state = MotorRuntimeState::running;
            }
          }
        } else {
          if (record.runtime_state != MotorRuntimeState::reversing_delay) {
            record.runtime_state = MotorRuntimeState::reversing_delay;
            record.phase_started_ms = now_ms;
          }

          const MotorTimestampMs reverse_elapsed =
              now_ms >= record.phase_started_ms ? (now_ms - record.phase_started_ms) : 0U;
          if (reverse_elapsed < record.descriptor.reverse_delay_ms) {
            record.effective_run = false;
            record.effective_speed_percent = 0.0;
            record.runtime_state = MotorRuntimeState::reversing_delay;
            record.last_reason = "reverse_delay";
          } else {
            record.effective_direction = record.requested_direction;
            record.phase_started_ms = now_ms;
            record.start_count += 1U;
            record_history(
                record.descriptor.id,
                MotorHistoryEventType::started,
                now_ms,
                record.requested_source,
                "reverse_restart_started",
                requested_speed);
            if (has_start_boost(record.descriptor)) {
              record.runtime_state = MotorRuntimeState::starting_boost;
              record.effective_run = true;
              record.effective_speed_percent =
                  clamp_percent(*record.descriptor.start_boost_percent, 0.0, record.descriptor.max_speed_percent);
              record.last_reason = "start_boost";
            } else {
              record.runtime_state = MotorRuntimeState::ramping_up;
              record.effective_run = true;
              record.effective_speed_percent = launch_speed(record.descriptor, requested_speed);
              record.last_reason = "restart_ramp_up";
              if (speed_is_zero(record.effective_speed_percent - requested_speed)) {
                record.runtime_state = MotorRuntimeState::running;
              }
            }
          }
        }
      }
    } else if (record.runtime_state == MotorRuntimeState::starting_boost &&
               has_start_boost(record.descriptor) &&
               (now_ms - record.phase_started_ms) < *record.descriptor.start_boost_ms) {
      record.effective_run = true;
      record.effective_speed_percent =
          clamp_percent(*record.descriptor.start_boost_percent, 0.0, record.descriptor.max_speed_percent);
      record.last_reason = "start_boost";
    } else {
      if (!record.effective_run && speed_is_zero(record.effective_speed_percent)) {
        record.start_count += 1U;
        record.phase_started_ms = now_ms;
        record_history(
            record.descriptor.id,
            MotorHistoryEventType::started,
            now_ms,
            record.requested_source,
            "start_requested",
            requested_speed);
        if (has_start_boost(record.descriptor)) {
          record.runtime_state = MotorRuntimeState::starting_boost;
          record.effective_run = true;
          record.effective_speed_percent =
              clamp_percent(*record.descriptor.start_boost_percent, 0.0, record.descriptor.max_speed_percent);
          record.last_reason = "start_boost";
        } else {
          record.runtime_state = MotorRuntimeState::ramping_up;
          record.effective_run = true;
          record.effective_speed_percent = launch_speed(record.descriptor, requested_speed);
          record.last_reason = "start_ramp_up";
          if (speed_is_zero(record.effective_speed_percent - requested_speed)) {
            record.runtime_state = MotorRuntimeState::running;
          }
        }
      } else {
        if (record.runtime_state == MotorRuntimeState::starting_boost && has_start_boost(record.descriptor)) {
          record.runtime_state = MotorRuntimeState::running;
        }

        const double next_speed = record.effective_speed_percent < requested_speed
                                      ? ramp_toward(
                                            record.effective_speed_percent,
                                            requested_speed,
                                            record.descriptor.ramp_up_percent_per_sec,
                                            delta_ms)
                                      : ramp_toward(
                                            record.effective_speed_percent,
                                            requested_speed,
                                            record.descriptor.ramp_down_percent_per_sec,
                                            delta_ms);
        record.effective_speed_percent = next_speed;
        record.effective_run = true;
        if (speed_is_zero(record.effective_speed_percent - requested_speed)) {
          record.effective_speed_percent = requested_speed;
          record.runtime_state = MotorRuntimeState::running;
          record.last_reason = "running";
        } else if (record.effective_speed_percent < requested_speed) {
          record.runtime_state = MotorRuntimeState::ramping_up;
          record.last_reason = "speed_ramping_up";
        } else {
          record.runtime_state = MotorRuntimeState::ramping_down;
          record.last_reason = "speed_ramping_down";
        }
      }
    }

    if (record.effective_run && !speed_is_zero(record.effective_speed_percent)) {
      const auto output_result = apply_run_outputs(record, now_ms, actuator_dirty);
      if (!output_result.ok()) {
        return output_result;
      }
    } else {
      record.effective_speed_percent = 0.0;
      record.effective_run = false;
      const auto clear_result = clear_motion_outputs(record, now_ms, actuator_dirty);
      if (!clear_result.ok()) {
        return clear_result;
      }
      const auto direction_result = apply_direction_output(record, now_ms, actuator_dirty);
      if (!direction_result.ok()) {
        return direction_result;
      }
    }

    if (direction_before != record.effective_direction) {
      record_history(
          record.descriptor.id,
          MotorHistoryEventType::direction_changed,
          now_ms,
          record.requested_source,
          record.last_reason);
    }

    if (moving_before && !(record.effective_run || !speed_is_zero(record.effective_speed_percent))) {
      record_history(
          record.descriptor.id,
          MotorHistoryEventType::stopped,
          now_ms,
          record.requested_source,
          record.runtime_state == MotorRuntimeState::reversing_delay ? "stopped_for_reverse" : record.last_reason);
    }

    increment_update_counter(record);
    record.last_tick_ms = now_ms;
    const auto publish_result = publish_motor_signals(record, now_ms);
    if (!publish_result.ok()) {
      return publish_result;
    }
  }

  if (actuator_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (!evaluate_result.ok()) {
      return {wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after motor tick")};
    }
  }

  return {MotorStatus::success()};
}

MotorResult<MotorSnapshot> MotorService::get_snapshot(const std::string& id) const {
  MotorResult<MotorSnapshot> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = MotorStatus::error(MotorErrorCode::motor_not_found, "Motor '" + id + "' is not registered.");
    return result;
  }

  result.status = MotorStatus::success();
  result.value = build_snapshot(*record);
  return result;
}

std::vector<MotorSnapshot> MotorService::list_snapshots() const {
  std::vector<MotorSnapshot> snapshots;
  snapshots.reserve(motor_order_.size());
  for (const auto& id : motor_order_) {
    snapshots.push_back(build_snapshot(motors_by_id_.at(id)));
  }
  return snapshots;
}

MotorResult<std::vector<MotorHistoryEntry>> MotorService::read_history(const std::optional<std::string> id) const {
  MotorResult<std::vector<MotorHistoryEntry>> result;
  if (id.has_value() && !has_motor(*id)) {
    result.status = MotorStatus::error(MotorErrorCode::motor_not_found, "Motor '" + *id + "' is not registered.");
    return result;
  }

  const auto entries = history_.read();
  if (!id.has_value()) {
    result.status = MotorStatus::success();
    result.value = entries;
    return result;
  }

  std::vector<MotorHistoryEntry> filtered;
  for (const auto& entry : entries) {
    if (entry.motor_id == *id) {
      filtered.push_back(entry);
    }
  }

  result.status = MotorStatus::success();
  result.value = std::move(filtered);
  return result;
}

void MotorService::clear_history() {
  history_.clear();
}

MotorService::MotorRecord* MotorService::find_record(const std::string& id) {
  const auto it = motors_by_id_.find(id);
  return it == motors_by_id_.end() ? nullptr : &it->second;
}

const MotorService::MotorRecord* MotorService::find_record(const std::string& id) const {
  const auto it = motors_by_id_.find(id);
  return it == motors_by_id_.end() ? nullptr : &it->second;
}

void MotorService::record_history(
    const std::string& motor_id,
    const MotorHistoryEventType event_type,
    const MotorTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const std::optional<double> value) {
  history_.append(MotorHistoryEntry{
      0U,
      motor_id,
      event_type,
      now_ms,
      source,
      reason,
      value,
  });
}

}  // namespace controller::actuators
