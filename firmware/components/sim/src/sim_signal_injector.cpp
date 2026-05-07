#include "sim/sim_signal_injector.hpp"

#include <algorithm>
#include <type_traits>
#include <utility>
#include <variant>

#include "sim/sim_harness.hpp"

namespace controller::sim {

namespace {

SimStatus signal_fault_event_status(
    SimHarness& harness,
    const SimSignalFaultEvent& event,
    const SimTimestampMs now_ms) {
  std::optional<controller::signals::SignalValue> value = event.value;
  if (!value.has_value()) {
    const auto current = harness.registry.read_signal(event.signal_path, now_ms);
    if (!current.ok() || !current.value->value.has_value()) {
      return SimStatus::error(
          SimErrorCode::sim_event_error,
          "Cannot change fault state for signal '" + event.signal_path + "' without a current value.");
    }
    value = current.value->value;
  }

  const auto update = harness.registry.update_signal(event.signal_path, *value, now_ms, event.valid, event.fault);
  if (!update.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_event_error,
        "Failed to inject fault state for signal '" + event.signal_path + "': " + update.status.message);
  }
  return SimStatus::success();
}

}  // namespace

bool SimSignalInjector::event_less(const SimScheduledEvent& lhs, const SimScheduledEvent& rhs) {
  if (lhs.at_ms != rhs.at_ms) {
    return lhs.at_ms < rhs.at_ms;
  }
  return lhs.id < rhs.id;
}

SimStatus SimSignalInjector::add_event(const SimScheduledEvent& event) {
  const auto duplicate = std::find_if(events_.begin(), events_.end(), [&](const SimScheduledEvent& existing) {
    return existing.id == event.id;
  });
  if (duplicate != events_.end()) {
    return SimStatus::error(
        SimErrorCode::sim_duplicate_id,
        "Scheduled simulator event id '" + event.id + "' is already registered.");
  }

  events_.push_back(event);
  std::sort(events_.begin(), events_.end(), event_less);
  return SimStatus::success();
}

SimStatus SimSignalInjector::schedule_signal_write(
    std::string id,
    const SimTimestampMs at_ms,
    std::string signal_path,
    controller::signals::SignalValue value,
    const bool valid,
    const bool fault) {
  return add_event(SimScheduledEvent{
      std::move(id),
      at_ms,
      SimSignalWriteEvent{std::move(signal_path), std::move(value), valid, fault},
      false,
  });
}

SimStatus SimSignalInjector::schedule_fault(
    std::string id,
    const SimTimestampMs at_ms,
    std::string signal_path,
    const bool fault,
    std::optional<controller::signals::SignalValue> value,
    const bool valid) {
  return add_event(SimScheduledEvent{
      std::move(id),
      at_ms,
      SimSignalFaultEvent{std::move(signal_path), std::move(value), valid, fault},
      false,
  });
}

SimStatus SimSignalInjector::schedule_bool_interval(
    const std::string id_prefix,
    const SimTimestampMs start_ms,
    const SimTimestampMs end_ms,
    const std::string signal_path,
    const bool active_value,
    const bool inactive_value) {
  if (end_ms < start_ms) {
    return SimStatus::error(
        SimErrorCode::sim_invalid_argument,
        "Boolean interval for signal '" + signal_path + "' ends before it starts.");
  }

  auto status = schedule_signal_write(
      id_prefix + ".start",
      start_ms,
      signal_path,
      controller::signals::SignalValue{active_value});
  if (!status.ok()) {
    return status;
  }
  return schedule_signal_write(
      id_prefix + ".end",
      end_ms,
      signal_path,
      controller::signals::SignalValue{inactive_value});
}

SimStatus SimSignalInjector::schedule_pulse_increment(
    std::string id,
    const SimTimestampMs at_ms,
    std::string pulse_input_id,
    const std::uint64_t delta) {
  return add_event(SimScheduledEvent{
      std::move(id),
      at_ms,
      SimPulseCountEvent{std::move(pulse_input_id), delta},
      false,
  });
}

SimStatus SimSignalInjector::schedule_pulse_frequency(
    std::string id,
    const SimTimestampMs at_ms,
    std::string pulse_input_id,
    const double frequency_hz) {
  return add_event(SimScheduledEvent{
      std::move(id),
      at_ms,
      SimPulseFrequencyEvent{std::move(pulse_input_id), frequency_hz},
      false,
  });
}

SimStatus SimSignalInjector::schedule_alarm_condition(
    std::string id,
    const SimTimestampMs at_ms,
    std::string alarm_id,
    const bool condition_active,
    std::string source,
    std::string reason) {
  return add_event(SimScheduledEvent{
      std::move(id),
      at_ms,
      SimAlarmConditionEvent{std::move(alarm_id), condition_active, std::move(source), std::move(reason)},
      false,
  });
}

SimStatus SimSignalInjector::process_due_events(
    SimHarness& harness,
    const SimTimestampMs now_ms,
    std::size_t& processed_count) {
  processed_count = 0U;

  for (auto& scheduled : events_) {
    if (scheduled.processed || scheduled.at_ms > now_ms) {
      continue;
    }

    const auto status = std::visit(
        [&](auto&& payload) -> SimStatus {
          using T = std::decay_t<decltype(payload)>;
          if constexpr (std::is_same_v<T, SimSignalWriteEvent>) {
            const auto update = harness.registry.update_signal(payload.signal_path, payload.value, now_ms, payload.valid, payload.fault);
            if (!update.ok()) {
              return SimStatus::error(
                  SimErrorCode::sim_event_error,
                  "Failed to write signal '" + payload.signal_path + "': " + update.status.message);
            }
            return SimStatus::success();
          } else if constexpr (std::is_same_v<T, SimSignalFaultEvent>) {
            return signal_fault_event_status(harness, payload, now_ms);
          } else if constexpr (std::is_same_v<T, SimPulseCountEvent>) {
            const auto update = harness.pulse_input_hal.increment_mock_count(payload.pulse_input_id, payload.delta);
            if (!update.ok()) {
              return SimStatus::error(
                  SimErrorCode::sim_event_error,
                  "Failed to increment pulse input '" + payload.pulse_input_id + "': " + update.message);
            }
            return SimStatus::success();
          } else if constexpr (std::is_same_v<T, SimPulseFrequencyEvent>) {
            const auto update = harness.pulse_input_hal.set_mock_frequency_hz(payload.pulse_input_id, payload.frequency_hz);
            if (!update.ok()) {
              return SimStatus::error(
                  SimErrorCode::sim_event_error,
                  "Failed to set pulse frequency for '" + payload.pulse_input_id + "': " + update.message);
            }
            return SimStatus::success();
          } else if constexpr (std::is_same_v<T, SimAlarmConditionEvent>) {
            const auto result = harness.alarm_service.set_condition(
                payload.alarm_id,
                payload.condition_active,
                now_ms,
                payload.source,
                payload.reason);
            if (!result.ok()) {
              return SimStatus::error(
                  SimErrorCode::sim_event_error,
                  "Failed to set alarm condition for '" + payload.alarm_id + "': " + result.status.message);
            }
            return SimStatus::success();
          } else if constexpr (std::is_same_v<T, SimSequenceCommandEvent>) {
            switch (payload.kind) {
              case SimSequenceCommandEvent::Kind::set_enabled:
                return harness.set_program_enabled(payload.program_id, payload.enabled, now_ms);
              case SimSequenceCommandEvent::Kind::start_program:
                return harness.start_program(payload.program_id, now_ms, payload.source, payload.reason);
              case SimSequenceCommandEvent::Kind::request_normal_stop:
                return harness.request_normal_stop(now_ms, payload.source, payload.reason);
              case SimSequenceCommandEvent::Kind::request_trip_stop:
                return harness.request_trip_stop(now_ms, payload.source, payload.reason);
              case SimSequenceCommandEvent::Kind::reset_active_program:
                return harness.reset_active_program(now_ms, payload.source, payload.reason);
            }
          } else if constexpr (std::is_same_v<T, SimFlowCommandEvent>) {
            switch (payload.kind) {
              case SimFlowCommandEvent::Kind::start_batch:
                return harness.start_batch(payload.flow_id, now_ms, payload.target_override_units, payload.source, payload.reason);
              case SimFlowCommandEvent::Kind::stop_batch:
                return harness.stop_batch(payload.flow_id, now_ms, payload.source, payload.reason);
              case SimFlowCommandEvent::Kind::reset_batch_total: {
                const auto result = harness.flow_service.reset_batch_total(payload.flow_id, now_ms, payload.source, payload.reason);
                return result.ok() ? SimStatus::success()
                                   : SimStatus::error(
                                         SimErrorCode::sim_event_error,
                                         "Failed to reset batch total for '" + payload.flow_id + "': " + result.status.message);
              }
              case SimFlowCommandEvent::Kind::reset_trip_total: {
                const auto result = harness.flow_service.reset_trip_total(payload.flow_id, now_ms, payload.source, payload.reason);
                return result.ok() ? SimStatus::success()
                                   : SimStatus::error(
                                         SimErrorCode::sim_event_error,
                                         "Failed to reset trip total for '" + payload.flow_id + "': " + result.status.message);
              }
            }
          } else if constexpr (std::is_same_v<T, SimPidCommandEvent>) {
            switch (payload.kind) {
              case SimPidCommandEvent::Kind::set_enabled:
                return harness.set_pid_enabled(payload.pid_id, payload.enabled, now_ms);
              case SimPidCommandEvent::Kind::set_mode:
                return harness.set_pid_mode(payload.pid_id, payload.mode, now_ms);
              case SimPidCommandEvent::Kind::set_setpoint:
                return harness.set_pid_setpoint(payload.pid_id, payload.value, now_ms);
              case SimPidCommandEvent::Kind::set_manual_output:
                return harness.set_pid_manual_output(payload.pid_id, payload.value, now_ms);
              case SimPidCommandEvent::Kind::reset_integral:
                return harness.reset_pid_integral(payload.pid_id, now_ms);
            }
          } else if constexpr (std::is_same_v<T, SimCustomEvent>) {
            return payload.callback != nullptr
                       ? payload.callback(harness, now_ms)
                       : SimStatus::error(SimErrorCode::sim_event_error, "Scheduled custom simulator event has no callback.");
          }

          return SimStatus::error(SimErrorCode::sim_event_error, "Unsupported simulator event payload.");
        },
        scheduled.event);

    if (!status.ok()) {
      return status;
    }

    scheduled.processed = true;
    ++processed_count;
  }

  return SimStatus::success();
}

}  // namespace controller::sim
