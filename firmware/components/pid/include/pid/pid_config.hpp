#pragma once

#include <cstdint>
#include <optional>
#include <string>

#include "pid/pid_result.hpp"
#include "pid/pid_types.hpp"

namespace controller::pid {

struct PidConfig {
  std::string id;
  std::string name;
  bool enabled{true};
  double kp{0.0};
  double ki{0.0};
  double kd{0.0};
  std::uint32_t sample_time_ms{1000U};
  PidMode mode{PidMode::manual};
  PidDirection direction{PidDirection::direct};
  double output_min{0.0};
  double output_max{100.0};
  double integral_min{-100.0};
  double integral_max{100.0};
  double deadband{0.0};
  std::optional<double> manual_output;
  DerivativeMode derivative_mode{DerivativeMode::on_measurement};
};

PidValidationResult validate_config(const PidConfig& config);

}  // namespace controller::pid
