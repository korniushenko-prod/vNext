#pragma once

#include <string>

#include "timers/timer_types.hpp"

namespace controller::timers {

struct RuntimeTimerState {
  bool initialized{false};
  bool input_state{false};
  bool active{false};
  bool timing{false};
  bool done{false};
  bool expired{false};
  bool armed{false};
  TimerTimestampMs last_transition_ms{0U};
  TimerTimestampMs start_ms{0U};
  TimerDurationMs elapsed_ms{0U};
  TimerDurationMs remaining_ms{0U};
  TimerUpdateCounter update_counter{0U};
  TimerTimestampMs last_input_change_ms{0U};
};

struct TimerSnapshot {
  std::string id;
  TimerKind kind{TimerKind::ton};
  bool initialized{false};
  bool input_state{false};
  bool active{false};
  bool timing{false};
  bool done{false};
  bool expired{false};
  bool armed{false};
  TimerDurationMs elapsed_ms{0U};
  TimerDurationMs remaining_ms{0U};
  TimerTimestampMs last_transition_ms{0U};
  TimerUpdateCounter update_counter{0U};
};

}  // namespace controller::timers
