#pragma once

#include <string>

#include "timers/timer_result.hpp"
#include "timers/timer_types.hpp"

namespace controller::timers {

struct TimerDescriptor {
  std::string id;
  std::string name;
  std::string description;
  bool enabled{true};
  TimerKind kind{TimerKind::ton};
  TimerDurationMs duration_ms{0U};
  std::string source_module;
  bool publish_signals{true};
  bool initial_input_state{false};
  bool visible{true};
};

TimerOperationResult validate_timer_descriptor(const TimerDescriptor& descriptor);

}  // namespace controller::timers
