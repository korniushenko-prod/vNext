#pragma once

#include <optional>
#include <string>

#include "actuators/motor_types.hpp"

namespace controller::actuators {

struct MotorSnapshot {
  std::string id;
  std::string name;
  bool enabled{false};
  MotorRuntimeState runtime_state{MotorRuntimeState::stopped};
  bool requested_run{false};
  double requested_speed_percent{0.0};
  MotorDirection requested_direction{MotorDirection::forward};
  bool effective_run{false};
  double effective_speed_percent{0.0};
  MotorDirection effective_direction{MotorDirection::forward};
  bool fault{false};
  std::string fault_reason;
  std::optional<double> tach_value;
  std::uint64_t runtime_ms{0U};
  std::uint64_t start_count{0U};
  std::string last_reason;
  MotorUpdateCounter update_counter{0U};
};

}  // namespace controller::actuators
