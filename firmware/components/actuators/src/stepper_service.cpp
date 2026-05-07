#include "actuators/stepper_service.hpp"

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

using controller::hal::HalStatus;
using controller::hal::StepperDirection;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalErrorCode;
using controller::signals::SignalSnapshot;
using controller::signals::SignalType;
using controller::signals::SignalValue;

constexpr double kPositionEpsilon = 0.000001;

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](const unsigned char ch) {
    return !std::isspace(ch);
  });
}

bool is_finite(const double value) {
  return std::isfinite(value);
}

int direction_sign(const StepperDirection direction) {
  return direction == StepperDirection::forward ? 1 : -1;
}

std::string stepper_base_path(const std::string& id) {
  return "stepper." + id;
}

std::string signal_label(const std::optional<std::string>& path, const std::string& fallback) {
  return path.has_value() ? *path : fallback;
}

std::int64_t to_signal_int64(const std::uint64_t value) {
  constexpr auto max_value = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

std::int64_t quantize_position_steps(const double exact_steps) {
  if (exact_steps >= 0.0) {
    return static_cast<std::int64_t>(std::floor(exact_steps + kPositionEpsilon));
  }
  return static_cast<std::int64_t>(std::ceil(exact_steps - kPositionEpsilon));
}

double clamp_double(const double value, const double minimum, const double maximum) {
  return std::max(minimum, std::min(maximum, value));
}

std::int64_t clamp_steps(const StepperDescriptor& descriptor, const std::int64_t steps) {
  return std::max(descriptor.min_steps, std::min(descriptor.max_steps, steps));
}

double steps_to_percent(const StepperDescriptor& descriptor, const std::int64_t steps) {
  const auto span = descriptor.max_steps - descriptor.min_steps;
  if (span <= 0) {
    return 0.0;
  }

  const double normalized =
      static_cast<double>(steps - descriptor.min_steps) / static_cast<double>(span);
  return clamp_double(normalized * 100.0, 0.0, 100.0);
}

std::int64_t percent_to_steps(const StepperDescriptor& descriptor, const double percent) {
  const auto span = descriptor.max_steps - descriptor.min_steps;
  const double normalized = clamp_double(percent, 0.0, 100.0) / 100.0;
  return clamp_steps(
      descriptor,
      static_cast<std::int64_t>(
          std::llround(static_cast<double>(descriptor.min_steps) +
                       (static_cast<double>(span) * normalized))));
}

bool signal_snapshot_is_usable(const SignalSnapshot& snapshot) {
  return snapshot.initialized && snapshot.valid && !snapshot.fault && !snapshot.stale &&
         snapshot.value.has_value();
}

SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type,
    const std::string& unit = "") {
  return SignalDescriptor{
      path,
      name,
      "Stepper service runtime signal",
      type,
      unit,
      "stepper_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

void append_issue(
    StepperValidationResult& result,
    const StepperErrorCode code,
    const std::string& field,
    const std::string& message) {
  result.issues.push_back(StepperValidationIssue{code, field, message});
  if (result.status.ok()) {
    result.status = StepperStatus::error(code, message);
  }
}

StepperStatus wrap_signal_publish_error(
    const controller::signals::SignalStatus& status,
    const std::string& context) {
  return StepperStatus::error(
      StepperErrorCode::stepper_signal_publish_failed,
      context + ": " + status.message);
}

StepperStatus wrap_signal_read_error(
    const controller::signals::SignalStatus& status,
    const std::string& context) {
  return StepperStatus::error(
      StepperErrorCode::stepper_signal_read_failed,
      context + ": " + status.message);
}

StepperStatus wrap_hal_error(const HalStatus& status, const std::string& context) {
  return StepperStatus::error(
      StepperErrorCode::stepper_hal_command_failed,
      context + ": " + status.message);
}

StepperStatus register_signal_if_missing(
    controller::signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const StepperTimestampMs now_ms) {
  if (registry.has_signal(descriptor.path)) {
    return StepperStatus::error(
        StepperErrorCode::stepper_signal_publish_failed,
        "Signal '" + descriptor.path + "' is already registered.");
  }

  const auto result = registry.register_signal(descriptor, initial_value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_publish_error(result.status, "Failed to register signal '" + descriptor.path + "'");
  }
  return StepperStatus::success();
}

StepperStatus update_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const SignalValue& value,
    const StepperTimestampMs now_ms) {
  const auto result = registry.update_signal(path, value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_publish_error(result.status, "Failed to update signal '" + path + "'");
  }
  return StepperStatus::success();
}

}  // namespace

const char* to_string(const StepperRuntimeState state) {
  switch (state) {
    case StepperRuntimeState::disabled:
      return "disabled";
    case StepperRuntimeState::need_homing:
      return "need_homing";
    case StepperRuntimeState::homing:
      return "homing";
    case StepperRuntimeState::ready:
      return "ready";
    case StepperRuntimeState::moving:
      return "moving";
    case StepperRuntimeState::manual_jog:
      return "manual_jog";
    case StepperRuntimeState::fault:
      return "fault";
  }

  return "unknown";
}

const char* to_string(const StepperHistoryEventType event_type) {
  switch (event_type) {
    case StepperHistoryEventType::registered:
      return "registered";
    case StepperHistoryEventType::enabled:
      return "enabled";
    case StepperHistoryEventType::disabled:
      return "disabled";
    case StepperHistoryEventType::home_started:
      return "home_started";
    case StepperHistoryEventType::home_completed:
      return "home_completed";
    case StepperHistoryEventType::move_commanded:
      return "move_commanded";
    case StepperHistoryEventType::target_reached:
      return "target_reached";
    case StepperHistoryEventType::jog_started:
      return "jog_started";
    case StepperHistoryEventType::jog_stopped:
      return "jog_stopped";
    case StepperHistoryEventType::stopped:
      return "stopped";
    case StepperHistoryEventType::emergency_stopped:
      return "emergency_stopped";
    case StepperHistoryEventType::fault_entered:
      return "fault_entered";
    case StepperHistoryEventType::fault_cleared:
      return "fault_cleared";
    case StepperHistoryEventType::limit_reached:
      return "limit_reached";
    case StepperHistoryEventType::command_rejected:
      return "command_rejected";
  }

  return "unknown";
}

const char* to_string(const StepperDirection direction) {
  switch (direction) {
    case StepperDirection::forward:
      return "forward";
    case StepperDirection::reverse:
      return "reverse";
  }

  return "unknown";
}

const char* to_string(const StepperErrorCode code) {
  switch (code) {
    case StepperErrorCode::ok:
      return "OK";
    case StepperErrorCode::stepper_already_registered:
      return "STEPPER_ALREADY_REGISTERED";
    case StepperErrorCode::stepper_not_found:
      return "STEPPER_NOT_FOUND";
    case StepperErrorCode::stepper_invalid_descriptor:
      return "STEPPER_INVALID_DESCRIPTOR";
    case StepperErrorCode::stepper_invalid_command:
      return "STEPPER_INVALID_COMMAND";
    case StepperErrorCode::stepper_home_unsupported:
      return "STEPPER_HOME_UNSUPPORTED";
    case StepperErrorCode::stepper_homing_required:
      return "STEPPER_HOMING_REQUIRED";
    case StepperErrorCode::stepper_fault_active:
      return "STEPPER_FAULT_ACTIVE";
    case StepperErrorCode::stepper_target_out_of_range:
      return "STEPPER_TARGET_OUT_OF_RANGE";
    case StepperErrorCode::stepper_signal_read_failed:
      return "STEPPER_SIGNAL_READ_FAILED";
    case StepperErrorCode::stepper_signal_publish_failed:
      return "STEPPER_SIGNAL_PUBLISH_FAILED";
    case StepperErrorCode::stepper_hal_command_failed:
      return "STEPPER_HAL_COMMAND_FAILED";
  }

  return "STEPPER_UNKNOWN";
}

StepperService::StepperService(
    controller::hal::StepperHal& stepper_hal,
    controller::signals::SignalRegistry& signal_registry,
    const std::size_t history_capacity)
    : stepper_hal_(stepper_hal), signal_registry_(signal_registry), history_(history_capacity) {}

StepperValidationResult StepperService::validate_descriptor(
    const StepperDescriptor& descriptor,
    const std::optional<std::string> existing_stepper_id) const {
  StepperValidationResult result;

  if (!has_text(descriptor.id)) {
    append_issue(result, StepperErrorCode::stepper_invalid_descriptor, "stepper.id", "Stepper id must not be empty.");
  } else if (!controller::signals::is_valid_signal_path(descriptor.id)) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.id",
        "Stepper id '" + descriptor.id + "' must be a valid dot-separated signal-style id.");
  } else if (has_stepper(descriptor.id) &&
             (!existing_stepper_id.has_value() || *existing_stepper_id != descriptor.id)) {
    append_issue(
        result,
        StepperErrorCode::stepper_already_registered,
        "stepper.id",
        "Stepper '" + descriptor.id + "' is already registered.");
  }

  if (!has_text(descriptor.name)) {
    append_issue(result, StepperErrorCode::stepper_invalid_descriptor, "stepper.name", "Stepper name must not be empty.");
  }
  if (!has_text(descriptor.hal_stepper_id)) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.hal_stepper_id",
        "hal_stepper_id must not be empty.");
  }
  if (descriptor.min_steps >= descriptor.max_steps) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.step_range",
        "min_steps must be strictly less than max_steps.");
  }
  if (descriptor.home_position_steps < descriptor.min_steps ||
      descriptor.home_position_steps > descriptor.max_steps) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.home_position_steps",
        "home_position_steps must stay within min_steps..max_steps.");
  }
  if (!is_finite(descriptor.move_speed_steps_per_sec) || descriptor.move_speed_steps_per_sec <= 0.0) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.move_speed_steps_per_sec",
        "move_speed_steps_per_sec must be finite and greater than zero.");
  }
  if (!is_finite(descriptor.jog_speed_steps_per_sec) || descriptor.jog_speed_steps_per_sec <= 0.0) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.jog_speed_steps_per_sec",
        "jog_speed_steps_per_sec must be finite and greater than zero.");
  }
  if (descriptor.home_signal_path.has_value() && !has_text(*descriptor.home_signal_path)) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.home_signal_path",
        "home_signal_path must not be blank when provided.");
  }
  if ((descriptor.home_signal_path.has_value() || descriptor.home_required_on_boot) &&
      (!is_finite(descriptor.home_speed_steps_per_sec) || descriptor.home_speed_steps_per_sec <= 0.0)) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.home_speed_steps_per_sec",
        "home_speed_steps_per_sec must be finite and greater than zero when homing is supported.");
  }
  if (descriptor.home_required_on_boot && !descriptor.home_signal_path.has_value()) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.home_required_on_boot",
        "home_required_on_boot requires a home_signal_path.");
  }
  if (descriptor.limit_min_signal_path.has_value() && !has_text(*descriptor.limit_min_signal_path)) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.limit_min_signal_path",
        "limit_min_signal_path must not be blank when provided.");
  }
  if (descriptor.limit_max_signal_path.has_value() && !has_text(*descriptor.limit_max_signal_path)) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.limit_max_signal_path",
        "limit_max_signal_path must not be blank when provided.");
  }
  if (descriptor.fault_signal_path.has_value() && !has_text(*descriptor.fault_signal_path)) {
    append_issue(
        result,
        StepperErrorCode::stepper_invalid_descriptor,
        "stepper.fault_signal_path",
        "fault_signal_path must not be blank when provided.");
  }

  if (result.status.ok()) {
    result.status = StepperStatus::success();
  }
  return result;
}

StepperOperationResult StepperService::register_stepper(const StepperDescriptor& descriptor) {
  if (steppers_by_id_.count(descriptor.id) != 0U) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_already_registered,
        "Stepper '" + descriptor.id + "' is already registered.")};
  }

  const auto validation = validate_descriptor(descriptor);
  if (!validation.ok()) {
    return {validation.status.ok()
                ? StepperStatus::error(
                      StepperErrorCode::stepper_invalid_descriptor,
                      "Stepper descriptor validation failed.")
                : validation.status};
  }

  if (descriptor.publish_signals) {
    const auto signal_result = ensure_stepper_signals_registered(descriptor);
    if (!signal_result.ok()) {
      return signal_result;
    }
  }

  StepperRecord record;
  record.descriptor = descriptor;
  record.service_enabled = true;
  record.homed = !descriptor.home_required_on_boot && !descriptor.home_signal_path.has_value();
  record.position_steps = descriptor.home_position_steps;
  record.position_exact_steps = static_cast<double>(descriptor.home_position_steps);
  record.direction = StepperDirection::forward;
  record.runtime_state = !effective_enabled(record)
                             ? StepperRuntimeState::disabled
                             : (needs_homing(record) ? StepperRuntimeState::need_homing
                                                     : StepperRuntimeState::ready);
  record.last_reason = "registered";

  stepper_order_.push_back(descriptor.id);
  steppers_by_id_.emplace(descriptor.id, std::move(record));
  record_history(descriptor.id, StepperHistoryEventType::registered, 0U, "stepper_service", "registered");
  increment_update_counter(steppers_by_id_.at(descriptor.id));
  return publish_stepper_signals(steppers_by_id_.at(descriptor.id), 0U);
}

bool StepperService::has_stepper(const std::string& id) const {
  return steppers_by_id_.count(id) != 0U;
}

StepperResult<StepperDescriptor> StepperService::get_descriptor(const std::string& id) const {
  StepperResult<StepperDescriptor> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.");
    return result;
  }

  result.status = StepperStatus::success();
  result.value = record->descriptor;
  return result;
}

std::vector<StepperDescriptor> StepperService::list_descriptors() const {
  std::vector<StepperDescriptor> descriptors;
  descriptors.reserve(stepper_order_.size());
  for (const auto& id : stepper_order_) {
    descriptors.push_back(steppers_by_id_.at(id).descriptor);
  }
  return descriptors;
}

StepperOperationResult StepperService::set_enabled(
    const std::string& id,
    const bool enabled,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }

  const auto from_state = record->runtime_state;
  record->service_enabled = enabled;
  record->active_source = source;
  record->active_reason = reason;
  record->last_reason = reason;

  if (!effective_enabled(*record)) {
    if (runtime_is_moving(*record)) {
      const auto stop_status = stepper_hal_.stop(record->descriptor.hal_stepper_id);
      if (!stop_status.ok()) {
        return {wrap_hal_error(stop_status, "Failed to stop HAL while disabling stepper '" + id + "'")};
      }
    } else {
      const auto disable_status = stepper_hal_.set_enabled(record->descriptor.hal_stepper_id, false);
      if (!disable_status.ok()) {
        return {wrap_hal_error(disable_status, "Failed to disable HAL for stepper '" + id + "'")};
      }
    }

    record->runtime_state = StepperRuntimeState::disabled;
    record->target_steps.reset();
    record->command_speed_steps_per_sec = 0.0;
    record_history(
        record->descriptor.id,
        StepperHistoryEventType::disabled,
        now_ms,
        source,
        reason,
        from_state,
        record->runtime_state);
  } else {
    record->runtime_state = record->fault ? StepperRuntimeState::fault
                                          : (needs_homing(*record) ? StepperRuntimeState::need_homing
                                                                   : StepperRuntimeState::ready);
    record_history(
        record->descriptor.id,
        StepperHistoryEventType::enabled,
        now_ms,
        source,
        reason,
        from_state,
        record->runtime_state);
  }

  increment_update_counter(*record);
  return publish_stepper_signals(*record, now_ms);
}

StepperOperationResult StepperService::command_home(
    const std::string& id,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }
  if (record->fault) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_fault_active,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is faulted.");
  }
  if (!effective_enabled(*record)) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_invalid_command,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is disabled.");
  }
  if (!record->descriptor.home_signal_path.has_value()) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_home_unsupported,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' has no home signal configured.");
  }

  const auto from_state = record->runtime_state;
  record->homed = false;
  record->target_steps.reset();
  record_history(
      record->descriptor.id,
      StepperHistoryEventType::home_started,
      now_ms,
      source,
      reason,
      from_state,
      StepperRuntimeState::homing);
  return apply_motion_command(
      *record,
      record->descriptor.home_direction,
      record->descriptor.home_speed_steps_per_sec,
      now_ms,
      source,
      reason,
      StepperRuntimeState::homing);
}

StepperOperationResult StepperService::move_to_steps(
    const std::string& id,
    const std::int64_t target_steps,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }
  if (target_steps < record->descriptor.min_steps || target_steps > record->descriptor.max_steps) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_target_out_of_range,
        now_ms,
        source,
        reason,
        "Target steps are outside the configured range.");
  }
  if (record->fault) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_fault_active,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is faulted.");
  }
  if (!effective_enabled(*record)) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_invalid_command,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is disabled.");
  }
  if (needs_homing(*record)) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_homing_required,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' requires homing before motion.");
  }

  const auto from_state = record->runtime_state;
  record->target_steps = target_steps;
  record_history(
      record->descriptor.id,
      StepperHistoryEventType::move_commanded,
      now_ms,
      source,
      reason,
      from_state,
      (target_steps == record->position_steps ? StepperRuntimeState::ready : StepperRuntimeState::moving),
      static_cast<double>(target_steps));

  if (target_steps == record->position_steps) {
    record->target_steps.reset();
    record->runtime_state = StepperRuntimeState::ready;
    record->command_speed_steps_per_sec = 0.0;
    record->last_reason = "target_already_reached";
    record_history(
        record->descriptor.id,
        StepperHistoryEventType::target_reached,
        now_ms,
        source,
        record->last_reason,
        from_state,
        record->runtime_state,
        static_cast<double>(target_steps));
    increment_update_counter(*record);
    return publish_stepper_signals(*record, now_ms);
  }

  const auto direction =
      target_steps > record->position_steps ? StepperDirection::forward : StepperDirection::reverse;
  return apply_motion_command(
      *record,
      direction,
      record->descriptor.move_speed_steps_per_sec,
      now_ms,
      source,
      reason,
      StepperRuntimeState::moving);
}

StepperOperationResult StepperService::move_to_percent(
    const std::string& id,
    const double target_percent,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }
  if (!is_finite(target_percent) || target_percent < 0.0 || target_percent > 100.0) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_target_out_of_range,
        now_ms,
        source,
        reason,
        "Target percent must stay within 0..100.");
  }

  return move_to_steps(id, percent_to_steps(record->descriptor, target_percent), now_ms, source, reason);
}

StepperOperationResult StepperService::start_jog(
    const std::string& id,
    const StepperDirection direction,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }
  if (record->fault) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_fault_active,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is faulted.");
  }
  if (!effective_enabled(*record)) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_invalid_command,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is disabled.");
  }
  if (needs_homing(*record)) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_homing_required,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' requires homing before jog.");
  }

  const auto from_state = record->runtime_state;
  record->target_steps.reset();
  record_history(
      record->descriptor.id,
      StepperHistoryEventType::jog_started,
      now_ms,
      source,
      reason,
      from_state,
      StepperRuntimeState::manual_jog);
  return apply_motion_command(
      *record,
      direction,
      record->descriptor.jog_speed_steps_per_sec,
      now_ms,
      source,
      reason,
      StepperRuntimeState::manual_jog);
}

StepperOperationResult StepperService::stop(
    const std::string& id,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }
  if (record->fault) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_fault_active,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is faulted.");
  }

  const auto from_state = record->runtime_state;
  const auto stop_result = apply_stop(*record, now_ms, source, reason, false);
  if (!stop_result.ok()) {
    return stop_result;
  }

  record->target_steps.reset();
  record->runtime_state = !effective_enabled(*record)
                              ? StepperRuntimeState::disabled
                              : (needs_homing(*record) ? StepperRuntimeState::need_homing
                                                       : StepperRuntimeState::ready);
  record_history(
      record->descriptor.id,
      from_state == StepperRuntimeState::manual_jog ? StepperHistoryEventType::jog_stopped
                                                    : StepperHistoryEventType::stopped,
      now_ms,
      source,
      reason,
      from_state,
      record->runtime_state);
  increment_update_counter(*record);
  return publish_stepper_signals(*record, now_ms);
}

StepperOperationResult StepperService::emergency_stop(
    const std::string& id,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }

  const auto from_state = record->runtime_state;
  record_history(
      record->descriptor.id,
      StepperHistoryEventType::emergency_stopped,
      now_ms,
      source,
      reason,
      from_state,
      StepperRuntimeState::fault);
  return enter_fault(*record, now_ms, source, reason, true);
}

StepperOperationResult StepperService::clear_fault(
    const std::string& id,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.")};
  }
  if (!record->fault) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_invalid_command,
        now_ms,
        source,
        reason,
        "Stepper '" + id + "' is not faulted.");
  }

  const auto fault_read = read_optional_bool_signal(record->descriptor.fault_signal_path, now_ms);
  if (!fault_read.status.ok()) {
    return {fault_read.status};
  }
  if (fault_read.available && fault_read.value_bool) {
    return reject_command(
        *record,
        StepperErrorCode::stepper_fault_active,
        now_ms,
        source,
        reason,
        "Fault signal is still active for stepper '" + id + "'.");
  }

  const auto from_state = record->runtime_state;
  record->fault = false;
  record->fault_reason.clear();
  record->fault_signal_value = fault_read.available ? std::optional<bool>(fault_read.value_bool) : std::nullopt;
  record->runtime_state = !effective_enabled(*record)
                              ? StepperRuntimeState::disabled
                              : (needs_homing(*record) ? StepperRuntimeState::need_homing
                                                       : StepperRuntimeState::ready);
  record->active_source = source;
  record->active_reason = reason;
  record->last_reason = reason;
  record_history(
      record->descriptor.id,
      StepperHistoryEventType::fault_cleared,
      now_ms,
      source,
      reason,
      from_state,
      record->runtime_state);
  increment_update_counter(*record);
  return publish_stepper_signals(*record, now_ms);
}

StepperOperationResult StepperService::tick(const StepperTimestampMs now_ms) {
  for (const auto& id : stepper_order_) {
    auto& record = steppers_by_id_.at(id);
    const auto previous_tick = record.last_tick_ms.has_value() ? *record.last_tick_ms : now_ms;
    const auto delta_ms = now_ms > previous_tick ? (now_ms - previous_tick) : 0U;

    const auto home_read = read_optional_bool_signal(record.descriptor.home_signal_path, now_ms);
    if (!home_read.status.ok()) {
      if (record.runtime_state == StepperRuntimeState::homing) {
        const auto reason =
            "home_signal_unreadable:" + signal_label(record.descriptor.home_signal_path, "unconfigured");
        const auto fault_result = enter_fault(record, now_ms, "signal_registry", reason, false, true);
        if (!fault_result.ok()) {
          return fault_result;
        }
      }
      return {home_read.status};
    }
    const auto limit_min_read = read_optional_bool_signal(record.descriptor.limit_min_signal_path, now_ms);
    if (!limit_min_read.status.ok()) {
      return {limit_min_read.status};
    }
    const auto limit_max_read = read_optional_bool_signal(record.descriptor.limit_max_signal_path, now_ms);
    if (!limit_max_read.status.ok()) {
      return {limit_max_read.status};
    }
    const auto fault_read = read_optional_bool_signal(record.descriptor.fault_signal_path, now_ms);
    if (!fault_read.status.ok()) {
      return {fault_read.status};
    }

    record.home_signal_value = home_read.available ? std::optional<bool>(home_read.value_bool) : std::nullopt;
    record.limit_min_value = limit_min_read.available ? std::optional<bool>(limit_min_read.value_bool) : std::nullopt;
    record.limit_max_value = limit_max_read.available ? std::optional<bool>(limit_max_read.value_bool) : std::nullopt;
    record.fault_signal_value = fault_read.available ? std::optional<bool>(fault_read.value_bool) : std::nullopt;

    if (fault_read.available && fault_read.value_bool) {
      if (!record.fault) {
        const auto fault_result = enter_fault(record, now_ms, "signal_registry", "fault_signal_active", false, true);
        if (!fault_result.ok()) {
          return fault_result;
        }
      } else {
        record.last_tick_ms = now_ms;
        increment_update_counter(record);
        const auto publish_result = publish_stepper_signals(record, now_ms);
        if (!publish_result.ok()) {
          return publish_result;
        }
      }
      continue;
    }

    if (record.fault) {
      record.last_tick_ms = now_ms;
      increment_update_counter(record);
      const auto publish_result = publish_stepper_signals(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    if (!effective_enabled(record)) {
      record.runtime_state = StepperRuntimeState::disabled;
      record.command_speed_steps_per_sec = 0.0;
      record.target_steps.reset();
      record.last_tick_ms = now_ms;
      increment_update_counter(record);
      const auto publish_result = publish_stepper_signals(record, now_ms);
      if (!publish_result.ok()) {
        return publish_result;
      }
      continue;
    }

    if (record.runtime_state != StepperRuntimeState::homing && needs_homing(record)) {
      record.runtime_state = StepperRuntimeState::need_homing;
    } else if (record.runtime_state == StepperRuntimeState::disabled) {
      record.runtime_state = needs_homing(record) ? StepperRuntimeState::need_homing : StepperRuntimeState::ready;
    }

    if (record.runtime_state == StepperRuntimeState::homing) {
      if (!home_read.available || home_read.unreadable || home_read.missing) {
        const auto reason =
            "home_signal_unreadable:" + signal_label(record.descriptor.home_signal_path, "unconfigured");
        const auto fault_result = enter_fault(record, now_ms, "signal_registry", reason, false, true);
        if (!fault_result.ok()) {
          return fault_result;
        }
        return {StepperStatus::error(
            StepperErrorCode::stepper_signal_read_failed,
            "Home signal is unreadable while homing stepper '" + record.descriptor.id + "'.")};
      }

      if (home_read.value_bool) {
        const auto from_state = record.runtime_state;
        const auto stop_result = apply_stop(record, now_ms, "signal_registry", "home_completed", false);
        if (!stop_result.ok()) {
          return stop_result;
        }

        record.homed = true;
        set_position(record, static_cast<double>(record.descriptor.home_position_steps));
        record.target_steps.reset();
        record.runtime_state = StepperRuntimeState::ready;
        record.last_reason = "home_completed";
        record_history(
            record.descriptor.id,
            StepperHistoryEventType::home_completed,
            now_ms,
            "signal_registry",
            record.last_reason,
            from_state,
            record.runtime_state,
            static_cast<double>(record.position_steps));
        record.last_tick_ms = now_ms;
        increment_update_counter(record);
        const auto publish_result = publish_stepper_signals(record, now_ms);
        if (!publish_result.ok()) {
          return publish_result;
        }
        continue;
      }
    } else if (record.runtime_state == StepperRuntimeState::moving ||
               record.runtime_state == StepperRuntimeState::manual_jog) {
      if (record.direction == StepperDirection::reverse && limit_min_read.available && limit_min_read.value_bool) {
        const auto from_state = record.runtime_state;
        const auto stop_result = apply_stop(record, now_ms, "signal_registry", "limit_min reached", false);
        if (!stop_result.ok()) {
          return stop_result;
        }

        set_position(record, static_cast<double>(record.descriptor.min_steps));
        record.target_steps.reset();
        record.runtime_state = StepperRuntimeState::ready;
        record.last_reason = "limit_min reached";
        record_history(
            record.descriptor.id,
            StepperHistoryEventType::limit_reached,
            now_ms,
            "signal_registry",
            record.last_reason,
            from_state,
            record.runtime_state,
            static_cast<double>(record.position_steps));
        record.last_tick_ms = now_ms;
        increment_update_counter(record);
        const auto publish_result = publish_stepper_signals(record, now_ms);
        if (!publish_result.ok()) {
          return publish_result;
        }
        continue;
      }

      if (record.direction == StepperDirection::forward && limit_max_read.available && limit_max_read.value_bool) {
        const auto from_state = record.runtime_state;
        const auto stop_result = apply_stop(record, now_ms, "signal_registry", "limit_max reached", false);
        if (!stop_result.ok()) {
          return stop_result;
        }

        set_position(record, static_cast<double>(record.descriptor.max_steps));
        record.target_steps.reset();
        record.runtime_state = StepperRuntimeState::ready;
        record.last_reason = "limit_max reached";
        record_history(
            record.descriptor.id,
            StepperHistoryEventType::limit_reached,
            now_ms,
            "signal_registry",
            record.last_reason,
            from_state,
            record.runtime_state,
            static_cast<double>(record.position_steps));
        record.last_tick_ms = now_ms;
        increment_update_counter(record);
        const auto publish_result = publish_stepper_signals(record, now_ms);
        if (!publish_result.ok()) {
          return publish_result;
        }
        continue;
      }
    }

    if (runtime_is_moving(record) && delta_ms > 0U && record.command_speed_steps_per_sec > 0.0) {
      const double step_delta =
          static_cast<double>(direction_sign(record.direction)) * record.command_speed_steps_per_sec *
          (static_cast<double>(delta_ms) / 1000.0);
      set_position(record, record.position_exact_steps + step_delta);
    }

    if (record.runtime_state == StepperRuntimeState::moving && record.target_steps.has_value()) {
      const bool reached_target =
          (record.direction == StepperDirection::forward &&
           record.position_exact_steps >= static_cast<double>(*record.target_steps)) ||
          (record.direction == StepperDirection::reverse &&
           record.position_exact_steps <= static_cast<double>(*record.target_steps));
      if (reached_target) {
        const auto from_state = record.runtime_state;
        const auto stop_result = apply_stop(record, now_ms, "stepper_service", "target_reached", false);
        if (!stop_result.ok()) {
          return stop_result;
        }

        set_position(record, static_cast<double>(*record.target_steps));
        record.target_steps.reset();
        record.runtime_state = StepperRuntimeState::ready;
        record.last_reason = "target_reached";
        record_history(
            record.descriptor.id,
            StepperHistoryEventType::target_reached,
            now_ms,
            "stepper_service",
            record.last_reason,
            from_state,
            record.runtime_state,
            static_cast<double>(record.position_steps));
      }
    } else if (record.runtime_state == StepperRuntimeState::manual_jog) {
      if (record.position_steps <= record.descriptor.min_steps) {
        const auto from_state = record.runtime_state;
        const auto stop_result = apply_stop(record, now_ms, "stepper_service", "min_position_bound reached", false);
        if (!stop_result.ok()) {
          return stop_result;
        }

        set_position(record, static_cast<double>(record.descriptor.min_steps));
        record.runtime_state = StepperRuntimeState::ready;
        record.last_reason = "min_position_bound reached";
        record_history(
            record.descriptor.id,
            StepperHistoryEventType::limit_reached,
            now_ms,
            "stepper_service",
            record.last_reason,
            from_state,
            record.runtime_state,
            static_cast<double>(record.position_steps));
      } else if (record.position_steps >= record.descriptor.max_steps) {
        const auto from_state = record.runtime_state;
        const auto stop_result = apply_stop(record, now_ms, "stepper_service", "max_position_bound reached", false);
        if (!stop_result.ok()) {
          return stop_result;
        }

        set_position(record, static_cast<double>(record.descriptor.max_steps));
        record.runtime_state = StepperRuntimeState::ready;
        record.last_reason = "max_position_bound reached";
        record_history(
            record.descriptor.id,
            StepperHistoryEventType::limit_reached,
            now_ms,
            "stepper_service",
            record.last_reason,
            from_state,
            record.runtime_state,
            static_cast<double>(record.position_steps));
      }
    }

    record.last_tick_ms = now_ms;
    increment_update_counter(record);
    const auto publish_result = publish_stepper_signals(record, now_ms);
    if (!publish_result.ok()) {
      return publish_result;
    }
  }

  return {StepperStatus::success()};
}

StepperResult<StepperSnapshot> StepperService::get_snapshot(const std::string& id) const {
  StepperResult<StepperSnapshot> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + id + "' is not registered.");
    return result;
  }

  result.status = StepperStatus::success();
  result.value = build_snapshot(*record);
  return result;
}

std::vector<StepperSnapshot> StepperService::list_snapshots() const {
  std::vector<StepperSnapshot> snapshots;
  snapshots.reserve(stepper_order_.size());
  for (const auto& id : stepper_order_) {
    snapshots.push_back(build_snapshot(steppers_by_id_.at(id)));
  }
  return snapshots;
}

StepperResult<std::vector<StepperHistoryEntry>> StepperService::read_history(const std::optional<std::string> id) const {
  StepperResult<std::vector<StepperHistoryEntry>> result;
  if (id.has_value() && !has_stepper(*id)) {
    result.status = StepperStatus::error(
        StepperErrorCode::stepper_not_found,
        "Stepper '" + *id + "' is not registered.");
    return result;
  }

  const auto entries = history_.read();
  if (!id.has_value()) {
    result.status = StepperStatus::success();
    result.value = entries;
    return result;
  }

  std::vector<StepperHistoryEntry> filtered;
  for (const auto& entry : entries) {
    if (entry.stepper_id == *id) {
      filtered.push_back(entry);
    }
  }

  result.status = StepperStatus::success();
  result.value = std::move(filtered);
  return result;
}

void StepperService::clear_history() {
  history_.clear();
}

StepperService::StepperRecord* StepperService::find_record(const std::string& id) {
  const auto it = steppers_by_id_.find(id);
  return it == steppers_by_id_.end() ? nullptr : &it->second;
}

const StepperService::StepperRecord* StepperService::find_record(const std::string& id) const {
  const auto it = steppers_by_id_.find(id);
  return it == steppers_by_id_.end() ? nullptr : &it->second;
}

StepperSnapshot StepperService::build_snapshot(const StepperRecord& record) const {
  StepperSnapshot snapshot;
  snapshot.id = record.descriptor.id;
  snapshot.name = record.descriptor.name;
  snapshot.enabled = effective_enabled(record);
  snapshot.runtime_state = record.runtime_state;
  snapshot.homed = record.homed;
  snapshot.need_homing = needs_homing(record);
  snapshot.moving = runtime_is_moving(record);
  snapshot.fault = record.fault;
  snapshot.fault_reason = record.fault_reason;
  snapshot.position_steps = record.position_steps;
  snapshot.position_percent = steps_to_percent(record.descriptor, clamp_steps(record.descriptor, record.position_steps));
  snapshot.target_steps = record.target_steps;
  snapshot.target_percent =
      record.target_steps.has_value() ? std::optional<double>(steps_to_percent(record.descriptor, *record.target_steps))
                                      : std::nullopt;
  snapshot.direction = record.direction;
  snapshot.command_speed_steps_per_sec = record.command_speed_steps_per_sec;
  snapshot.home_signal = record.home_signal_value;
  snapshot.limit_min = record.limit_min_value;
  snapshot.limit_max = record.limit_max_value;
  snapshot.last_reason = record.last_reason;
  snapshot.update_counter = record.update_counter;
  return snapshot;
}

bool StepperService::effective_enabled(const StepperRecord& record) const {
  return record.descriptor.enabled && record.service_enabled;
}

bool StepperService::needs_homing(const StepperRecord& record) const {
  return record.descriptor.home_required_on_boot && !record.homed;
}

bool StepperService::runtime_is_moving(const StepperRecord& record) const {
  return record.runtime_state == StepperRuntimeState::homing ||
         record.runtime_state == StepperRuntimeState::moving ||
         record.runtime_state == StepperRuntimeState::manual_jog;
}

StepperOperationResult StepperService::ensure_stepper_signals_registered(const StepperDescriptor& descriptor) {
  const auto base = stepper_base_path(descriptor.id);
  StepperStatus status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".enabled", "Stepper enabled", SignalType::boolean),
      SignalValue{descriptor.enabled},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".runtime_state", "Stepper runtime state", SignalType::string),
      SignalValue{std::string("disabled")},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".homed", "Stepper homed", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".need_homing", "Stepper need homing", SignalType::boolean),
      SignalValue{descriptor.home_required_on_boot},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".moving", "Stepper moving", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".position_steps", "Stepper position steps", SignalType::int64, "steps"),
      SignalValue{static_cast<std::int64_t>(descriptor.home_position_steps)},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".position_percent", "Stepper position percent", SignalType::float64, "%"),
      SignalValue{steps_to_percent(descriptor, descriptor.home_position_steps)},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".target_steps", "Stepper target steps", SignalType::int64, "steps"),
      SignalValue{static_cast<std::int64_t>(descriptor.home_position_steps)},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".target_percent", "Stepper target percent", SignalType::float64, "%"),
      SignalValue{std::numeric_limits<double>::quiet_NaN()},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".direction", "Stepper direction", SignalType::string),
      SignalValue{std::string("forward")},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(
          base + ".command_speed_steps_per_sec",
          "Stepper command speed",
          SignalType::float64,
          "steps_per_sec"),
      SignalValue{0.0},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".fault", "Stepper fault", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".fault_reason", "Stepper fault reason", SignalType::string),
      SignalValue{std::string("")},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".home_signal", "Stepper home signal", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".limit_min", "Stepper minimum limit", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".limit_max", "Stepper maximum limit", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_reason", "Stepper last reason", SignalType::string),
      SignalValue{std::string("registered")},
      0U);
  if (!status.ok()) {
    return {status};
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".update_counter", "Stepper update counter", SignalType::int64),
      SignalValue{static_cast<std::int64_t>(0)},
      0U);
  if (!status.ok()) {
    return {status};
  }

  return {StepperStatus::success()};
}

StepperOperationResult StepperService::publish_stepper_signals(
    const StepperRecord& record,
    const StepperTimestampMs now_ms) {
  if (!record.descriptor.publish_signals) {
    return {StepperStatus::success()};
  }

  const auto snapshot = build_snapshot(record);
  const auto base = stepper_base_path(record.descriptor.id);

  StepperStatus status = update_signal(signal_registry_, base + ".enabled", SignalValue{snapshot.enabled}, now_ms);
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
  status = update_signal(signal_registry_, base + ".homed", SignalValue{snapshot.homed}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".need_homing", SignalValue{snapshot.need_homing}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".moving", SignalValue{snapshot.moving}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".position_steps", SignalValue{snapshot.position_steps}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".position_percent", SignalValue{snapshot.position_percent}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".target_steps",
      SignalValue{snapshot.target_steps.value_or(snapshot.position_steps)},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".target_percent",
      SignalValue{snapshot.target_percent.has_value() ? *snapshot.target_percent
                                                      : std::numeric_limits<double>::quiet_NaN()},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".direction",
      SignalValue{std::string(to_string(snapshot.direction))},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".command_speed_steps_per_sec",
      SignalValue{snapshot.command_speed_steps_per_sec},
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
  status = update_signal(
      signal_registry_,
      base + ".home_signal",
      SignalValue{snapshot.home_signal.value_or(false)},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".limit_min",
      SignalValue{snapshot.limit_min.value_or(false)},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".limit_max",
      SignalValue{snapshot.limit_max.value_or(false)},
      now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(signal_registry_, base + ".last_reason", SignalValue{snapshot.last_reason}, now_ms);
  if (!status.ok()) {
    return {status};
  }
  status = update_signal(
      signal_registry_,
      base + ".update_counter",
      SignalValue{to_signal_int64(snapshot.update_counter)},
      now_ms);
  if (!status.ok()) {
    return {status};
  }

  return {StepperStatus::success()};
}

StepperService::OptionalSignalRead StepperService::read_optional_bool_signal(
    const std::optional<std::string>& path,
    const StepperTimestampMs now_ms) const {
  OptionalSignalRead result;
  if (!path.has_value()) {
    result.status = StepperStatus::success();
    return result;
  }

  result.configured = true;
  if (!signal_registry_.has_signal(*path)) {
    result.missing = true;
    result.status = StepperStatus::success();
    return result;
  }

  const auto snapshot_result = signal_registry_.read_signal(*path, now_ms);
  if (!snapshot_result.ok()) {
    if (snapshot_result.status.code == SignalErrorCode::signal_not_found) {
      result.missing = true;
      result.status = StepperStatus::success();
      return result;
    }

    result.status = wrap_signal_read_error(snapshot_result.status, "Failed to read signal '" + *path + "'");
    return result;
  }

  const auto& snapshot = *snapshot_result.value;
  if (snapshot.descriptor.type != SignalType::boolean) {
    result.status = StepperStatus::error(
        StepperErrorCode::stepper_signal_read_failed,
        "Signal '" + *path + "' is not a boolean signal.");
    return result;
  }
  if (!signal_snapshot_is_usable(snapshot)) {
    result.unreadable = true;
    result.status = StepperStatus::success();
    return result;
  }
  if (!std::holds_alternative<bool>(*snapshot.value)) {
    result.status = StepperStatus::error(
        StepperErrorCode::stepper_signal_read_failed,
        "Signal '" + *path + "' does not currently hold a boolean value.");
    return result;
  }

  result.available = true;
  result.value_bool = std::get<bool>(*snapshot.value);
  result.status = StepperStatus::success();
  return result;
}

StepperOperationResult StepperService::apply_motion_command(
    StepperRecord& record,
    const StepperDirection direction,
    const double step_rate_hz,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const StepperRuntimeState motion_state) {
  const auto direction_status = stepper_hal_.set_direction(record.descriptor.hal_stepper_id, direction);
  if (!direction_status.ok()) {
    return {wrap_hal_error(
        direction_status,
        "Failed to set direction for stepper '" + record.descriptor.id + "'")};
  }
  const auto rate_status = stepper_hal_.set_step_rate_hz(record.descriptor.hal_stepper_id, step_rate_hz);
  if (!rate_status.ok()) {
    return {wrap_hal_error(
        rate_status,
        "Failed to set step rate for stepper '" + record.descriptor.id + "'")};
  }
  const auto enable_status = stepper_hal_.set_enabled(record.descriptor.hal_stepper_id, true);
  if (!enable_status.ok()) {
    return {wrap_hal_error(
        enable_status,
        "Failed to enable HAL for stepper '" + record.descriptor.id + "'")};
  }

  record.direction = direction;
  record.command_speed_steps_per_sec = step_rate_hz;
  record.runtime_state = motion_state;
  record.active_source = source;
  record.active_reason = reason;
  record.last_reason = reason;
  increment_update_counter(record);
  return publish_stepper_signals(record, now_ms);
}

StepperOperationResult StepperService::apply_stop(
    StepperRecord& record,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const bool emergency) {
  const auto stop_status = emergency ? stepper_hal_.emergency_stop(record.descriptor.hal_stepper_id)
                                     : stepper_hal_.stop(record.descriptor.hal_stepper_id);
  if (!stop_status.ok()) {
    return {wrap_hal_error(stop_status, "Failed to stop stepper '" + record.descriptor.id + "'")};
  }

  record.command_speed_steps_per_sec = 0.0;
  record.active_source = source;
  record.active_reason = reason;
  record.last_reason = reason;
  return {StepperStatus::success()};
}

StepperOperationResult StepperService::enter_fault(
    StepperRecord& record,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const bool emergency,
    const bool publish_before_return) {
  const auto from_state = record.runtime_state;
  const auto stop_result = apply_stop(record, now_ms, source, reason, emergency);
  if (!stop_result.ok()) {
    return stop_result;
  }

  record.fault = true;
  record.fault_reason = reason;
  record.target_steps.reset();
  record.runtime_state = StepperRuntimeState::fault;
  record.last_reason = reason;
  record_history(
      record.descriptor.id,
      StepperHistoryEventType::fault_entered,
      now_ms,
      source,
      reason,
      from_state,
      record.runtime_state);
  record.last_tick_ms = now_ms;
  increment_update_counter(record);
  if (!publish_before_return) {
    return {StepperStatus::success()};
  }
  return publish_stepper_signals(record, now_ms);
}

void StepperService::set_position(StepperRecord& record, const double exact_steps) {
  record.position_exact_steps = exact_steps;
  record.position_steps = quantize_position_steps(exact_steps);
}

void StepperService::increment_update_counter(StepperRecord& record) {
  record.update_counter += 1U;
}

void StepperService::record_history(
    const std::string& stepper_id,
    const StepperHistoryEventType event_type,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const std::optional<StepperRuntimeState> from_state,
    const std::optional<StepperRuntimeState> to_state,
    const std::optional<double> value) {
  history_.append(StepperHistoryEntry{
      0U,
      stepper_id,
      event_type,
      now_ms,
      source,
      reason,
      from_state,
      to_state,
      value,
  });
}

StepperOperationResult StepperService::reject_command(
    StepperRecord& record,
    const StepperErrorCode code,
    const StepperTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const std::string& message) {
  record.active_source = source;
  record.active_reason = reason;
  record.last_reason = reason;
  record_history(
      record.descriptor.id,
      StepperHistoryEventType::command_rejected,
      now_ms,
      source,
      reason,
      record.runtime_state,
      record.runtime_state);
  increment_update_counter(record);
  const auto publish_result = publish_stepper_signals(record, now_ms);
  if (!publish_result.ok()) {
    return publish_result;
  }
  return {StepperStatus::error(code, message)};
}

}  // namespace controller::actuators
