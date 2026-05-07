#include "pid/pid_service.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <limits>
#include <string>
#include <utility>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::pid {

namespace {

using controller::actuators::ActuatorPriority;
using controller::actuators::ActuatorRequest;
using controller::actuators::ActuatorTargetKind;
using controller::actuators::PwmActuatorCommand;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalErrorCode;
using controller::signals::SignalType;
using controller::signals::SignalValue;

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](unsigned char ch) {
    return !std::isspace(ch);
  });
}

bool is_finite(const double value) {
  return std::isfinite(value);
}

std::int64_t to_signal_int64(const std::uint64_t value) {
  constexpr auto max_value = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

void append_issue(
    PidServiceValidationResult& result,
    const PidServiceErrorCode code,
    const std::string& field,
    const std::string& message) {
  result.issues.push_back(PidServiceValidationIssue{code, field, message});
  if (result.status.ok()) {
    result.status = PidServiceStatus::error(code, message);
  }
}

std::string service_owner(const std::string& pid_id) {
  return "pid:" + pid_id;
}

std::string pid_base_path(const std::string& pid_id) {
  return "pid." + pid_id;
}

SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type,
    const std::string& unit = "") {
  return SignalDescriptor{
      path,
      name,
      "PID service runtime signal",
      type,
      unit,
      "pid_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

PidServiceStatus wrap_signal_publish_error(
    const controller::signals::SignalStatus& status,
    const std::string& context) {
  return PidServiceStatus::error(PidServiceErrorCode::pid_service_signal_publish_failed, context + ": " + status.message);
}

PidServiceStatus wrap_actuator_error(
    const controller::actuators::ActuatorStatus& status,
    const std::string& context) {
  return PidServiceStatus::error(PidServiceErrorCode::pid_service_output_request_failed, context + ": " + status.message);
}

PidServiceStatus wrap_core_error(const PidStatus& status, const std::string& context) {
  return PidServiceStatus::error(PidServiceErrorCode::pid_service_invalid_argument, context + ": " + status.message);
}

PidServiceStatus register_signal_if_missing(
    controller::signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const PidServiceTimestampMs now_ms) {
  if (registry.has_signal(descriptor.path)) {
    return PidServiceStatus::success();
  }

  const auto result = registry.register_signal(descriptor, initial_value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_publish_error(result.status, "Failed to register signal '" + descriptor.path + "'");
  }
  return PidServiceStatus::success();
}

PidServiceStatus update_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const SignalValue& value,
    const PidServiceTimestampMs now_ms) {
  const auto result = registry.update_signal(path, value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_publish_error(result.status, "Failed to update signal '" + path + "'");
  }
  return PidServiceStatus::success();
}

PidServiceMode mode_from_core_mode(const PidMode mode) {
  switch (mode) {
    case PidMode::manual:
      return PidServiceMode::manual;
    case PidMode::auto_mode:
      return PidServiceMode::auto_mode;
    case PidMode::hold:
      return PidServiceMode::hold;
  }

  return PidServiceMode::manual;
}

bool is_supported_requested_mode(const PidServiceMode mode) {
  return mode == PidServiceMode::disabled || mode == PidServiceMode::manual || mode == PidServiceMode::auto_mode ||
         mode == PidServiceMode::hold;
}

bool is_active_mode(const PidServiceMode mode) {
  return mode == PidServiceMode::manual || mode == PidServiceMode::auto_mode || mode == PidServiceMode::hold;
}

}  // namespace

const char* to_string(const PidServiceMode mode) {
  switch (mode) {
    case PidServiceMode::disabled:
      return "disabled";
    case PidServiceMode::manual:
      return "manual";
    case PidServiceMode::auto_mode:
      return "auto";
    case PidServiceMode::hold:
      return "hold";
    case PidServiceMode::fault:
      return "fault";
  }

  return "unknown";
}

const char* to_string(const PidSetpointSourceKind kind) {
  switch (kind) {
    case PidSetpointSourceKind::constant:
      return "constant";
    case PidSetpointSourceKind::signal:
      return "signal";
  }

  return "unknown";
}

const char* to_string(const PidServiceHistoryEventType event_type) {
  switch (event_type) {
    case PidServiceHistoryEventType::registered:
      return "registered";
    case PidServiceHistoryEventType::mode_changed:
      return "mode_changed";
    case PidServiceHistoryEventType::enabled:
      return "enabled";
    case PidServiceHistoryEventType::disabled:
      return "disabled";
    case PidServiceHistoryEventType::fault_entered:
      return "fault_entered";
    case PidServiceHistoryEventType::fault_cleared:
      return "fault_cleared";
    case PidServiceHistoryEventType::setpoint_changed:
      return "setpoint_changed";
    case PidServiceHistoryEventType::manual_output_changed:
      return "manual_output_changed";
    case PidServiceHistoryEventType::integral_reset:
      return "integral_reset";
    case PidServiceHistoryEventType::output_requested:
      return "output_requested";
    case PidServiceHistoryEventType::output_cleared:
      return "output_cleared";
  }

  return "unknown";
}

const char* to_string(const PidServiceErrorCode code) {
  switch (code) {
    case PidServiceErrorCode::ok:
      return "OK";
    case PidServiceErrorCode::pid_service_already_registered:
      return "PID_SERVICE_ALREADY_REGISTERED";
    case PidServiceErrorCode::pid_service_not_found:
      return "PID_SERVICE_NOT_FOUND";
    case PidServiceErrorCode::pid_service_invalid_descriptor:
      return "PID_SERVICE_INVALID_DESCRIPTOR";
    case PidServiceErrorCode::pid_service_invalid_argument:
      return "PID_SERVICE_INVALID_ARGUMENT";
    case PidServiceErrorCode::pid_service_unsupported_target:
      return "PID_SERVICE_UNSUPPORTED_TARGET";
    case PidServiceErrorCode::pid_service_signal_error:
      return "PID_SERVICE_SIGNAL_ERROR";
    case PidServiceErrorCode::pid_service_signal_type_error:
      return "PID_SERVICE_SIGNAL_TYPE_ERROR";
    case PidServiceErrorCode::pid_service_signal_not_found:
      return "PID_SERVICE_SIGNAL_NOT_FOUND";
    case PidServiceErrorCode::pid_service_fault_active:
      return "PID_SERVICE_FAULT_ACTIVE";
    case PidServiceErrorCode::pid_service_output_request_failed:
      return "PID_SERVICE_OUTPUT_REQUEST_FAILED";
    case PidServiceErrorCode::pid_service_signal_publish_failed:
      return "PID_SERVICE_SIGNAL_PUBLISH_FAILED";
  }

  return "PID_SERVICE_UNKNOWN";
}

PidService::PidService(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    const std::size_t history_capacity)
    : signal_registry_(signal_registry), actuator_manager_(actuator_manager), history_(history_capacity) {}

PidServiceValidationResult PidService::validate_descriptor(
    const PidServiceDescriptor& descriptor,
    const std::optional<std::string> existing_pid_id) const {
  PidServiceValidationResult result;

  if (!has_text(descriptor.id)) {
    append_issue(result, PidServiceErrorCode::pid_service_invalid_descriptor, "pid.id", "PID service id must not be empty.");
  } else if (!controller::signals::is_valid_signal_path(descriptor.id)) {
    append_issue(
        result,
        PidServiceErrorCode::pid_service_invalid_descriptor,
        "pid.id",
        "PID service id '" + descriptor.id + "' must be a valid dot-separated signal-style id.");
  } else if (has_pid(descriptor.id) && (!existing_pid_id.has_value() || *existing_pid_id != descriptor.id)) {
    append_issue(
        result,
        PidServiceErrorCode::pid_service_already_registered,
        "pid.id",
        "PID service '" + descriptor.id + "' is already registered.");
  }

  if (!has_text(descriptor.name)) {
    append_issue(result, PidServiceErrorCode::pid_service_invalid_descriptor, "pid.name", "PID service name must not be empty.");
  }

  PidConfig core_config = descriptor.core_config;
  core_config.id = descriptor.id;
  core_config.name = descriptor.name;
  const auto core_validation = validate_config(core_config);
  if (!core_validation.ok()) {
    append_issue(
        result,
        PidServiceErrorCode::pid_service_invalid_descriptor,
        "pid.core_config",
        core_validation.status.message);
  }

  if (!has_text(descriptor.pv_signal_path)) {
    append_issue(
        result,
        PidServiceErrorCode::pid_service_invalid_descriptor,
        "pid.pv_signal_path",
        "pv_signal_path must not be empty.");
  }

  if (descriptor.setpoint_source_kind == PidSetpointSourceKind::constant) {
    if (!descriptor.constant_setpoint.has_value() || !is_finite(*descriptor.constant_setpoint)) {
      append_issue(
          result,
          PidServiceErrorCode::pid_service_invalid_descriptor,
          "pid.constant_setpoint",
          "constant_setpoint must be finite when the setpoint source kind is constant.");
    }
  } else if (!descriptor.setpoint_signal_path.has_value() || !has_text(*descriptor.setpoint_signal_path)) {
    append_issue(
        result,
        PidServiceErrorCode::pid_service_invalid_descriptor,
        "pid.setpoint_signal_path",
        "setpoint_signal_path must not be empty when the setpoint source kind is signal.");
  }

  if (!has_text(descriptor.output_target_id)) {
    append_issue(
        result,
        PidServiceErrorCode::pid_service_invalid_descriptor,
        "pid.output_target_id",
        "output_target_id must not be empty.");
  }

  if (descriptor.output_target_kind != ActuatorTargetKind::pwm) {
    append_issue(
        result,
        PidServiceErrorCode::pid_service_unsupported_target,
        "pid.output_target_kind",
        "Stage 17 PIDService supports PWM targets only.");
  }

  if (has_text(descriptor.output_target_id)) {
    if (!actuator_manager_.has_target(descriptor.output_target_id)) {
      append_issue(
          result,
          PidServiceErrorCode::pid_service_invalid_descriptor,
          "pid.output_target_id",
          "Actuator target '" + descriptor.output_target_id + "' is not registered.");
    } else {
      const auto target_snapshot = actuator_manager_.get_snapshot(descriptor.output_target_id);
      if (!target_snapshot.ok() || target_snapshot.value->kind != ActuatorTargetKind::pwm) {
        append_issue(
            result,
            PidServiceErrorCode::pid_service_unsupported_target,
            "pid.output_target_id",
            "Actuator target '" + descriptor.output_target_id + "' is not a PWM target.");
      }
    }
  }

  if (result.status.ok()) {
    result.status = PidServiceStatus::success();
  }
  return result;
}

PidServiceOperationResult PidService::register_pid(const PidServiceDescriptor& descriptor) {
  if (pids_by_id_.count(descriptor.id) != 0U) {
    return {PidServiceStatus::error(
        PidServiceErrorCode::pid_service_already_registered,
        "PID service '" + descriptor.id + "' is already registered.")};
  }

  const auto validation = validate_descriptor(descriptor);
  if (!validation.ok()) {
    return {validation.status.ok()
                ? PidServiceStatus::error(
                      PidServiceErrorCode::pid_service_invalid_descriptor,
                      "PID service descriptor validation failed.")
                : validation.status};
  }

  PidRecord record;
  record.descriptor = descriptor;
  record.descriptor.core_config.id = descriptor.id;
  record.descriptor.core_config.name = descriptor.name;
  record.core = PidCore(record.descriptor.core_config);
  record.requested_mode = mode_from_core_mode(record.descriptor.core_config.mode);
  record.effective_mode = descriptor.enabled ? record.requested_mode : PidServiceMode::disabled;

  if (record.descriptor.constant_setpoint.has_value()) {
    const auto setpoint_result = record.core.set_setpoint(*record.descriptor.constant_setpoint);
    if (!setpoint_result.ok()) {
      return {wrap_core_error(setpoint_result.status, "Failed to initialize constant setpoint")};
    }
    record.last_sp = *record.descriptor.constant_setpoint;
  }

  const auto ensure_global = ensure_global_signals_registered();
  if (!ensure_global.ok()) {
    return ensure_global;
  }

  const auto ensure_pid = ensure_pid_signals_registered(record.descriptor);
  if (!ensure_pid.ok()) {
    return ensure_pid;
  }

  pid_order_.push_back(record.descriptor.id);
  pids_by_id_.emplace(record.descriptor.id, std::move(record));

  record_history(descriptor.id, PidServiceHistoryEventType::registered, 0U, "pid_service", "registered");
  const auto publish_result = publish_runtime_state(pids_by_id_.at(descriptor.id), 0U);
  if (!publish_result.ok()) {
    pids_by_id_.erase(descriptor.id);
    pid_order_.pop_back();
    return publish_result;
  }

  return {PidServiceStatus::success()};
}

PidServiceOperationResult PidService::remove_pid(const std::string& id, const PidServiceTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.")};
  }

  bool actuator_dirty = false;
  const auto clear_result =
      clear_owner_output(*record, now_ms, "removed_cleared_output", record->command_active, actuator_dirty);
  if (!clear_result.ok()) {
    return clear_result;
  }

  if (actuator_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (!evaluate_result.ok()) {
      return {wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after PID remove")};
    }
  }

  pid_order_.erase(std::remove(pid_order_.begin(), pid_order_.end(), id), pid_order_.end());
  pids_by_id_.erase(id);
  return publish_global_signals(now_ms);
}

bool PidService::has_pid(const std::string& id) const {
  return pids_by_id_.count(id) != 0U;
}

PidServiceResult<PidServiceDescriptor> PidService::get_descriptor(const std::string& id) const {
  PidServiceResult<PidServiceDescriptor> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.");
    return result;
  }

  result.status = PidServiceStatus::success();
  result.value = record->descriptor;
  return result;
}

std::vector<PidServiceDescriptor> PidService::list_descriptors() const {
  std::vector<PidServiceDescriptor> descriptors;
  descriptors.reserve(pid_order_.size());
  for (const auto& id : pid_order_) {
    descriptors.push_back(pids_by_id_.at(id).descriptor);
  }
  return descriptors;
}

PidService::SignalResolution PidService::resolve_numeric_signal(
    const std::string& path,
    const PidServiceTimestampMs now_ms,
    const bool stale_as_fault,
    const bool invalid_as_fault,
    const std::string& source_name) const {
  SignalResolution resolution;
  const auto signal_result = signal_registry_.read_signal(path, now_ms);
  if (!signal_result.ok()) {
    resolution.fault = true;
    resolution.code = signal_result.status.code == SignalErrorCode::signal_not_found
                          ? PidServiceErrorCode::pid_service_signal_not_found
                          : PidServiceErrorCode::pid_service_signal_error;
    resolution.reason = source_name + " source '" + path + "' read failed: " + signal_result.status.message;
    return resolution;
  }

  const auto& snapshot = *signal_result.value;
  if (!snapshot.value.has_value()) {
    resolution.fault = true;
    resolution.code = PidServiceErrorCode::pid_service_signal_error;
    resolution.reason = source_name + " source '" + path + "' has no value.";
    return resolution;
  }

  if (snapshot.fault) {
    resolution.fault = true;
    resolution.code = PidServiceErrorCode::pid_service_fault_active;
    resolution.reason = source_name + " source '" + path + "' is faulted.";
    return resolution;
  }
  if (!snapshot.valid && invalid_as_fault) {
    resolution.fault = true;
    resolution.code = PidServiceErrorCode::pid_service_signal_error;
    resolution.reason = source_name + " source '" + path + "' is marked invalid.";
    return resolution;
  }
  if (snapshot.stale && stale_as_fault) {
    resolution.fault = true;
    resolution.code = PidServiceErrorCode::pid_service_signal_error;
    resolution.reason = source_name + " source '" + path + "' is stale.";
    return resolution;
  }

  if (const auto* int_value = std::get_if<std::int64_t>(&*snapshot.value)) {
    resolution.ok = true;
    resolution.value = static_cast<double>(*int_value);
    return resolution;
  }
  if (const auto* double_value = std::get_if<double>(&*snapshot.value)) {
    resolution.ok = true;
    resolution.value = *double_value;
    return resolution;
  }

  resolution.fault = true;
  resolution.code = PidServiceErrorCode::pid_service_signal_type_error;
  resolution.reason = source_name + " source '" + path + "' must be numeric.";
  return resolution;
}

PidServiceMode PidService::compute_effective_mode(const PidRecord& record) const {
  if (!record.descriptor.enabled || record.requested_mode == PidServiceMode::disabled) {
    return PidServiceMode::disabled;
  }
  if (record.runtime_fault) {
    return PidServiceMode::fault;
  }
  return record.requested_mode;
}

PidServiceSnapshot PidService::build_snapshot(const PidRecord& record) const {
  const auto core_snapshot = record.core.get_snapshot();

  PidServiceSnapshot snapshot;
  snapshot.id = record.descriptor.id;
  snapshot.name = record.descriptor.name;
  snapshot.enabled = record.descriptor.enabled;
  snapshot.requested_mode = record.requested_mode;
  snapshot.effective_mode = record.effective_mode;
  snapshot.fault = record.runtime_fault;
  snapshot.fault_reason = record.runtime_fault_reason;
  snapshot.pv_signal_path = record.descriptor.pv_signal_path;
  snapshot.sp_source_kind = record.descriptor.setpoint_source_kind;
  snapshot.sp_signal_path = record.descriptor.setpoint_signal_path;
  snapshot.output_target_id = record.descriptor.output_target_id;
  snapshot.pv = record.last_pv;
  snapshot.sp = record.last_sp;
  snapshot.output = record.command_active ? record.commanded_output : 0.0;
  snapshot.manual_output = core_snapshot.manual_output;
  snapshot.raw_error = core_snapshot.raw_error;
  snapshot.effective_error = core_snapshot.effective_error;
  snapshot.p_term = core_snapshot.p_term;
  snapshot.i_term = core_snapshot.i_term;
  snapshot.d_term = core_snapshot.d_term;
  snapshot.saturated_high = core_snapshot.saturated_high;
  snapshot.saturated_low = core_snapshot.saturated_low;
  snapshot.updated = record.updated;
  snapshot.last_compute_ms = core_snapshot.last_compute_ms;
  snapshot.update_counter = core_snapshot.update_counter;
  return snapshot;
}

PidServiceOperationResult PidService::ensure_global_signals_registered() {
  if (global_signals_registered_) {
    return {PidServiceStatus::success()};
  }

  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor("pid.any_active", "PID any active", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor("pid.active_count", "PID active count", SignalType::int64),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return {status};
  }

  global_signals_registered_ = true;
  return {PidServiceStatus::success()};
}

PidServiceOperationResult PidService::ensure_pid_signals_registered(const PidServiceDescriptor& descriptor) {
  if (!descriptor.publish_signals) {
    return {PidServiceStatus::success()};
  }

  const auto base = pid_base_path(descriptor.id);
  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".enabled", descriptor.name + " enabled", SignalType::boolean),
      SignalValue{descriptor.enabled},
      0U);
  if (!status.ok()) {
    return {status};
  }

  const std::vector<SignalDescriptor> descriptors{
      make_signal_descriptor(base + ".requested_mode", descriptor.name + " requested mode", SignalType::string),
      make_signal_descriptor(base + ".effective_mode", descriptor.name + " effective mode", SignalType::string),
      make_signal_descriptor(base + ".fault", descriptor.name + " fault", SignalType::boolean),
      make_signal_descriptor(base + ".fault_reason", descriptor.name + " fault reason", SignalType::string),
      make_signal_descriptor(base + ".pv", descriptor.name + " pv", SignalType::float64),
      make_signal_descriptor(base + ".sp", descriptor.name + " sp", SignalType::float64),
      make_signal_descriptor(base + ".raw_error", descriptor.name + " raw error", SignalType::float64),
      make_signal_descriptor(base + ".effective_error", descriptor.name + " effective error", SignalType::float64),
      make_signal_descriptor(base + ".output", descriptor.name + " output", SignalType::float64),
      make_signal_descriptor(base + ".manual_output", descriptor.name + " manual output", SignalType::float64),
      make_signal_descriptor(base + ".p_term", descriptor.name + " p term", SignalType::float64),
      make_signal_descriptor(base + ".i_term", descriptor.name + " i term", SignalType::float64),
      make_signal_descriptor(base + ".d_term", descriptor.name + " d term", SignalType::float64),
      make_signal_descriptor(base + ".saturated_high", descriptor.name + " saturated high", SignalType::boolean),
      make_signal_descriptor(base + ".saturated_low", descriptor.name + " saturated low", SignalType::boolean),
      make_signal_descriptor(base + ".updated", descriptor.name + " updated", SignalType::boolean),
      make_signal_descriptor(base + ".last_compute_ms", descriptor.name + " last compute", SignalType::int64, "ms"),
  };

  for (const auto& signal_descriptor : descriptors) {
    SignalValue initial_value = SignalValue{0.0};
    if (signal_descriptor.type == SignalType::boolean) {
      initial_value = SignalValue{false};
    } else if (signal_descriptor.type == SignalType::string) {
      initial_value = SignalValue{std::string{""}};
    } else if (signal_descriptor.type == SignalType::int64) {
      initial_value = SignalValue{std::int64_t{0}};
    }

    status = register_signal_if_missing(signal_registry_, signal_descriptor, initial_value, 0U);
    if (!status.ok()) {
      return {status};
    }
  }

  return {PidServiceStatus::success()};
}

PidServiceOperationResult PidService::publish_pid_signals(const PidRecord& record, const PidServiceTimestampMs now_ms) {
  if (!record.descriptor.publish_signals) {
    return {PidServiceStatus::success()};
  }

  const auto snapshot = build_snapshot(record);
  const auto base = pid_base_path(record.descriptor.id);

  auto status = update_signal(signal_registry_, base + ".enabled", SignalValue{snapshot.enabled}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".requested_mode",
      SignalValue{std::string(to_string(snapshot.requested_mode))},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".effective_mode",
      SignalValue{std::string(to_string(snapshot.effective_mode))},
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
  status = update_signal(signal_registry_, base + ".pv", SignalValue{snapshot.pv.value_or(0.0)}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".sp", SignalValue{snapshot.sp.value_or(0.0)}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".raw_error", SignalValue{snapshot.raw_error}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".effective_error", SignalValue{snapshot.effective_error}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".output", SignalValue{snapshot.output}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".manual_output", SignalValue{snapshot.manual_output}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".p_term", SignalValue{snapshot.p_term}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".i_term", SignalValue{snapshot.i_term}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".d_term", SignalValue{snapshot.d_term}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".saturated_high", SignalValue{snapshot.saturated_high}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".saturated_low", SignalValue{snapshot.saturated_low}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".updated", SignalValue{snapshot.updated}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".last_compute_ms",
      SignalValue{to_signal_int64(snapshot.last_compute_ms)},
      now_ms);
  if (!status.ok()) {
    return {status};
  }

  return {PidServiceStatus::success()};
}

PidServiceOperationResult PidService::publish_global_signals(const PidServiceTimestampMs now_ms) {
  const auto ensure_result = ensure_global_signals_registered();
  if (!ensure_result.ok()) {
    return ensure_result;
  }

  std::int64_t active_count = 0;
  for (const auto& id : pid_order_) {
    if (is_active_mode(pids_by_id_.at(id).effective_mode)) {
      ++active_count;
    }
  }

  auto status = update_signal(signal_registry_, "pid.any_active", SignalValue{active_count > 0}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, "pid.active_count", SignalValue{active_count}, now_ms);
  if (!status.ok()) {
    return {status};
  }

  return {PidServiceStatus::success()};
}

PidServiceOperationResult PidService::publish_runtime_state(const PidRecord& record, const PidServiceTimestampMs now_ms) {
  const auto per_pid_result = publish_pid_signals(record, now_ms);
  if (!per_pid_result.ok()) {
    return per_pid_result;
  }

  return publish_global_signals(now_ms);
}

PidServiceOperationResult PidService::clear_owner_output(
    PidRecord& record,
    const PidServiceTimestampMs now_ms,
    const std::string& reason,
    const bool record_history_entry,
    bool& actuator_dirty) {
  const auto clear_result = actuator_manager_.clear_requests_for_owner(service_owner(record.descriptor.id));
  if (!clear_result.ok()) {
    return {wrap_actuator_error(
        clear_result.status,
        "Failed to clear PID owner '" + service_owner(record.descriptor.id) + "'")};
  }

  record.command_active = false;
  record.commanded_output = 0.0;
  record.updated = false;
  actuator_dirty = true;

  if (record_history_entry) {
    record_history(
        record.descriptor.id,
        PidServiceHistoryEventType::output_cleared,
        now_ms,
        service_owner(record.descriptor.id),
        reason);
  }

  return {PidServiceStatus::success()};
}

PidServiceOperationResult PidService::submit_pwm_output(
    PidRecord& record,
    const double output,
    const PidServiceTimestampMs now_ms,
    const std::string& reason,
    bool& actuator_dirty) {
  const auto submit_result = actuator_manager_.submit_request(ActuatorRequest{
      record.descriptor.output_target_id,
      service_owner(record.descriptor.id),
      reason,
      ActuatorPriority::pid,
      now_ms,
      std::nullopt,
      PwmActuatorCommand{output, true},
  });
  if (!submit_result.ok()) {
    return {wrap_actuator_error(
        submit_result.status,
        "Failed to submit PWM request for '" + record.descriptor.output_target_id + "'")};
  }

  record.command_active = true;
  record.commanded_output = output;
  actuator_dirty = true;
  record_history(
      record.descriptor.id,
      PidServiceHistoryEventType::output_requested,
      now_ms,
      service_owner(record.descriptor.id),
      reason,
      output);
  return {PidServiceStatus::success()};
}

PidServiceOperationResult PidService::tick(const PidServiceTimestampMs now_ms) {
  bool actuator_dirty = false;

  for (const auto& id : pid_order_) {
    auto& record = pids_by_id_.at(id);

    if (!record.descriptor.enabled || record.requested_mode == PidServiceMode::disabled) {
      if (record.core.get_mode() != PidMode::hold) {
        const auto hold_result = record.core.set_mode(PidMode::hold, now_ms, record.last_pv);
        if (!hold_result.ok()) {
          return {wrap_core_error(hold_result.status, "Failed to transition PID '" + id + "' into hold before disable")};
        }
      }

      record.effective_mode = PidServiceMode::disabled;
      const auto clear_result =
          clear_owner_output(record, now_ms, "disabled_cleared_output", record.command_active, actuator_dirty);
      if (!clear_result.ok()) {
        return clear_result;
      }

      const auto publish_result = publish_runtime_state(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    const auto pv_result = resolve_numeric_signal(
        record.descriptor.pv_signal_path,
        now_ms,
        record.descriptor.stale_as_fault,
        record.descriptor.invalid_as_fault,
        "PV");
    if (pv_result.ok && pv_result.value.has_value()) {
      record.last_pv = *pv_result.value;
    }

    SignalResolution sp_result;
    if (record.descriptor.setpoint_source_kind == PidSetpointSourceKind::constant) {
      sp_result.ok = true;
      sp_result.value = *record.descriptor.constant_setpoint;
      record.last_sp = *record.descriptor.constant_setpoint;
    } else {
      sp_result = resolve_numeric_signal(
          *record.descriptor.setpoint_signal_path,
          now_ms,
          record.descriptor.stale_as_fault,
          record.descriptor.invalid_as_fault,
          "SP");
      if (sp_result.ok && sp_result.value.has_value()) {
        record.last_sp = *sp_result.value;
      }
    }

    const bool had_fault = record.runtime_fault;
    if (pv_result.fault || sp_result.fault) {
      record.runtime_fault = true;
      record.runtime_fault_reason = pv_result.fault ? pv_result.reason : sp_result.reason;
    } else {
      record.runtime_fault = false;
      record.runtime_fault_reason.clear();
    }

    if (!had_fault && record.runtime_fault) {
      record_history(
          record.descriptor.id,
          PidServiceHistoryEventType::fault_entered,
          now_ms,
          "signal_registry",
          record.runtime_fault_reason);
    } else if (had_fault && !record.runtime_fault) {
      record_history(
          record.descriptor.id,
          PidServiceHistoryEventType::fault_cleared,
          now_ms,
          "signal_registry",
          "fault_cleared");
    }

    record.effective_mode = compute_effective_mode(record);
    if (record.effective_mode == PidServiceMode::fault) {
      if (record.core.get_mode() != PidMode::hold) {
        const auto hold_result = record.core.set_mode(PidMode::hold, now_ms, record.last_pv);
        if (!hold_result.ok()) {
          return {wrap_core_error(hold_result.status, "Failed to transition PID '" + id + "' into fault hold")};
        }
      }

      if (record.descriptor.fault_clears_output) {
        const auto clear_result =
            clear_owner_output(record, now_ms, "fault_cleared_output", record.command_active, actuator_dirty);
        if (!clear_result.ok()) {
          return clear_result;
        }
      } else {
        record.updated = false;
      }

      const auto publish_result = publish_runtime_state(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    if (!pv_result.ok || !pv_result.value.has_value() || !sp_result.ok || !sp_result.value.has_value()) {
      return {PidServiceStatus::error(
          PidServiceErrorCode::pid_service_signal_error,
          "PID '" + id + "' could not resolve PV/SP sources without entering fault.")};
    }

    const auto setpoint_result = record.core.set_setpoint(*sp_result.value);
    if (!setpoint_result.ok()) {
      return {wrap_core_error(setpoint_result.status, "Failed to set setpoint for PID '" + id + "'")};
    }

    const std::string output_reason =
        "PID '" + record.descriptor.name + "' mode=" + std::string(to_string(record.effective_mode));

    if (record.effective_mode == PidServiceMode::manual) {
      if (record.core.get_mode() != PidMode::manual) {
        const auto mode_result = record.core.set_mode(PidMode::manual, now_ms, *pv_result.value);
        if (!mode_result.ok()) {
          return {wrap_core_error(mode_result.status, "Failed to switch PID '" + id + "' into manual mode")};
        }
      }

      const auto compute_result = record.core.compute(*pv_result.value, now_ms);
      if (!compute_result.ok()) {
        return {wrap_core_error(compute_result.status, "Manual compute failed for PID '" + id + "'")};
      }

      record.updated = true;
      const auto submit_result = submit_pwm_output(record, compute_result.value->output, now_ms, output_reason, actuator_dirty);
      if (!submit_result.ok()) {
        return submit_result;
      }

      const auto publish_result = publish_runtime_state(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    if (record.effective_mode == PidServiceMode::auto_mode) {
      if (record.core.get_mode() != PidMode::auto_mode) {
        const auto mode_result = record.core.set_mode(PidMode::auto_mode, now_ms, *pv_result.value);
        if (!mode_result.ok()) {
          return {wrap_core_error(mode_result.status, "Failed to switch PID '" + id + "' into auto mode")};
        }
      }

      const auto compute_result = record.core.compute(*pv_result.value, now_ms);
      if (compute_result.status.code != PidStatusCode::PID_OK &&
          compute_result.status.code != PidStatusCode::PID_NOT_UPDATED) {
        return {wrap_core_error(compute_result.status, "Auto compute failed for PID '" + id + "'")};
      }

      record.updated = compute_result.status.code == PidStatusCode::PID_OK;
      const double output = compute_result.value.has_value() ? compute_result.value->output : record.core.get_snapshot().output;
      const auto submit_result = submit_pwm_output(record, output, now_ms, output_reason, actuator_dirty);
      if (!submit_result.ok()) {
        return submit_result;
      }

      const auto publish_result = publish_runtime_state(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    if (record.core.get_mode() != PidMode::hold) {
      const auto mode_result = record.core.set_mode(PidMode::hold, now_ms, *pv_result.value);
      if (!mode_result.ok()) {
        return {wrap_core_error(mode_result.status, "Failed to switch PID '" + id + "' into hold mode")};
      }
    }

    record.updated = false;
    if (record.command_active) {
      const auto submit_result = submit_pwm_output(record, record.commanded_output, now_ms, output_reason, actuator_dirty);
      if (!submit_result.ok()) {
        return submit_result;
      }
    }

    const auto publish_result = publish_runtime_state(record, now_ms);
    if (!publish_result.ok()) {
      return publish_result;
    }
  }

  if (actuator_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (!evaluate_result.ok()) {
      return {wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after PID tick")};
    }
  }

  return publish_global_signals(now_ms);
}

PidServiceResult<PidServiceSnapshot> PidService::get_snapshot(const std::string& id) const {
  PidServiceResult<PidServiceSnapshot> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.");
    return result;
  }

  result.status = PidServiceStatus::success();
  result.value = build_snapshot(*record);
  return result;
}

std::vector<PidServiceSnapshot> PidService::list_snapshots() const {
  std::vector<PidServiceSnapshot> snapshots;
  snapshots.reserve(pid_order_.size());
  for (const auto& id : pid_order_) {
    snapshots.push_back(build_snapshot(pids_by_id_.at(id)));
  }
  return snapshots;
}

PidServiceOperationResult PidService::set_enabled(
    const std::string& id,
    const bool enabled,
    const PidServiceTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.")};
  }

  if (record->descriptor.enabled == enabled) {
    return publish_runtime_state(*record, now_ms);
  }

  record->descriptor.enabled = enabled;
  record->effective_mode = compute_effective_mode(*record);
  record_history(
      id,
      enabled ? PidServiceHistoryEventType::enabled : PidServiceHistoryEventType::disabled,
      now_ms,
      "pid_service",
      enabled ? "enabled" : "disabled");

  bool actuator_dirty = false;
  if (!enabled) {
    if (record->core.get_mode() != PidMode::hold) {
      const auto hold_result = record->core.set_mode(PidMode::hold, now_ms, record->last_pv);
      if (!hold_result.ok()) {
        return {wrap_core_error(hold_result.status, "Failed to transition PID '" + id + "' into hold on disable")};
      }
    }

    const auto clear_result =
        clear_owner_output(*record, now_ms, "disabled_cleared_output", record->command_active, actuator_dirty);
    if (!clear_result.ok()) {
      return clear_result;
    }
  }

  if (actuator_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (!evaluate_result.ok()) {
      return {wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after set_enabled")};
    }
  }

  return publish_runtime_state(*record, now_ms);
}

PidServiceOperationResult PidService::set_requested_mode(
    const std::string& id,
    const PidServiceMode mode,
    const PidServiceTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.")};
  }
  if (!is_supported_requested_mode(mode)) {
    return {PidServiceStatus::error(
        PidServiceErrorCode::pid_service_invalid_argument,
        "Requested PID service mode must be one of disabled/manual/auto/hold.")};
  }
  if (record->requested_mode == mode) {
    return publish_runtime_state(*record, now_ms);
  }

  record->requested_mode = mode;
  record->effective_mode = compute_effective_mode(*record);
  record_history(id, PidServiceHistoryEventType::mode_changed, now_ms, "pid_service", std::string(to_string(mode)));

  bool actuator_dirty = false;
  if (mode == PidServiceMode::disabled) {
    if (record->core.get_mode() != PidMode::hold) {
      const auto hold_result = record->core.set_mode(PidMode::hold, now_ms, record->last_pv);
      if (!hold_result.ok()) {
        return {wrap_core_error(hold_result.status, "Failed to transition PID '" + id + "' into hold on mode disable")};
      }
    }

    const auto clear_result =
        clear_owner_output(*record, now_ms, "disabled_cleared_output", record->command_active, actuator_dirty);
    if (!clear_result.ok()) {
      return clear_result;
    }
  }

  if (actuator_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (!evaluate_result.ok()) {
      return {wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after mode change")};
    }
  }

  return publish_runtime_state(*record, now_ms);
}

PidServiceOperationResult PidService::set_constant_setpoint(
    const std::string& id,
    const double value,
    const PidServiceTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.")};
  }
  if (record->descriptor.setpoint_source_kind != PidSetpointSourceKind::constant) {
    return {PidServiceStatus::error(
        PidServiceErrorCode::pid_service_invalid_argument,
        "set_constant_setpoint() is only valid for constant-source PID services.")};
  }
  if (!is_finite(value)) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_invalid_argument, "Constant setpoint must be finite.")};
  }

  record->descriptor.constant_setpoint = value;
  record->last_sp = value;
  const auto setpoint_result = record->core.set_setpoint(value);
  if (!setpoint_result.ok()) {
    return {wrap_core_error(setpoint_result.status, "Failed to set constant setpoint for PID '" + id + "'")};
  }

  record_history(id, PidServiceHistoryEventType::setpoint_changed, now_ms, "pid_service", "constant_setpoint_changed", value);
  return publish_runtime_state(*record, now_ms);
}

PidServiceOperationResult PidService::set_manual_output(
    const std::string& id,
    const double value,
    const PidServiceTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.")};
  }
  if (!is_finite(value)) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_invalid_argument, "Manual output must be finite.")};
  }

  const auto manual_result = record->core.set_manual_output(value);
  if (!manual_result.ok()) {
    return {wrap_core_error(manual_result.status, "Failed to set manual output for PID '" + id + "'")};
  }

  record->descriptor.core_config.manual_output = record->core.get_manual_output();
  record_history(id, PidServiceHistoryEventType::manual_output_changed, now_ms, "pid_service", "manual_output_changed", value);
  return publish_runtime_state(*record, now_ms);
}

PidServiceOperationResult PidService::reset_integral(const std::string& id, const PidServiceTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + id + "' is not registered.")};
  }

  record->core.reset_integral();
  record_history(id, PidServiceHistoryEventType::integral_reset, now_ms, "pid_service", "integral_reset");
  return publish_runtime_state(*record, now_ms);
}

PidServiceResult<std::vector<PidServiceHistoryEntry>> PidService::read_history(const std::optional<std::string> id) const {
  PidServiceResult<std::vector<PidServiceHistoryEntry>> result;
  if (id.has_value() && !has_pid(*id)) {
    result.status = PidServiceStatus::error(PidServiceErrorCode::pid_service_not_found, "PID service '" + *id + "' is not registered.");
    return result;
  }

  const auto entries = history_.read();
  if (!id.has_value()) {
    result.status = PidServiceStatus::success();
    result.value = entries;
    return result;
  }

  std::vector<PidServiceHistoryEntry> filtered;
  for (const auto& entry : entries) {
    if (entry.pid_id == *id) {
      filtered.push_back(entry);
    }
  }

  result.status = PidServiceStatus::success();
  result.value = std::move(filtered);
  return result;
}

void PidService::clear_history() {
  history_.clear();
}

PidService::PidRecord* PidService::find_record(const std::string& id) {
  const auto it = pids_by_id_.find(id);
  return it == pids_by_id_.end() ? nullptr : &it->second;
}

const PidService::PidRecord* PidService::find_record(const std::string& id) const {
  const auto it = pids_by_id_.find(id);
  return it == pids_by_id_.end() ? nullptr : &it->second;
}

void PidService::record_history(
    const std::string& pid_id,
    const PidServiceHistoryEventType event_type,
    const PidServiceTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const std::optional<double> value) {
  history_.append(PidServiceHistoryEntry{
      0U,
      pid_id,
      event_type,
      now_ms,
      source,
      reason,
      value,
  });
}

}  // namespace controller::pid
