#include "timers/timer_service.hpp"

#include <algorithm>
#include <cstdint>
#include <limits>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::timers {

namespace {

using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::signals::SignalValue;

bool state_core_equals(const RuntimeTimerState& lhs, const RuntimeTimerState& rhs) {
  return lhs.initialized == rhs.initialized && lhs.input_state == rhs.input_state && lhs.active == rhs.active &&
         lhs.timing == rhs.timing && lhs.done == rhs.done && lhs.expired == rhs.expired && lhs.armed == rhs.armed &&
         lhs.start_ms == rhs.start_ms && lhs.elapsed_ms == rhs.elapsed_ms && lhs.remaining_ms == rhs.remaining_ms &&
         lhs.last_input_change_ms == rhs.last_input_change_ms;
}

bool state_transition_equals(const RuntimeTimerState& lhs, const RuntimeTimerState& rhs) {
  return lhs.input_state == rhs.input_state && lhs.active == rhs.active && lhs.timing == rhs.timing &&
         lhs.done == rhs.done && lhs.expired == rhs.expired && lhs.armed == rhs.armed;
}

TimerDurationMs compute_elapsed(const TimerTimestampMs now_ms, const TimerTimestampMs start_ms, const TimerDurationMs duration_ms) {
  if (now_ms <= start_ms) {
    return 0U;
  }

  const auto delta = now_ms - start_ms;
  return std::min(delta, duration_ms);
}

void set_elapsed_values(RuntimeTimerState& state, const TimerDurationMs elapsed_ms, const TimerDurationMs duration_ms) {
  state.elapsed_ms = std::min(elapsed_ms, duration_ms);
  state.remaining_ms = duration_ms - state.elapsed_ms;
}

std::int64_t to_signal_int64(const TimerDurationMs value) {
  constexpr auto max_value = static_cast<TimerDurationMs>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

RuntimeTimerState make_initial_state(const TimerDescriptor& descriptor) {
  RuntimeTimerState state;
  state.initialized = true;
  state.input_state = descriptor.initial_input_state;
  state.remaining_ms = descriptor.duration_ms;
  return state;
}

void set_idle_state(RuntimeTimerState& state, const TimerDurationMs duration_ms) {
  state.active = false;
  state.timing = false;
  state.done = false;
  state.expired = false;
  state.armed = false;
  state.start_ms = 0U;
  state.elapsed_ms = 0U;
  state.remaining_ms = duration_ms;
}

void synchronize_timer_state(
    const TimerDescriptor& descriptor,
    RuntimeTimerState& state,
    const TimerTimestampMs now_ms,
    const bool allow_auto_start) {
  const auto duration_ms = descriptor.duration_ms;

  if (!descriptor.enabled) {
    set_idle_state(state, duration_ms);
    return;
  }

  switch (descriptor.kind) {
    case TimerKind::ton:
      if (!state.input_state) {
        set_idle_state(state, duration_ms);
        return;
      }
      if (!state.active && !state.done && !state.timing && allow_auto_start) {
        state.timing = true;
        state.start_ms = now_ms;
      }
      if (state.timing) {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        state.active = elapsed_ms >= duration_ms;
        state.timing = elapsed_ms < duration_ms;
        state.done = elapsed_ms >= duration_ms;
      } else if (state.active || state.done) {
        state.active = true;
        state.timing = false;
        state.done = true;
        state.elapsed_ms = duration_ms;
        state.remaining_ms = 0U;
      } else {
        state.elapsed_ms = 0U;
        state.remaining_ms = duration_ms;
      }
      return;

    case TimerKind::tof:
      if (state.input_state) {
        state.active = true;
        state.timing = false;
        state.done = false;
        state.start_ms = 0U;
        state.elapsed_ms = 0U;
        state.remaining_ms = 0U;
        return;
      }
      if (state.timing) {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        state.active = elapsed_ms < duration_ms;
        state.timing = elapsed_ms < duration_ms;
        state.done = elapsed_ms >= duration_ms;
      } else if (state.done) {
        state.active = false;
        state.timing = false;
        state.done = true;
        state.elapsed_ms = duration_ms;
        state.remaining_ms = 0U;
      } else {
        set_idle_state(state, duration_ms);
      }
      return;

    case TimerKind::tp:
      if (state.timing || state.active) {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        state.active = elapsed_ms < duration_ms;
        state.timing = elapsed_ms < duration_ms;
        state.done = elapsed_ms >= duration_ms;
      } else if (state.done) {
        state.active = false;
        state.timing = false;
        state.done = true;
        state.elapsed_ms = duration_ms;
        state.remaining_ms = 0U;
      } else {
        set_idle_state(state, duration_ms);
      }
      return;

    case TimerKind::min_on:
      if (state.input_state && !state.active && allow_auto_start) {
        state.active = true;
        state.timing = true;
        state.done = false;
        state.start_ms = now_ms;
      }
      if (state.active) {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        if (elapsed_ms >= duration_ms) {
          if (state.input_state) {
            state.active = true;
            state.timing = false;
            state.done = true;
          } else {
            set_idle_state(state, duration_ms);
          }
        } else {
          state.active = true;
          state.timing = true;
          state.done = false;
        }
      } else {
        set_idle_state(state, duration_ms);
      }
      return;

    case TimerKind::min_off:
      if (state.timing) {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        if (elapsed_ms >= duration_ms) {
          state.timing = false;
          state.done = true;
          state.active = state.input_state;
        } else {
          state.active = false;
          state.done = false;
        }
      } else if (state.input_state) {
        state.active = true;
        state.timing = false;
        if (state.done) {
          state.elapsed_ms = duration_ms;
          state.remaining_ms = 0U;
        } else {
          state.elapsed_ms = 0U;
          state.remaining_ms = 0U;
        }
      } else if (state.done) {
        state.active = false;
        state.timing = false;
        state.elapsed_ms = duration_ms;
        state.remaining_ms = 0U;
      } else {
        set_idle_state(state, duration_ms);
      }
      return;

    case TimerKind::watchdog:
      if (!state.armed) {
        set_idle_state(state, duration_ms);
        return;
      }
      if (state.expired) {
        state.active = true;
        state.timing = false;
        state.done = false;
        state.elapsed_ms = duration_ms;
        state.remaining_ms = 0U;
        return;
      }
      {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        state.active = true;
        state.timing = elapsed_ms < duration_ms;
        state.done = false;
        state.expired = elapsed_ms >= duration_ms;
      }
      return;

    case TimerKind::startup_bypass:
    case TimerKind::cooldown:
    case TimerKind::state_min_time:
      if (!state.armed) {
        state.active = false;
        state.timing = false;
        state.expired = false;
        if (state.done) {
          state.elapsed_ms = duration_ms;
          state.remaining_ms = 0U;
        } else {
          state.elapsed_ms = 0U;
          state.remaining_ms = duration_ms;
        }
        return;
      }
      {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        if (elapsed_ms >= duration_ms) {
          state.armed = false;
          state.active = false;
          state.timing = false;
          state.done = true;
        } else {
          state.active = true;
          state.timing = true;
          state.done = false;
        }
      }
      return;

    case TimerKind::state_max_time:
      if (state.armed) {
        const auto elapsed_ms = compute_elapsed(now_ms, state.start_ms, duration_ms);
        set_elapsed_values(state, elapsed_ms, duration_ms);
        if (elapsed_ms >= duration_ms) {
          state.armed = false;
          state.active = false;
          state.timing = false;
          state.done = false;
          state.expired = true;
        } else {
          state.active = true;
          state.timing = true;
          state.done = false;
          state.expired = false;
        }
      } else if (state.expired) {
        state.active = false;
        state.timing = false;
        state.done = false;
        state.elapsed_ms = duration_ms;
        state.remaining_ms = 0U;
      } else {
        set_idle_state(state, duration_ms);
      }
      return;
  }
}

TimerSnapshot make_snapshot(const TimerDescriptor& descriptor, const RuntimeTimerState& state) {
  return TimerSnapshot{
      descriptor.id,
      descriptor.kind,
      state.initialized,
      state.input_state,
      state.active,
      state.timing,
      state.done,
      state.expired,
      state.armed,
      state.elapsed_ms,
      state.remaining_ms,
      state.last_transition_ms,
      state.update_counter,
  };
}

SignalDescriptor make_signal_descriptor(
    const TimerDescriptor& timer_descriptor,
    const std::string& path,
    const std::string& suffix,
    const SignalType type,
    const std::string& unit) {
  return SignalDescriptor{
      path,
      timer_descriptor.name + " " + suffix,
      "TimerService status for " + timer_descriptor.id,
      type,
      unit,
      timer_descriptor.source_module.empty() ? "timer_service" : timer_descriptor.source_module,
      SignalAccessMode::read_only,
      0U,
      timer_descriptor.enabled,
      timer_descriptor.visible,
  };
}

std::string make_signal_path(const std::string& id, const std::string_view suffix) {
  return id + "." + std::string{suffix};
}

TimerStatus wrap_signal_error(const std::string& timer_id, const controller::signals::SignalStatus& status) {
  return TimerStatus::error(
      TimerErrorCode::timer_signal_publish_failed,
      "Timer '" + timer_id + "' signal publication failed: " + status.message);
}

}  // namespace

bool is_input_driven_timer(const TimerKind kind) {
  switch (kind) {
    case TimerKind::ton:
    case TimerKind::tof:
    case TimerKind::tp:
    case TimerKind::min_on:
    case TimerKind::min_off:
      return true;
    case TimerKind::watchdog:
    case TimerKind::startup_bypass:
    case TimerKind::cooldown:
    case TimerKind::state_min_time:
    case TimerKind::state_max_time:
      return false;
  }
  return false;
}

bool is_manual_window_timer(const TimerKind kind) {
  switch (kind) {
    case TimerKind::startup_bypass:
    case TimerKind::cooldown:
    case TimerKind::state_min_time:
    case TimerKind::state_max_time:
      return true;
    case TimerKind::ton:
    case TimerKind::tof:
    case TimerKind::tp:
    case TimerKind::min_on:
    case TimerKind::min_off:
    case TimerKind::watchdog:
      return false;
  }
  return false;
}

bool is_watchdog_timer(const TimerKind kind) {
  return kind == TimerKind::watchdog;
}

const char* to_string(const TimerKind kind) {
  switch (kind) {
    case TimerKind::ton:
      return "TON";
    case TimerKind::tof:
      return "TOF";
    case TimerKind::tp:
      return "TP";
    case TimerKind::min_on:
      return "MIN_ON";
    case TimerKind::min_off:
      return "MIN_OFF";
    case TimerKind::watchdog:
      return "WATCHDOG";
    case TimerKind::startup_bypass:
      return "STARTUP_BYPASS";
    case TimerKind::cooldown:
      return "COOLDOWN";
    case TimerKind::state_min_time:
      return "STATE_MIN_TIME";
    case TimerKind::state_max_time:
      return "STATE_MAX_TIME";
  }
  return "UNKNOWN_TIMER_KIND";
}

const char* to_string(const TimerErrorCode code) {
  switch (code) {
    case TimerErrorCode::ok:
      return "OK";
    case TimerErrorCode::timer_already_registered:
      return "TIMER_ALREADY_REGISTERED";
    case TimerErrorCode::timer_not_found:
      return "TIMER_NOT_FOUND";
    case TimerErrorCode::timer_invalid_descriptor:
      return "TIMER_INVALID_DESCRIPTOR";
    case TimerErrorCode::timer_invalid_duration:
      return "TIMER_INVALID_DURATION";
    case TimerErrorCode::timer_operation_unsupported:
      return "TIMER_OPERATION_UNSUPPORTED";
    case TimerErrorCode::timer_type_mismatch:
      return "TIMER_TYPE_MISMATCH";
    case TimerErrorCode::timer_not_armed:
      return "TIMER_NOT_ARMED";
    case TimerErrorCode::timer_already_armed:
      return "TIMER_ALREADY_ARMED";
    case TimerErrorCode::timer_not_active:
      return "TIMER_NOT_ACTIVE";
    case TimerErrorCode::timer_already_expired:
      return "TIMER_ALREADY_EXPIRED";
    case TimerErrorCode::timer_internal_state_error:
      return "TIMER_INTERNAL_STATE_ERROR";
    case TimerErrorCode::timer_signal_publish_failed:
      return "TIMER_SIGNAL_PUBLISH_FAILED";
  }
  return "UNKNOWN_TIMER_ERROR";
}

TimerOperationResult validate_timer_descriptor(const TimerDescriptor& descriptor) {
  if (descriptor.id.empty()) {
    return TimerOperationResult{TimerStatus::error(TimerErrorCode::timer_invalid_descriptor, "Timer id must not be empty.")};
  }
  if (descriptor.name.empty()) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_invalid_descriptor,
        "Timer '" + descriptor.id + "' name must not be empty.")};
  }
  if (descriptor.duration_ms == 0U) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_invalid_duration,
        "Timer '" + descriptor.id + "' duration_ms must be greater than zero.")};
  }
  if (!controller::signals::is_valid_signal_path(descriptor.id)) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_invalid_descriptor,
        "Timer id '" + descriptor.id + "' must use dot-separated alphanumeric or underscore segments.")};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerService::TimerService(signals::SignalRegistry* signal_registry) : signal_registry_(signal_registry) {}

TimerStatus TimerService::apply_state_update(
    const TimerDescriptor& descriptor,
    RuntimeTimerState& state,
    const RuntimeTimerState& candidate,
    const bool has_now_ms,
    const TimerTimestampMs now_ms) {
  if (!state_core_equals(state, candidate)) {
    const auto transition_changed = !state_transition_equals(state, candidate);
    RuntimeTimerState next = candidate;
    next.update_counter = state.update_counter + 1U;
    next.last_transition_ms = transition_changed ? (has_now_ms ? now_ms : 0U) : state.last_transition_ms;
    state = next;

    const auto publish_result = publish_timer_signals(descriptor, state, now_ms);
    if (!publish_result.ok()) {
      return publish_result.status;
    }
  }

  return TimerStatus::success();
}

TimerStatus TimerService::sync_entry(
    const TimerDescriptor& descriptor,
    RuntimeTimerState& state,
    const TimerTimestampMs now_ms,
    const bool allow_auto_start) {
  RuntimeTimerState candidate = state;
  synchronize_timer_state(descriptor, candidate, now_ms, allow_auto_start);
  return apply_state_update(descriptor, state, candidate, true, now_ms);
}

TimerOperationResult TimerService::register_timer(const TimerDescriptor& descriptor) {
  const auto validation = validate_timer_descriptor(descriptor);
  if (!validation.ok()) {
    return validation;
  }
  if (timers_by_id_.count(descriptor.id) != 0U) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_already_registered,
        "Timer '" + descriptor.id + "' is already registered.")};
  }

  RuntimeTimerState initial_state = make_initial_state(descriptor);
  synchronize_timer_state(descriptor, initial_state, 0U, true);

  if (descriptor.publish_signals) {
    const auto signal_result = register_timer_signals(descriptor, initial_state);
    if (!signal_result.ok()) {
      return signal_result;
    }
  }

  registration_order_.push_back(descriptor.id);
  timers_by_id_.emplace(descriptor.id, TimerEntry{descriptor, initial_state});

  return TimerOperationResult{TimerStatus::success()};
}

bool TimerService::has_timer(const std::string& id) const {
  return timers_by_id_.count(id) != 0U;
}

TimerResult<TimerDescriptor> TimerService::get_descriptor(const std::string& id) const {
  TimerResult<TimerDescriptor> result;
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    result.status = TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.");
    return result;
  }
  result.status = TimerStatus::success();
  result.value = entry->second.descriptor;
  return result;
}

std::vector<TimerDescriptor> TimerService::list_descriptors() const {
  std::vector<TimerDescriptor> descriptors;
  descriptors.reserve(registration_order_.size());
  for (const auto& id : registration_order_) {
    descriptors.push_back(timers_by_id_.at(id).descriptor);
  }
  return descriptors;
}

TimerOperationResult TimerService::set_input(const std::string& id, const bool input, const TimerTimestampMs now_ms) {
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.")};
  }
  if (!is_input_driven_timer(entry->second.descriptor.kind)) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_operation_unsupported,
        "Timer '" + id + "' does not support set_input().")};
  }

  RuntimeTimerState candidate = entry->second.state;
  const bool previous_input = candidate.input_state;
  if (previous_input != input) {
    candidate.input_state = input;
    candidate.last_input_change_ms = now_ms;
  }

  switch (entry->second.descriptor.kind) {
    case TimerKind::tof:
      if (previous_input && !input) {
        candidate.start_ms = now_ms;
        candidate.timing = true;
        candidate.active = true;
        candidate.done = false;
      }
      break;
    case TimerKind::tp:
      if (!previous_input && input) {
        candidate.start_ms = now_ms;
        candidate.active = true;
        candidate.timing = true;
        candidate.done = false;
        candidate.expired = false;
      }
      break;
    case TimerKind::min_on:
      if (!previous_input && input) {
        candidate.start_ms = now_ms;
        candidate.active = true;
        candidate.timing = true;
        candidate.done = false;
      }
      break;
    case TimerKind::min_off:
      if (previous_input && !input && entry->second.state.active) {
        candidate.start_ms = now_ms;
        candidate.active = false;
        candidate.timing = true;
        candidate.done = false;
      }
      break;
    case TimerKind::ton:
    case TimerKind::watchdog:
    case TimerKind::startup_bypass:
    case TimerKind::cooldown:
    case TimerKind::state_min_time:
    case TimerKind::state_max_time:
      break;
  }

  synchronize_timer_state(entry->second.descriptor, candidate, now_ms, true);
  const auto status = apply_state_update(entry->second.descriptor, entry->second.state, candidate, true, now_ms);
  if (!status.ok()) {
    return TimerOperationResult{status};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerOperationResult TimerService::start_timer(const std::string& id, const TimerTimestampMs now_ms) {
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.")};
  }
  if (!is_manual_window_timer(entry->second.descriptor.kind)) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_operation_unsupported,
        "Timer '" + id + "' does not support start_timer().")};
  }

  RuntimeTimerState candidate = entry->second.state;
  candidate.armed = true;
  candidate.active = true;
  candidate.timing = true;
  candidate.done = false;
  candidate.expired = false;
  candidate.start_ms = now_ms;
  candidate.elapsed_ms = 0U;
  candidate.remaining_ms = entry->second.descriptor.duration_ms;

  synchronize_timer_state(entry->second.descriptor, candidate, now_ms, false);
  const auto status = apply_state_update(entry->second.descriptor, entry->second.state, candidate, true, now_ms);
  if (!status.ok()) {
    return TimerOperationResult{status};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerOperationResult TimerService::stop_timer(const std::string& id, const TimerTimestampMs now_ms) {
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.")};
  }
  if (!is_manual_window_timer(entry->second.descriptor.kind)) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_operation_unsupported,
        "Timer '" + id + "' does not support stop_timer().")};
  }

  RuntimeTimerState candidate = entry->second.state;
  set_idle_state(candidate, entry->second.descriptor.duration_ms);
  synchronize_timer_state(entry->second.descriptor, candidate, now_ms, false);
  const auto status = apply_state_update(entry->second.descriptor, entry->second.state, candidate, true, now_ms);
  if (!status.ok()) {
    return TimerOperationResult{status};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerOperationResult TimerService::arm_watchdog(const std::string& id, const TimerTimestampMs now_ms) {
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.")};
  }
  if (!is_watchdog_timer(entry->second.descriptor.kind)) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_operation_unsupported,
        "Timer '" + id + "' does not support arm_watchdog().")};
  }
  if (entry->second.state.armed) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_already_armed, "Watchdog '" + id + "' is already armed.")};
  }

  RuntimeTimerState candidate = entry->second.state;
  candidate.armed = true;
  candidate.active = true;
  candidate.timing = true;
  candidate.done = false;
  candidate.expired = false;
  candidate.start_ms = now_ms;
  candidate.elapsed_ms = 0U;
  candidate.remaining_ms = entry->second.descriptor.duration_ms;

  synchronize_timer_state(entry->second.descriptor, candidate, now_ms, false);
  const auto status = apply_state_update(entry->second.descriptor, entry->second.state, candidate, true, now_ms);
  if (!status.ok()) {
    return TimerOperationResult{status};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerOperationResult TimerService::kick_watchdog(const std::string& id, const TimerTimestampMs now_ms) {
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.")};
  }
  if (!is_watchdog_timer(entry->second.descriptor.kind)) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_operation_unsupported,
        "Timer '" + id + "' does not support kick_watchdog().")};
  }
  if (!entry->second.state.armed) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_armed, "Watchdog '" + id + "' is not armed.")};
  }
  if (entry->second.state.expired) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_already_expired,
        "Watchdog '" + id + "' has already expired and must be reset or disarmed.")};
  }

  RuntimeTimerState candidate = entry->second.state;
  candidate.start_ms = now_ms;
  candidate.active = true;
  candidate.timing = true;
  candidate.done = false;
  candidate.elapsed_ms = 0U;
  candidate.remaining_ms = entry->second.descriptor.duration_ms;

  synchronize_timer_state(entry->second.descriptor, candidate, now_ms, false);
  const auto status = apply_state_update(entry->second.descriptor, entry->second.state, candidate, true, now_ms);
  if (!status.ok()) {
    return TimerOperationResult{status};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerOperationResult TimerService::disarm_watchdog(const std::string& id, const TimerTimestampMs now_ms) {
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.")};
  }
  if (!is_watchdog_timer(entry->second.descriptor.kind)) {
    return TimerOperationResult{TimerStatus::error(
        TimerErrorCode::timer_operation_unsupported,
        "Timer '" + id + "' does not support disarm_watchdog().")};
  }
  if (!entry->second.state.armed) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_armed, "Watchdog '" + id + "' is not armed.")};
  }

  RuntimeTimerState candidate = entry->second.state;
  set_idle_state(candidate, entry->second.descriptor.duration_ms);
  synchronize_timer_state(entry->second.descriptor, candidate, now_ms, false);
  const auto status = apply_state_update(entry->second.descriptor, entry->second.state, candidate, true, now_ms);
  if (!status.ok()) {
    return TimerOperationResult{status};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerOperationResult TimerService::reset_timer(const std::string& id) {
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    return TimerOperationResult{
        TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.")};
  }

  RuntimeTimerState candidate = entry->second.state;
  candidate.active = false;
  candidate.timing = false;
  candidate.done = false;
  candidate.expired = false;
  candidate.armed = false;
  candidate.start_ms = 0U;
  candidate.elapsed_ms = 0U;
  candidate.remaining_ms = entry->second.descriptor.duration_ms;

  const auto status = apply_state_update(entry->second.descriptor, entry->second.state, candidate, false, 0U);
  if (!status.ok()) {
    return TimerOperationResult{status};
  }
  return TimerOperationResult{TimerStatus::success()};
}

TimerOperationResult TimerService::tick(const TimerTimestampMs now_ms) {
  TimerStatus first_error = TimerStatus::success();
  for (const auto& id : registration_order_) {
    auto& entry = timers_by_id_.at(id);
    const auto status = sync_entry(entry.descriptor, entry.state, now_ms, true);
    if (!status.ok() && first_error.ok()) {
      first_error = status;
    }
  }
  return TimerOperationResult{first_error};
}

TimerResult<TimerSnapshot> TimerService::get_snapshot(const std::string& id, const TimerTimestampMs now_ms) {
  TimerResult<TimerSnapshot> result;
  const auto entry = timers_by_id_.find(id);
  if (entry == timers_by_id_.end()) {
    result.status = TimerStatus::error(TimerErrorCode::timer_not_found, "Timer '" + id + "' is not registered.");
    return result;
  }

  const auto status = sync_entry(entry->second.descriptor, entry->second.state, now_ms, true);
  result.value = make_snapshot(entry->second.descriptor, entry->second.state);
  result.status = status.ok() ? TimerStatus::success() : status;
  return result;
}

TimerResult<std::vector<TimerSnapshot>> TimerService::list_snapshots(const TimerTimestampMs now_ms) {
  TimerResult<std::vector<TimerSnapshot>> result;
  std::vector<TimerSnapshot> snapshots;
  snapshots.reserve(registration_order_.size());

  TimerStatus first_error = TimerStatus::success();
  for (const auto& id : registration_order_) {
    auto& entry = timers_by_id_.at(id);
    const auto status = sync_entry(entry.descriptor, entry.state, now_ms, true);
    if (!status.ok() && first_error.ok()) {
      first_error = status;
    }
    snapshots.push_back(make_snapshot(entry.descriptor, entry.state));
  }

  result.value = std::move(snapshots);
  result.status = first_error.ok() ? TimerStatus::success() : first_error;
  return result;
}

TimerOperationResult TimerService::register_timer_signals(
    const TimerDescriptor& descriptor,
    const RuntimeTimerState& state) {
  if (signal_registry_ == nullptr || !descriptor.publish_signals) {
    return TimerOperationResult{TimerStatus::success()};
  }

  const struct {
    std::string_view suffix;
    SignalType type;
  } definitions[] = {
      {"active", SignalType::boolean},
      {"timing", SignalType::boolean},
      {"done", SignalType::boolean},
      {"expired", SignalType::boolean},
      {"armed", SignalType::boolean},
      {"input_state", SignalType::boolean},
      {"elapsed_ms", SignalType::int64},
      {"remaining_ms", SignalType::int64},
  };

  for (const auto& definition : definitions) {
    const auto path = make_signal_path(descriptor.id, definition.suffix);
    if (signal_registry_->has_signal(path)) {
      return TimerOperationResult{TimerStatus::error(
          TimerErrorCode::timer_signal_publish_failed,
          "Signal '" + path + "' is already registered.")};
    }
  }

  const auto register_bool = [&](const std::string_view suffix, const bool value) -> TimerOperationResult {
    const auto signal_descriptor = make_signal_descriptor(
        descriptor,
        make_signal_path(descriptor.id, suffix),
        std::string{suffix},
        SignalType::boolean,
        "");
    const auto register_result =
        signal_registry_->register_signal(signal_descriptor, SignalValue{value}, 0U, true, false);
    if (!register_result.ok()) {
      return TimerOperationResult{wrap_signal_error(descriptor.id, register_result.status)};
    }
    return TimerOperationResult{TimerStatus::success()};
  };

  const auto register_int = [&](const std::string_view suffix, const TimerDurationMs value) -> TimerOperationResult {
    const auto signal_descriptor = make_signal_descriptor(
        descriptor,
        make_signal_path(descriptor.id, suffix),
        std::string{suffix},
        SignalType::int64,
        "ms");
    const auto register_result =
        signal_registry_->register_signal(signal_descriptor, SignalValue{to_signal_int64(value)}, 0U, true, false);
    if (!register_result.ok()) {
      return TimerOperationResult{wrap_signal_error(descriptor.id, register_result.status)};
    }
    return TimerOperationResult{TimerStatus::success()};
  };

  auto result = register_bool("active", state.active);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("timing", state.timing);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("done", state.done);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("expired", state.expired);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("armed", state.armed);
  if (!result.ok()) {
    return result;
  }
  result = register_bool("input_state", state.input_state);
  if (!result.ok()) {
    return result;
  }
  result = register_int("elapsed_ms", state.elapsed_ms);
  if (!result.ok()) {
    return result;
  }
  return register_int("remaining_ms", state.remaining_ms);
}

TimerOperationResult TimerService::publish_timer_signals(
    const TimerDescriptor& descriptor,
    const RuntimeTimerState& state,
    const TimerTimestampMs now_ms) {
  if (signal_registry_ == nullptr || !descriptor.publish_signals) {
    return TimerOperationResult{TimerStatus::success()};
  }

  const auto update_bool = [&](const std::string_view suffix, const bool value) -> TimerOperationResult {
    const auto update_result =
        signal_registry_->update_signal(make_signal_path(descriptor.id, suffix), SignalValue{value}, now_ms, true, false);
    if (!update_result.ok()) {
      return TimerOperationResult{wrap_signal_error(descriptor.id, update_result.status)};
    }
    return TimerOperationResult{TimerStatus::success()};
  };

  const auto update_int = [&](const std::string_view suffix, const TimerDurationMs value) -> TimerOperationResult {
    const auto update_result = signal_registry_->update_signal(
        make_signal_path(descriptor.id, suffix),
        SignalValue{to_signal_int64(value)},
        now_ms,
        true,
        false);
    if (!update_result.ok()) {
      return TimerOperationResult{wrap_signal_error(descriptor.id, update_result.status)};
    }
    return TimerOperationResult{TimerStatus::success()};
  };

  auto result = update_bool("active", state.active);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("timing", state.timing);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("done", state.done);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("expired", state.expired);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("armed", state.armed);
  if (!result.ok()) {
    return result;
  }
  result = update_bool("input_state", state.input_state);
  if (!result.ok()) {
    return result;
  }
  result = update_int("elapsed_ms", state.elapsed_ms);
  if (!result.ok()) {
    return result;
  }
  return update_int("remaining_ms", state.remaining_ms);
}

}  // namespace controller::timers
