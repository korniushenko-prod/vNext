#pragma once

#include <optional>
#include <string>

#include "actuators/actuator_types.hpp"
#include "pid/pid_config.hpp"
#include "pid/pid_service_types.hpp"

namespace controller::pid {

struct PidServiceDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  PidConfig core_config;
  std::string pv_signal_path;
  PidSetpointSourceKind setpoint_source_kind{PidSetpointSourceKind::constant};
  std::optional<double> constant_setpoint;
  std::optional<std::string> setpoint_signal_path;
  std::string output_target_id;
  controller::actuators::ActuatorTargetKind output_target_kind{controller::actuators::ActuatorTargetKind::pwm};
  bool stale_as_fault{true};
  bool invalid_as_fault{true};
  bool fault_clears_output{true};
  bool publish_signals{true};
};

}  // namespace controller::pid
