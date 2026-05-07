#include "alarms/alarm_service.hpp"

#include <algorithm>
#include <cstdint>
#include <limits>
#include <string>
#include <string_view>
#include <utility>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::alarms {

namespace {

using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::signals::SignalValue;

constexpr std::string_view kAlarmPrefix = "alarm.";

bool runtime_state_core_equals(const RuntimeAlarmState& lhs, const RuntimeAlarmState& rhs) {
  return lhs.initialized == rhs.initialized && lhs.condition_active == rhs.condition_active && lhs.active == rhs.active &&
         lhs.latched == rhs.latched && lhs.acknowledged == rhs.acknowledged &&
         lhs.reset_allowed == rhs.reset_allowed && lhs.first_activated_ms == rhs.first_activated_ms &&
         lhs.activation_count == rhs.activation_count;
}

bool aggregate_status_core_equals(const AggregateAlarmStatus& lhs, const AggregateAlarmStatus& rhs) {
  return lhs.any_active == rhs.any_active && lhs.info_active == rhs.info_active &&
         lhs.warning_active == rhs.warning_active && lhs.inhibit_active == rhs.inhibit_active &&
         lhs.trip_active == rhs.trip_active && lhs.safety_active == rhs.safety_active &&
         lhs.active_count == rhs.active_count && lhs.highest_severity == rhs.highest_severity &&
         lhs.highest_severity_alarm_id == rhs.highest_severity_alarm_id;
}

std::int64_t to_signal_int64(const std::uint64_t value) {
  constexpr auto max_value = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }

  return static_cast<std::int64_t>(value);
}

std::string aggregate_signal_path(const std::string_view suffix) {
  return std::string{kAlarmPrefix} + std::string{suffix};
}

std::string alarm_signal_path(const std::string& id, const std::string_view suffix) {
  return std::string{kAlarmPrefix} + id + "." + std::string{suffix};
}

SignalDescriptor make_signal_descriptor(
    const AlarmDescriptor& alarm_descriptor,
    const std::string& path,
    const std::string& name_suffix,
    const SignalType type,
    const std::string& unit) {
  return SignalDescriptor{
      path,
      alarm_descriptor.name + " " + name_suffix,
      "AlarmService state for " + alarm_descriptor.id,
      type,
      unit,
      alarm_descriptor.source_module.empty() ? "alarm_service" : alarm_descriptor.source_module,
      SignalAccessMode::read_only,
      0U,
      alarm_descriptor.enabled,
      alarm_descriptor.visible,
  };
}

SignalDescriptor make_aggregate_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type,
    const std::string& unit) {
  return SignalDescriptor{
      path,
      name,
      "Aggregate AlarmService status",
      type,
      unit,
      "alarm_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

AlarmStatus wrap_signal_error(const std::string& alarm_id, const controller::signals::SignalStatus& status) {
  return AlarmStatus::error(
      AlarmErrorCode::alarm_signal_publish_failed,
      "Alarm '" + alarm_id + "' signal publication failed: " + status.message);
}

AlarmStatus wrap_aggregate_signal_error(const controller::signals::SignalStatus& status) {
  return AlarmStatus::error(
      AlarmErrorCode::alarm_signal_publish_failed,
      "Aggregate alarm signal publication failed: " + status.message);
}

void clear_signal_if_present(signals::SignalRegistry& registry, const std::string& path) {
  if (registry.has_signal(path)) {
    static_cast<void>(registry.clear_signal(path));
  }
}

AlarmOperationResult register_or_refresh_signal(
    signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const std::string& alarm_id,
    const bool aggregate_signal) {
  if (registry.has_signal(descriptor.path)) {
    const auto clear_result = registry.clear_signal(descriptor.path);
    if (!clear_result.ok()) {
      return AlarmOperationResult{
          aggregate_signal ? wrap_aggregate_signal_error(clear_result.status) : wrap_signal_error(alarm_id, clear_result.status)};
    }

    const auto update_result = registry.update_signal(descriptor.path, initial_value, 0U, true, false);
    if (!update_result.ok()) {
      return AlarmOperationResult{
          aggregate_signal ? wrap_aggregate_signal_error(update_result.status) : wrap_signal_error(alarm_id, update_result.status)};
    }
    return AlarmOperationResult{AlarmStatus::success()};
  }

  const auto register_result = registry.register_signal(descriptor, initial_value, 0U, true, false);
  if (!register_result.ok()) {
    return AlarmOperationResult{
        aggregate_signal ? wrap_aggregate_signal_error(register_result.status) : wrap_signal_error(alarm_id, register_result.status)};
  }
  return AlarmOperationResult{AlarmStatus::success()};
}

RuntimeAlarmState make_initial_state() {
  RuntimeAlarmState state;
  state.initialized = true;
  return state;
}

bool compute_reset_allowed(const AlarmDescriptor& descriptor, const RuntimeAlarmState& state) {
  return descriptor.latching && state.active && state.latched && !state.condition_active;
}

void apply_condition_state(const AlarmDescriptor& descriptor, RuntimeAlarmState& state, const bool condition_active) {
  state.condition_active = condition_active;

  if (!descriptor.enabled) {
    state.active = false;
    state.latched = false;
    return;
  }

  if (!descriptor.latching) {
    state.active = condition_active;
    state.latched = false;
    return;
  }

  if (condition_active) {
    state.active = true;
    state.latched = true;
    return;
  }

  if (!state.latched) {
    state.active = false;
  }
}

}  // namespace

AlarmOperationResult validate_alarm_descriptor(const AlarmDescriptor& descriptor) {
  if (descriptor.id.empty()) {
    return AlarmOperationResult{
        AlarmStatus::error(AlarmErrorCode::alarm_invalid_descriptor, "Alarm id must not be empty.")};
  }
  if (descriptor.name.empty()) {
    return AlarmOperationResult{AlarmStatus::error(
        AlarmErrorCode::alarm_invalid_descriptor,
        "Alarm '" + descriptor.id + "' name must not be empty.")};
  }
  if (!is_supported_alarm_severity(descriptor.severity)) {
    return AlarmOperationResult{AlarmStatus::error(
        AlarmErrorCode::alarm_invalid_severity,
        "Alarm '" + descriptor.id + "' uses an unsupported severity.")};
  }
  if (!controller::signals::is_valid_signal_path(descriptor.id)) {
    return AlarmOperationResult{AlarmStatus::error(
        AlarmErrorCode::alarm_invalid_descriptor,
        "Alarm id '" + descriptor.id + "' must use dot-separated alphanumeric or underscore segments.")};
  }
  return AlarmOperationResult{AlarmStatus::success()};
}

AlarmService::AlarmService(signals::SignalRegistry* signal_registry, const std::size_t history_capacity)
    : signal_registry_(signal_registry), history_(history_capacity) {}

AlarmOperationResult AlarmService::register_alarm(const AlarmDescriptor& descriptor) {
  const auto validation = validate_alarm_descriptor(descriptor);
  if (!validation.ok()) {
    return validation;
  }
  if (alarms_by_id_.count(descriptor.id) != 0U) {
    return AlarmOperationResult{AlarmStatus::error(
        AlarmErrorCode::alarm_already_registered,
        "Alarm '" + descriptor.id + "' is already registered.")};
  }

  const RuntimeAlarmState initial_state = make_initial_state();

  const auto aggregate_signal_result = ensure_aggregate_signals_registered();
  if (!aggregate_signal_result.ok()) {
    return aggregate_signal_result;
  }

  if (descriptor.publish_signals) {
    const auto signal_result = register_alarm_signals(descriptor, initial_state);
    if (!signal_result.ok()) {
      return signal_result;
    }
  }

  registration_order_.push_back(descriptor.id);
  alarms_by_id_.emplace(descriptor.id, AlarmEntry{descriptor, initial_state});
  return AlarmOperationResult{AlarmStatus::success()};
}

AlarmOperationResult AlarmService::remove_alarm(const std::string& id, const AlarmTimestampMs now_ms) {
  const auto entry = alarms_by_id_.find(id);
  if (entry == alarms_by_id_.end()) {
    return AlarmOperationResult{
        AlarmStatus::error(AlarmErrorCode::alarm_not_found, "Alarm '" + id + "' is not registered.")};
  }

  if (signal_registry_ != nullptr && entry->second.descriptor.publish_signals) {
    clear_signal_if_present(*signal_registry_, alarm_signal_path(id, "condition_active"));
    clear_signal_if_present(*signal_registry_, alarm_signal_path(id, "active"));
    clear_signal_if_present(*signal_registry_, alarm_signal_path(id, "latched"));
    clear_signal_if_present(*signal_registry_, alarm_signal_path(id, "reset_allowed"));
    clear_signal_if_present(*signal_registry_, alarm_signal_path(id, "severity"));
    clear_signal_if_present(*signal_registry_, alarm_signal_path(id, "activation_count"));
    clear_signal_if_present(*signal_registry_, alarm_signal_path(id, "last_reason"));
  }

  registration_order_.erase(
      std::remove(registration_order_.begin(), registration_order_.end(), id),
      registration_order_.end());
  alarms_by_id_.erase(entry);

  AlarmStatus first_error = AlarmStatus::success();
  update_aggregate_status(now_ms, &first_error);
  return AlarmOperationResult{first_error};
}

bool AlarmService::has_alarm(const std::string& id) const {
  return alarms_by_id_.count(id) != 0U;
}

AlarmResult<AlarmDescriptor> AlarmService::get_descriptor(const std::string& id) const {
  AlarmResult<AlarmDescriptor> result;
  const auto entry = alarms_by_id_.find(id);
  if (entry == alarms_by_id_.end()) {
    result.status = AlarmStatus::error(AlarmErrorCode::alarm_not_found, "Alarm '" + id + "' is not registered.");
    return result;
  }

  result.status = AlarmStatus::success();
  result.value = entry->second.descriptor;
  return result;
}

std::vector<AlarmDescriptor> AlarmService::list_descriptors() const {
  std::vector<AlarmDescriptor> descriptors;
  descriptors.reserve(registration_order_.size());
  for (const auto& id : registration_order_) {
    descriptors.push_back(alarms_by_id_.at(id).descriptor);
  }
  return descriptors;
}

AlarmOperationResult AlarmService::set_condition(
    const std::string& id,
    const bool condition_active,
    const AlarmTimestampMs now_ms,
    std::string source,
    std::string reason) {
  const auto entry = alarms_by_id_.find(id);
  if (entry == alarms_by_id_.end()) {
    return AlarmOperationResult{
        AlarmStatus::error(AlarmErrorCode::alarm_not_found, "Alarm '" + id + "' is not registered.")};
  }

  const RuntimeAlarmState previous = entry->second.state;
  RuntimeAlarmState candidate = previous;

  apply_condition_state(entry->second.descriptor, candidate, condition_active);

  if (!previous.active && candidate.active) {
    ++candidate.activation_count;
    candidate.first_activated_ms = now_ms;
    candidate.acknowledged = false;
  } else if (previous.active && !candidate.active) {
    candidate.first_activated_ms = 0U;
  }

  candidate.reset_allowed = compute_reset_allowed(entry->second.descriptor, candidate);

  if (runtime_state_core_equals(previous, candidate)) {
    return AlarmOperationResult{AlarmStatus::success()};
  }

  candidate.last_changed_ms = now_ms;
  candidate.update_counter = previous.update_counter + 1U;
  candidate.last_source = std::move(source);
  candidate.last_reason = std::move(reason);

  entry->second.state = candidate;

  AlarmStatus first_error = AlarmStatus::success();
  if (entry->second.descriptor.publish_signals) {
    const auto signal_result = publish_alarm_signals(entry->second.descriptor, entry->second.state, now_ms);
    if (!signal_result.ok()) {
      first_error = signal_result.status;
    }
  }

  if (previous.condition_active != candidate.condition_active) {
    record_history(
        entry->second.descriptor,
        candidate.condition_active ? AlarmEventType::condition_raised : AlarmEventType::condition_cleared,
        now_ms,
        entry->second.state.last_source,
        entry->second.state.last_reason);
  }
  if (!previous.latched && candidate.latched) {
    record_history(
        entry->second.descriptor,
        AlarmEventType::latched,
        now_ms,
        entry->second.state.last_source,
        entry->second.state.last_reason);
  }

  update_aggregate_status(now_ms, &first_error);
  return AlarmOperationResult{first_error};
}

AlarmOperationResult AlarmService::raise_alarm(
    const std::string& id,
    const AlarmTimestampMs now_ms,
    std::string source,
    std::string reason) {
  return set_condition(id, true, now_ms, std::move(source), std::move(reason));
}

AlarmOperationResult AlarmService::clear_condition(
    const std::string& id,
    const AlarmTimestampMs now_ms,
    std::string source,
    std::string reason) {
  return set_condition(id, false, now_ms, std::move(source), std::move(reason));
}

AlarmOperationResult AlarmService::reset_alarm(
    const std::string& id,
    const AlarmTimestampMs now_ms,
    std::string source,
    std::string reason) {
  const auto entry = alarms_by_id_.find(id);
  if (entry == alarms_by_id_.end()) {
    return AlarmOperationResult{
        AlarmStatus::error(AlarmErrorCode::alarm_not_found, "Alarm '" + id + "' is not registered.")};
  }

  if (!entry->second.descriptor.latching) {
    return AlarmOperationResult{AlarmStatus::success()};
  }

  if (entry->second.state.condition_active) {
    record_history(entry->second.descriptor, AlarmEventType::reset_denied, now_ms, source, reason);
    return AlarmOperationResult{AlarmStatus::error(
        AlarmErrorCode::alarm_reset_denied,
        "Alarm '" + id + "' cannot be reset while its condition is still active.")};
  }

  const RuntimeAlarmState previous = entry->second.state;
  RuntimeAlarmState candidate = previous;
  candidate.active = false;
  candidate.latched = false;
  candidate.reset_allowed = false;
  candidate.first_activated_ms = 0U;

  if (runtime_state_core_equals(previous, candidate)) {
    return AlarmOperationResult{AlarmStatus::success()};
  }

  candidate.last_changed_ms = now_ms;
  candidate.update_counter = previous.update_counter + 1U;
  candidate.last_source = std::move(source);
  candidate.last_reason = std::move(reason);

  entry->second.state = candidate;

  AlarmStatus first_error = AlarmStatus::success();
  if (entry->second.descriptor.publish_signals) {
    const auto signal_result = publish_alarm_signals(entry->second.descriptor, entry->second.state, now_ms);
    if (!signal_result.ok()) {
      first_error = signal_result.status;
    }
  }

  record_history(
      entry->second.descriptor,
      AlarmEventType::reset,
      now_ms,
      entry->second.state.last_source,
      entry->second.state.last_reason);

  update_aggregate_status(now_ms, &first_error);
  return AlarmOperationResult{first_error};
}

AlarmResult<AlarmSnapshot> AlarmService::get_snapshot(const std::string& id) const {
  AlarmResult<AlarmSnapshot> result;
  const auto entry = alarms_by_id_.find(id);
  if (entry == alarms_by_id_.end()) {
    result.status = AlarmStatus::error(AlarmErrorCode::alarm_not_found, "Alarm '" + id + "' is not registered.");
    return result;
  }

  result.status = AlarmStatus::success();
  result.value = AlarmSnapshot{entry->second.descriptor, entry->second.state};
  return result;
}

std::vector<AlarmSnapshot> AlarmService::list_snapshots() const {
  std::vector<AlarmSnapshot> snapshots;
  snapshots.reserve(registration_order_.size());
  for (const auto& id : registration_order_) {
    const auto& entry = alarms_by_id_.at(id);
    snapshots.push_back(AlarmSnapshot{entry.descriptor, entry.state});
  }
  return snapshots;
}

AggregateAlarmStatus AlarmService::get_aggregate_status() const {
  return aggregate_status_;
}

std::vector<AlarmHistoryEntry> AlarmService::read_history() const {
  return history_.read();
}

void AlarmService::clear_history() {
  history_.clear();
}

AlarmOperationResult AlarmService::ensure_aggregate_signals_registered() {
  if (signal_registry_ == nullptr || aggregate_signals_registered_) {
    return AlarmOperationResult{AlarmStatus::success()};
  }

  const struct {
    std::string_view suffix;
    SignalType type;
  } definitions[] = {
      {"any_active", SignalType::boolean},
      {"info_active", SignalType::boolean},
      {"warning_active", SignalType::boolean},
      {"inhibit_active", SignalType::boolean},
      {"trip_active", SignalType::boolean},
      {"safety_active", SignalType::boolean},
      {"active_count", SignalType::int64},
      {"highest_severity", SignalType::string},
  };

  const auto register_bool = [&](const std::string_view suffix, const bool value, const std::string& name) -> AlarmOperationResult {
    const auto signal_descriptor = make_aggregate_signal_descriptor(
        aggregate_signal_path(suffix),
        name,
        SignalType::boolean,
        "");
    return register_or_refresh_signal(*signal_registry_, signal_descriptor, SignalValue{value}, "", true);
  };

  const auto register_int = [&](const std::string_view suffix, const std::uint64_t value, const std::string& name) -> AlarmOperationResult {
    const auto signal_descriptor = make_aggregate_signal_descriptor(
        aggregate_signal_path(suffix),
        name,
        SignalType::int64,
        "count");
    return register_or_refresh_signal(
        *signal_registry_,
        signal_descriptor,
        SignalValue{to_signal_int64(value)},
        "",
        true);
  };

  const auto register_string = [&](const std::string_view suffix, const std::string& value, const std::string& name) -> AlarmOperationResult {
    const auto signal_descriptor = make_aggregate_signal_descriptor(
        aggregate_signal_path(suffix),
        name,
        SignalType::string,
        "");
    return register_or_refresh_signal(*signal_registry_, signal_descriptor, SignalValue{value}, "", true);
  };

  auto result = register_bool("any_active", aggregate_status_.any_active, "Alarm any active");
  if (!result.ok()) {
    return result;
  }
  result = register_bool("info_active", aggregate_status_.info_active, "Alarm info active");
  if (!result.ok()) {
    return result;
  }
  result = register_bool("warning_active", aggregate_status_.warning_active, "Alarm warning active");
  if (!result.ok()) {
    return result;
  }
  result = register_bool("inhibit_active", aggregate_status_.inhibit_active, "Alarm inhibit active");
  if (!result.ok()) {
    return result;
  }
  result = register_bool("trip_active", aggregate_status_.trip_active, "Alarm trip active");
  if (!result.ok()) {
    return result;
  }
  result = register_bool("safety_active", aggregate_status_.safety_active, "Alarm safety active");
  if (!result.ok()) {
    return result;
  }
  result = register_int("active_count", aggregate_status_.active_count, "Alarm active count");
  if (!result.ok()) {
    return result;
  }
  result = register_string("highest_severity", "", "Alarm highest severity");
  if (!result.ok()) {
    return result;
  }

  aggregate_signals_registered_ = true;
  return AlarmOperationResult{AlarmStatus::success()};
}

AlarmOperationResult AlarmService::register_alarm_signals(
    const AlarmDescriptor& descriptor,
    const RuntimeAlarmState& state) {
  if (signal_registry_ == nullptr || !descriptor.publish_signals) {
    return AlarmOperationResult{AlarmStatus::success()};
  }

  const struct {
    std::string_view suffix;
    SignalType type;
  } definitions[] = {
      {"condition_active", SignalType::boolean},
      {"active", SignalType::boolean},
      {"latched", SignalType::boolean},
      {"reset_allowed", SignalType::boolean},
      {"severity", SignalType::string},
      {"activation_count", SignalType::int64},
      {"last_reason", SignalType::string},
  };

  const auto register_bool = [&](const std::string_view suffix, const bool value) -> AlarmOperationResult {
    const auto signal_descriptor = make_signal_descriptor(
        descriptor,
        alarm_signal_path(descriptor.id, suffix),
        std::string{suffix},
        SignalType::boolean,
        "");
    return register_or_refresh_signal(*signal_registry_, signal_descriptor, SignalValue{value}, descriptor.id, false);
  };

  const auto register_int = [&](const std::string_view suffix, const std::uint64_t value) -> AlarmOperationResult {
    const auto signal_descriptor = make_signal_descriptor(
        descriptor,
        alarm_signal_path(descriptor.id, suffix),
        std::string{suffix},
        SignalType::int64,
        "count");
    return register_or_refresh_signal(
        *signal_registry_,
        signal_descriptor,
        SignalValue{to_signal_int64(value)},
        descriptor.id,
        false);
  };

  const auto register_string = [&](const std::string_view suffix, const std::string& value) -> AlarmOperationResult {
    const auto signal_descriptor = make_signal_descriptor(
        descriptor,
        alarm_signal_path(descriptor.id, suffix),
        std::string{suffix},
        SignalType::string,
        "");
    return register_or_refresh_signal(*signal_registry_, signal_descriptor, SignalValue{value}, descriptor.id, false);
  };

  auto result = register_bool("condition_active", state.condition_active);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("active", state.active);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("latched", state.latched);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("reset_allowed", state.reset_allowed);
  if (!result.ok()) {
    return result;
  }
  result = register_string("severity", to_string(descriptor.severity));
  if (!result.ok()) {
    return result;
  }
  result = register_int("activation_count", state.activation_count);
  if (!result.ok()) {
    return result;
  }
  return register_string("last_reason", state.last_reason);
}

AlarmOperationResult AlarmService::publish_alarm_signals(
    const AlarmDescriptor& descriptor,
    const RuntimeAlarmState& state,
    const AlarmTimestampMs now_ms) {
  if (signal_registry_ == nullptr || !descriptor.publish_signals) {
    return AlarmOperationResult{AlarmStatus::success()};
  }

  const auto update_bool = [&](const std::string_view suffix, const bool value) -> AlarmOperationResult {
    const auto update_result = signal_registry_->update_signal(
        alarm_signal_path(descriptor.id, suffix),
        SignalValue{value},
        now_ms,
        true,
        false);
    if (!update_result.ok()) {
      return AlarmOperationResult{wrap_signal_error(descriptor.id, update_result.status)};
    }
    return AlarmOperationResult{AlarmStatus::success()};
  };

  const auto update_int = [&](const std::string_view suffix, const std::uint64_t value) -> AlarmOperationResult {
    const auto update_result = signal_registry_->update_signal(
        alarm_signal_path(descriptor.id, suffix),
        SignalValue{to_signal_int64(value)},
        now_ms,
        true,
        false);
    if (!update_result.ok()) {
      return AlarmOperationResult{wrap_signal_error(descriptor.id, update_result.status)};
    }
    return AlarmOperationResult{AlarmStatus::success()};
  };

  const auto update_string = [&](const std::string_view suffix, const std::string& value) -> AlarmOperationResult {
    const auto update_result = signal_registry_->update_signal(
        alarm_signal_path(descriptor.id, suffix),
        SignalValue{value},
        now_ms,
        true,
        false);
    if (!update_result.ok()) {
      return AlarmOperationResult{wrap_signal_error(descriptor.id, update_result.status)};
    }
    return AlarmOperationResult{AlarmStatus::success()};
  };

  auto result = update_bool("condition_active", state.condition_active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("active", state.active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("latched", state.latched);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("reset_allowed", state.reset_allowed);
  if (!result.ok()) {
    return result;
  }
  result = update_string("severity", to_string(descriptor.severity));
  if (!result.ok()) {
    return result;
  }
  result = update_int("activation_count", state.activation_count);
  if (!result.ok()) {
    return result;
  }
  return update_string("last_reason", state.last_reason);
}

AlarmOperationResult AlarmService::publish_aggregate_signals(const AlarmTimestampMs now_ms) {
  if (signal_registry_ == nullptr || !aggregate_signals_registered_) {
    return AlarmOperationResult{AlarmStatus::success()};
  }

  const auto update_bool = [&](const std::string_view suffix, const bool value) -> AlarmOperationResult {
    const auto update_result = signal_registry_->update_signal(
        aggregate_signal_path(suffix),
        SignalValue{value},
        now_ms,
        true,
        false);
    if (!update_result.ok()) {
      return AlarmOperationResult{wrap_aggregate_signal_error(update_result.status)};
    }
    return AlarmOperationResult{AlarmStatus::success()};
  };

  const auto update_int = [&](const std::string_view suffix, const std::uint64_t value) -> AlarmOperationResult {
    const auto update_result = signal_registry_->update_signal(
        aggregate_signal_path(suffix),
        SignalValue{to_signal_int64(value)},
        now_ms,
        true,
        false);
    if (!update_result.ok()) {
      return AlarmOperationResult{wrap_aggregate_signal_error(update_result.status)};
    }
    return AlarmOperationResult{AlarmStatus::success()};
  };

  const auto update_string = [&](const std::string_view suffix, const std::string& value) -> AlarmOperationResult {
    const auto update_result = signal_registry_->update_signal(
        aggregate_signal_path(suffix),
        SignalValue{value},
        now_ms,
        true,
        false);
    if (!update_result.ok()) {
      return AlarmOperationResult{wrap_aggregate_signal_error(update_result.status)};
    }
    return AlarmOperationResult{AlarmStatus::success()};
  };

  auto result = update_bool("any_active", aggregate_status_.any_active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("info_active", aggregate_status_.info_active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("warning_active", aggregate_status_.warning_active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("inhibit_active", aggregate_status_.inhibit_active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("trip_active", aggregate_status_.trip_active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("safety_active", aggregate_status_.safety_active);
  if (!result.ok()) {
    return result;
  }
  result = update_int("active_count", aggregate_status_.active_count);
  if (!result.ok()) {
    return result;
  }
  return update_string(
      "highest_severity",
      aggregate_status_.highest_severity.has_value() ? to_string(*aggregate_status_.highest_severity) : "");
}

AggregateAlarmStatus AlarmService::compute_aggregate_status() const {
  AggregateAlarmStatus status;
  for (const auto& id : registration_order_) {
    const auto& entry = alarms_by_id_.at(id);
    if (!entry.state.active) {
      continue;
    }

    status.any_active = true;
    ++status.active_count;

    switch (entry.descriptor.severity) {
      case AlarmSeverity::info:
        status.info_active = true;
        break;
      case AlarmSeverity::warning:
        status.warning_active = true;
        break;
      case AlarmSeverity::inhibit:
        status.inhibit_active = true;
        break;
      case AlarmSeverity::trip:
        status.trip_active = true;
        break;
      case AlarmSeverity::safety:
        status.safety_active = true;
        break;
    }

    if (!status.highest_severity.has_value() ||
        alarm_severity_rank(entry.descriptor.severity) > alarm_severity_rank(*status.highest_severity)) {
      status.highest_severity = entry.descriptor.severity;
      status.highest_severity_alarm_id = entry.descriptor.id;
    }
  }

  return status;
}

void AlarmService::update_aggregate_status(const AlarmTimestampMs now_ms, AlarmStatus* first_error) {
  AggregateAlarmStatus next = compute_aggregate_status();
  if (aggregate_status_core_equals(aggregate_status_, next)) {
    return;
  }

  next.update_counter = aggregate_status_.update_counter + 1U;
  aggregate_status_ = std::move(next);

  const auto publish_result = publish_aggregate_signals(now_ms);
  if (!publish_result.ok() && first_error != nullptr && first_error->ok()) {
    *first_error = publish_result.status;
  }
}

void AlarmService::record_history(
    const AlarmDescriptor& descriptor,
    const AlarmEventType event_type,
    const AlarmTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  if (!descriptor.history_enabled) {
    return;
  }

  history_.append(AlarmHistoryEntry{
      0U,
      descriptor.id,
      event_type,
      descriptor.severity,
      now_ms,
      source,
      reason,
  });
}

}  // namespace controller::alarms
