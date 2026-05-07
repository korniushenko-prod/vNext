#include <cmath>
#include <iostream>
#include <limits>
#include <string>

#include "pid/pid_core.hpp"

using controller::pid::PidConfig;
using controller::pid::PidCore;
using controller::pid::PidMode;
using controller::pid::PidStatusCode;

namespace {

int failures = 0;

PidConfig make_config() {
  PidConfig config{};
  config.id = "pid.faults";
  config.name = "Faults PID";
  config.kp = 1.0;
  config.ki = 0.1;
  config.kd = 0.0;
  config.sample_time_ms = 100U;
  config.mode = PidMode::auto_mode;
  config.output_min = -100.0;
  config.output_max = 100.0;
  config.integral_min = -20.0;
  config.integral_max = 20.0;
  return config;
}

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void expect_code(const controller::pid::PidStatusCode actual, const PidStatusCode expected, const std::string& message) {
  if (actual != expected) {
    std::cerr << "FAIL: " << message << " expected code=" << static_cast<int>(expected)
              << " actual=" << static_cast<int>(actual) << '\n';
    ++failures;
  }
}

void expect_near(const double actual, const double expected, const double tolerance, const std::string& message) {
  if (std::abs(actual - expected) > tolerance) {
    std::cerr << "FAIL: " << message << " expected=" << expected << " actual=" << actual << '\n';
    ++failures;
  }
}

}  // namespace

int main() {
  {
    PidCore pid(make_config());
    pid.set_setpoint(10.0);
    const auto valid = pid.compute(5.0, 0U);
    const auto snapshot_before = pid.get_snapshot();
    const auto invalid = pid.compute(std::numeric_limits<double>::quiet_NaN(), 100U);

    expect_true(valid.ok(), "baseline compute should succeed");
    expect_code(invalid.status.code, PidStatusCode::PID_INPUT_INVALID, "NaN process_value should be rejected");
    expect_true(invalid.has_value(), "invalid input result should still include a snapshot");
    expect_near(invalid.value->output, snapshot_before.output, 1e-9, "invalid input should not corrupt last output");
  }

  {
    PidCore pid(make_config());
    const auto status = pid.set_setpoint(std::numeric_limits<double>::infinity());
    expect_code(status.status.code, PidStatusCode::PID_INVALID_ARGUMENT, "non-finite setpoint should be rejected");
  }

  {
    PidCore pid(make_config());
    const auto status = pid.set_manual_output(std::numeric_limits<double>::quiet_NaN());
    expect_code(status.status.code, PidStatusCode::PID_INVALID_ARGUMENT, "non-finite manual_output should be rejected");
  }

  {
    PidCore pid(make_config());
    pid.set_setpoint(20.0);
    const auto first = pid.compute(0.0, 0U);
    const auto repeated = pid.compute(1.0, 0U);

    expect_true(first.ok(), "first compute should succeed");
    expect_code(repeated.status.code, PidStatusCode::PID_NOT_UPDATED, "repeated same now_ms should be stable");
    expect_near(repeated.value->output, first.value->output, 1e-9, "repeated same now_ms should preserve output");
    expect_true(repeated.value->update_counter == first.value->update_counter, "repeated same now_ms should not increment update counter");
  }

  {
    PidCore pid(make_config());
    pid.set_setpoint(20.0);
    (void)pid.compute(0.0, 0U);
    const auto early = pid.compute(0.0, 99U);

    expect_code(early.status.code, PidStatusCode::PID_NOT_UPDATED, "compute before sample interval should return PID_NOT_UPDATED");
  }

  if (failures != 0) {
    std::cerr << "test_pid_core_faults failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_core_faults passed\n";
  return 0;
}
