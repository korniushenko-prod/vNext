#pragma once

#include <optional>
#include <string>

#include "pid/pid_service_types.hpp"
#include "pid/pid_types.hpp"

namespace controller::pid {

struct PidServiceSnapshot {
  std::string id;
  std::string name;
  bool enabled{false};
  PidServiceMode requested_mode{PidServiceMode::disabled};
  PidServiceMode effective_mode{PidServiceMode::disabled};
  bool fault{false};
  std::string fault_reason;
  std::string pv_signal_path;
  PidSetpointSourceKind sp_source_kind{PidSetpointSourceKind::constant};
  std::optional<std::string> sp_signal_path;
  std::string output_target_id;
  std::optional<double> pv;
  std::optional<double> sp;
  double output{0.0};
  double manual_output{0.0};
  double raw_error{0.0};
  double effective_error{0.0};
  double p_term{0.0};
  double i_term{0.0};
  double d_term{0.0};
  bool saturated_high{false};
  bool saturated_low{false};
  bool updated{false};
  PidTimestampMs last_compute_ms{0U};
  PidUpdateCounter update_counter{0U};
};

}  // namespace controller::pid
