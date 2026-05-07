#pragma once

#include <cstdint>
#include <optional>
#include <string>

#include "actuators/stepper_types.hpp"

namespace controller::actuators {

struct StepperSnapshot {
  std::string id;
  std::string name;
  bool enabled{false};
  StepperRuntimeState runtime_state{StepperRuntimeState::disabled};
  bool homed{false};
  bool need_homing{false};
  bool moving{false};
  bool fault{false};
  std::string fault_reason;
  std::int64_t position_steps{0};
  double position_percent{0.0};
  std::optional<std::int64_t> target_steps;
  std::optional<double> target_percent;
  controller::hal::StepperDirection direction{controller::hal::StepperDirection::forward};
  double command_speed_steps_per_sec{0.0};
  std::optional<bool> home_signal;
  std::optional<bool> limit_min;
  std::optional<bool> limit_max;
  std::string last_reason;
  StepperUpdateCounter update_counter{0U};
};

}  // namespace controller::actuators
