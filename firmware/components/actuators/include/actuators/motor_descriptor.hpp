#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace controller::actuators {

struct MotorDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string pwm_target_id;
  std::optional<std::string> enable_target_id;
  std::optional<std::string> direction_target_id;
  std::optional<std::string> brake_target_id;
  std::optional<std::string> fault_signal_path;
  std::optional<std::string> tach_signal_path;
  bool allow_reverse{false};
  bool fault_clears_output{true};
  double min_speed_percent{0.0};
  double max_speed_percent{100.0};
  double safe_speed_percent{0.0};
  std::optional<double> start_boost_percent;
  std::optional<std::uint64_t> start_boost_ms;
  double ramp_up_percent_per_sec{100.0};
  double ramp_down_percent_per_sec{100.0};
  std::uint64_t reverse_delay_ms{0U};
  bool publish_signals{true};
};

}  // namespace controller::actuators
