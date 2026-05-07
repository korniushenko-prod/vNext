#pragma once

#include <optional>

#include "pid/pid_config.hpp"
#include "pid/pid_result.hpp"
#include "pid/pid_snapshot.hpp"

namespace controller::pid {

using PidComputeResult = PidResult<PidSnapshot>;

class PidCore {
 public:
  PidCore();
  explicit PidCore(const PidConfig& config);

  PidOperationResult set_config(const PidConfig& config);
  const PidConfig& get_config() const;

  PidOperationResult set_setpoint(double setpoint);
  double get_setpoint() const;

  PidOperationResult set_mode(
      PidMode mode,
      PidTimestampMs now_ms,
      std::optional<double> current_process_value = std::nullopt);
  PidMode get_mode() const;

  PidOperationResult set_manual_output(double manual_output);
  double get_manual_output() const;

  PidComputeResult compute(double process_value, PidTimestampMs now_ms);

  void reset();
  void reset_integral();

  PidOperationResult set_output_limits(double output_min, double output_max);
  PidOperationResult set_integral_limits(double integral_min, double integral_max);

  PidSnapshot get_snapshot() const;

 private:
  struct RuntimeState {
    bool initialized{false};
    PidTimestampMs last_compute_ms{0U};
    double last_process_value{0.0};
    double raw_error{0.0};
    double effective_error{0.0};
    double setpoint{0.0};
    PidMode mode{PidMode::manual};
    double last_output{0.0};
    double manual_output{0.0};
    double p_term{0.0};
    double i_term{0.0};
    double d_term{0.0};
    bool saturated_high{false};
    bool saturated_low{false};
    PidUpdateCounter update_counter{0U};
  };

  PidConfig config_;
  RuntimeState state_{};
  bool has_process_value_{false};
  bool auto_timing_initialized_{false};
  bool pending_bumpless_auto_{false};

  void apply_runtime_defaults();
  PidSnapshot make_snapshot() const;
};

}  // namespace controller::pid
