#include <cmath>
#include <iostream>
#include <string>

#include "pid/pid_core.hpp"

using controller::pid::PidConfig;
using controller::pid::PidCore;
using controller::pid::PidDirection;
using controller::pid::PidMode;

namespace {

int failures = 0;

PidConfig make_config() {
  PidConfig config{};
  config.id = "pid.limits";
  config.name = "Limits PID";
  config.kp = 0.0;
  config.ki = 0.0;
  config.kd = 0.0;
  config.sample_time_ms = 100U;
  config.mode = PidMode::auto_mode;
  config.direction = PidDirection::direct;
  config.output_min = 0.0;
  config.output_max = 100.0;
  config.integral_min = -20.0;
  config.integral_max = 20.0;
  config.deadband = 0.0;
  return config;
}

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
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
    auto config = make_config();
    config.kp = 25.0;
    config.output_max = 50.0;

    PidCore pid(config);
    pid.set_setpoint(10.0);
    const auto result = pid.compute(0.0, 0U);

    expect_true(result.ok(), "output clamp compute should succeed");
    expect_near(result.value->output, 50.0, 1e-9, "output should clamp at output_max");
    expect_true(result.value->saturated_high, "high saturation flag should be set");
  }

  {
    auto config = make_config();
    config.ki = 30.0;
    config.sample_time_ms = 1000U;
    config.integral_min = -5.0;
    config.integral_max = 5.0;
    config.output_min = -100.0;
    config.output_max = 100.0;

    PidCore pid(config);
    pid.set_setpoint(1.0);
    auto result = pid.compute(0.0, 0U);
    result = pid.compute(0.0, 1000U);

    expect_true(result.ok(), "integral clamp compute should succeed");
    expect_near(result.value->i_term, 5.0, 1e-9, "integral term should clamp at integral_max");
  }

  {
    auto config = make_config();
    config.ki = 10.0;
    config.sample_time_ms = 1000U;
    config.output_max = 5.0;
    config.integral_min = -100.0;
    config.integral_max = 100.0;

    PidCore pid(config);
    pid.set_setpoint(10.0);
    auto result = pid.compute(0.0, 0U);
    const double first_i_term = result.value->i_term;
    result = pid.compute(0.0, 1000U);
    const double second_i_term = result.value->i_term;
    result = pid.compute(0.0, 2000U);
    const double third_i_term = result.value->i_term;

    expect_near(result.value->output, 5.0, 1e-9, "anti-windup test output should stay clamped");
    expect_true(first_i_term <= 5.0 + 1e-9, "anti-windup should not let integral exceed the saturation boundary on first update");
    expect_near(second_i_term, first_i_term, 1e-9, "anti-windup should stop further high-side integral growth");
    expect_near(third_i_term, first_i_term, 1e-9, "anti-windup should remain stable across repeated saturated steps");
  }

  {
    auto config = make_config();
    config.kp = 4.0;
    config.ki = 3.0;
    config.deadband = 0.5;
    config.output_min = -100.0;
    config.output_max = 100.0;

    PidCore pid(config);
    pid.set_setpoint(10.0);
    auto result = pid.compute(10.2, 0U);
    const double first_integral = result.value->i_term;
    result = pid.compute(10.4, 100U);

    expect_true(result.ok(), "deadband compute should succeed");
    expect_near(result.value->raw_error, -0.4, 1e-9, "raw error should still be reported inside deadband");
    expect_near(result.value->effective_error, 0.0, 1e-9, "effective error should be zeroed inside deadband");
    expect_near(result.value->i_term, first_integral, 1e-9, "integral should not accumulate inside deadband");
  }

  if (failures != 0) {
    std::cerr << "test_pid_core_limits failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_core_limits passed\n";
  return 0;
}
