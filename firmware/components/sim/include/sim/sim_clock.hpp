#pragma once

#include "sim/sim_types.hpp"

namespace controller::sim {

class SimClock {
 public:
  explicit SimClock(SimTimestampMs initial_time_ms = 0U);

  SimTimestampMs now_ms() const;
  void set_time_ms(SimTimestampMs value);
  void advance_ms(SimDurationMs delta_ms);

 private:
  SimTimestampMs current_time_ms_{0U};
};

}  // namespace controller::sim
