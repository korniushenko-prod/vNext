#pragma once

#include <cstdint>
#include <optional>
#include <string>

#include "actuators/actuator_types.hpp"
#include "signals/signal_types.hpp"

namespace controller::actuators {

using MotorTimestampMs = controller::signals::SignalTimestampMs;
using MotorUpdateCounter = std::uint64_t;
using MotorHistorySequenceNumber = std::uint64_t;

enum class MotorDirection {
  forward,
  reverse,
};

enum class MotorRuntimeState {
  stopped,
  starting_boost,
  ramping_up,
  running,
  ramping_down,
  reversing_delay,
  fault,
};

enum class MotorHistoryEventType {
  registered,
  command_received,
  started,
  stopped,
  direction_changed,
  fault_entered,
  fault_cleared,
  output_requested,
  output_cleared,
};

struct MotorCommand {
  bool run{false};
  double speed_percent{0.0};
  MotorDirection direction{MotorDirection::forward};
  ActuatorPriority priority{ActuatorPriority::manual};
  std::string source;
  std::string reason;
  MotorTimestampMs now_ms{0U};
};

const char* to_string(MotorDirection direction);
const char* to_string(MotorRuntimeState state);
const char* to_string(MotorHistoryEventType event_type);

}  // namespace controller::actuators
