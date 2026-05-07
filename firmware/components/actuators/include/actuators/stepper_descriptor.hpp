#pragma once

#include <cstdint>
#include <optional>
#include <string>

#include "hal/hal_common.hpp"

namespace controller::actuators {

struct StepperDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string hal_stepper_id;
  std::int64_t min_steps{0};
  std::int64_t max_steps{0};
  bool home_required_on_boot{false};
  std::int64_t home_position_steps{0};
  double move_speed_steps_per_sec{0.0};
  double home_speed_steps_per_sec{0.0};
  double jog_speed_steps_per_sec{0.0};
  controller::hal::StepperDirection home_direction{controller::hal::StepperDirection::reverse};
  std::optional<std::string> home_signal_path;
  std::optional<std::string> limit_min_signal_path;
  std::optional<std::string> limit_max_signal_path;
  std::optional<std::string> fault_signal_path;
  bool publish_signals{true};
};

}  // namespace controller::actuators
