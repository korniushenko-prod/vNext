#include "sim/sim_clock.hpp"

namespace controller::sim {

SimClock::SimClock(const SimTimestampMs initial_time_ms)
    : current_time_ms_(initial_time_ms) {}

SimTimestampMs SimClock::now_ms() const {
  return current_time_ms_;
}

void SimClock::set_time_ms(const SimTimestampMs value) {
  current_time_ms_ = value;
}

void SimClock::advance_ms(const SimDurationMs delta_ms) {
  current_time_ms_ += delta_ms;
}

}  // namespace controller::sim
