#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace controller::sequence {

using SequenceTimestampMs = std::uint64_t;
using SequenceDurationMs = std::uint64_t;
using SequenceUpdateCounter = std::uint64_t;
using SequenceHistorySequenceNumber = std::uint64_t;

enum class SequenceProgramType {
  generic,
  pump,
  compressor,
  burner,
  incinerator,
  dosing,
  custom,
};

enum class SequenceStateType {
  generic,
  wait,
  action,
  purge,
  ignition,
  run,
  stop,
  cooldown,
  lockout,
  custom,
};

enum class SequenceActionKind {
  relay_request,
  pwm_request,
  timer_start,
  timer_stop,
  alarm_set_condition,
  write_virtual_signal,
  log_note,
};

enum class SequenceActionSection {
  entry,
  active,
  exit,
};

enum class SequenceLifecycle {
  idle,
  running,
  normal_stop_requested,
  trip_requested,
  lockout,
  completed,
};

enum class SequenceEventType {
  program_started,
  state_entered,
  state_exited,
  transition_taken,
  start_denied,
  normal_stop_requested,
  trip_requested,
  guard_failed,
  timeout,
  reset,
  reset_denied,
  program_completed,
};

struct SequenceRuntimeState {
  std::optional<std::string> active_program_id;
  SequenceLifecycle lifecycle{SequenceLifecycle::idle};
  std::optional<std::string> current_state_id;
  std::optional<std::string> previous_state_id;
  SequenceTimestampMs state_entered_ms{0U};
  SequenceDurationMs state_elapsed_ms{0U};
  bool pending_normal_stop{false};
  bool pending_trip{false};
  bool lockout{false};
  std::string last_reason;
  SequenceUpdateCounter update_counter{0U};
};

const char* to_string(SequenceProgramType type);
const char* to_string(SequenceStateType type);
const char* to_string(SequenceActionKind kind);
const char* to_string(SequenceActionSection section);
const char* to_string(SequenceLifecycle lifecycle);
const char* to_string(SequenceEventType event_type);

}  // namespace controller::sequence
