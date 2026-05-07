#pragma once

#include <string>

#include "pid/pid_types.hpp"

namespace controller::pid {

struct PidSnapshot {
  std::string id;
  std::string name;
  PidMode mode{PidMode::manual};
  PidDirection direction{PidDirection::direct};
  double setpoint{0.0};
  double process_value{0.0};
  double raw_error{0.0};
  double effective_error{0.0};
  double output{0.0};
  double manual_output{0.0};
  double p_term{0.0};
  double i_term{0.0};
  double d_term{0.0};
  bool saturated_high{false};
  bool saturated_low{false};
  bool initialized{false};
  PidTimestampMs last_compute_ms{0U};
  PidUpdateCounter update_counter{0U};
};

}  // namespace controller::pid
