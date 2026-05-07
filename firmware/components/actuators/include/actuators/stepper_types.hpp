#pragma once

#include <cstdint>
#include <optional>

#include "hal/hal_common.hpp"
#include "signals/signal_types.hpp"

namespace controller::actuators {

using StepperTimestampMs = controller::signals::SignalTimestampMs;
using StepperUpdateCounter = std::uint64_t;
using StepperHistorySequenceNumber = std::uint64_t;

enum class StepperRuntimeState {
  disabled,
  need_homing,
  homing,
  ready,
  moving,
  manual_jog,
  fault,
};

enum class StepperHistoryEventType {
  registered,
  enabled,
  disabled,
  home_started,
  home_completed,
  move_commanded,
  target_reached,
  jog_started,
  jog_stopped,
  stopped,
  emergency_stopped,
  fault_entered,
  fault_cleared,
  limit_reached,
  command_rejected,
};

const char* to_string(StepperRuntimeState state);
const char* to_string(StepperHistoryEventType event_type);
const char* to_string(controller::hal::StepperDirection direction);

}  // namespace controller::actuators
