#pragma once

#include <cstdint>

#include "pid/pid_types.hpp"

namespace controller::pid {

using PidServiceTimestampMs = PidTimestampMs;
using PidServiceHistorySequenceNumber = std::uint64_t;

enum class PidServiceMode {
  disabled,
  manual,
  auto_mode,
  hold,
  fault,
};

enum class PidSetpointSourceKind {
  constant,
  signal,
};

enum class PidServiceHistoryEventType {
  registered,
  mode_changed,
  enabled,
  disabled,
  fault_entered,
  fault_cleared,
  setpoint_changed,
  manual_output_changed,
  integral_reset,
  output_requested,
  output_cleared,
};

const char* to_string(PidServiceMode mode);
const char* to_string(PidSetpointSourceKind kind);
const char* to_string(PidServiceHistoryEventType event_type);

}  // namespace controller::pid
