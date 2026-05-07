#pragma once

#include <cstdint>

namespace controller::timers {

using TimerTimestampMs = std::uint64_t;
using TimerDurationMs = std::uint64_t;
using TimerUpdateCounter = std::uint64_t;

enum class TimerKind {
  ton,
  tof,
  tp,
  min_on,
  min_off,
  watchdog,
  startup_bypass,
  cooldown,
  state_min_time,
  state_max_time,
};

bool is_input_driven_timer(TimerKind kind);
bool is_manual_window_timer(TimerKind kind);
bool is_watchdog_timer(TimerKind kind);
const char* to_string(TimerKind kind);

}  // namespace controller::timers
