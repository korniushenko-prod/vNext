#include <cmath>
#include <iostream>
#include <string>

#include "pid/pid_core.hpp"

using controller::pid::DerivativeMode;
using controller::pid::PidConfig;
using controller::pid::PidCore;
using controller::pid::PidDirection;
using controller::pid::PidMode;
using controller::pid::PidStatusCode;
using controller::pid::validate_config;

namespace {

int failures = 0;

PidConfig make_config() {
  PidConfig config{};
  config.id = "pid.basic";
  config.name = "Basic PID";
  config.enabled = true;
  config.kp = 2.0;
  config.ki = 0.5;
  config.kd = 0.0;
  config.sample_time_ms = 100U;
  config.mode = PidMode::auto_mode;
  config.direction = PidDirection::direct;
  config.output_min = -100.0;
  config.output_max = 100.0;
  config.integral_min = -50.0;
  config.integral_max = 50.0;
  config.deadband = 0.0;
  config.derivative_mode = DerivativeMode::on_measurement;
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

void expect_code(const controller::pid::PidStatusCode actual, const PidStatusCode expected, const std::string& message) {
  if (actual != expected) {
    std::cerr << "FAIL: " << message << " expected code=" << static_cast<int>(expected)
              << " actual=" << static_cast<int>(actual) << '\n';
    ++failures;
  }
}

}  // namespace

int main() {
  {
    const auto validation = validate_config(make_config());
    expect_true(validation.ok(), "valid PID config should be accepted");
  }

  {
    auto invalid = make_config();
    invalid.id = "";
    invalid.sample_time_ms = 0U;
    invalid.output_min = 20.0;
    invalid.output_max = 10.0;

    const auto validation = validate_config(invalid);
    expect_code(validation.status.code, PidStatusCode::PID_INVALID_CONFIG, "invalid config should return PID_INVALID_CONFIG");
    expect_true(validation.issues.size() >= 3U, "invalid config should report validation issues");
  }

  {
    PidCore pid(make_config());
    expect_true(pid.set_setpoint(10.0).ok(), "setpoint should be accepted");

    const auto first = pid.compute(7.0, 0U);
    expect_true(first.ok(), "first compute should update immediately");
    expect_near(first.value->raw_error, 3.0, 1e-9, "direct mode raw_error should be setpoint - process_value");
    expect_true(first.value->update_counter == 1U, "first compute should increment update counter");

    const auto early = pid.compute(7.0, 50U);
    expect_code(early.status.code, PidStatusCode::PID_NOT_UPDATED, "compute before sample time should not update");
    expect_true(early.has_value(), "not-updated result should still carry a snapshot");
    expect_true(early.value->update_counter == 1U, "not-updated snapshot should preserve update counter");

    const auto second = pid.compute(7.0, 100U);
    expect_true(second.ok(), "compute at sample time should update");
    expect_true(second.value->update_counter == 2U, "second eligible compute should increment update counter");
  }

  {
    PidCore pid(make_config());
    pid.set_setpoint(10.0);
    const auto result = pid.compute(7.0, 0U);

    expect_true(result.ok(), "direct-mode compute should succeed");
    expect_near(result.value->output, 6.15, 1e-9, "direct-mode output should follow kp + ki contribution");
    expect_near(result.value->effective_error, 3.0, 1e-9, "effective error should match raw error with zero deadband");
  }

  {
    auto reverse = make_config();
    reverse.direction = PidDirection::reverse;
    reverse.ki = 0.0;
    PidCore pid(reverse);
    pid.set_setpoint(10.0);
    const auto result = pid.compute(13.0, 0U);

    expect_true(result.ok(), "reverse-mode compute should succeed");
    expect_near(result.value->raw_error, 3.0, 1e-9, "reverse raw_error should be process_value - setpoint");
    expect_near(result.value->output, 6.0, 1e-9, "reverse output should use reversed sign convention");
  }

  {
    PidCore pid(make_config());
    pid.set_setpoint(12.5);
    const auto result = pid.compute(11.0, 0U);
    const auto snapshot = pid.get_snapshot();

    expect_true(result.ok(), "snapshot coherence compute should succeed");
    expect_true(snapshot.id == "pid.basic", "snapshot should expose config id");
    expect_true(snapshot.name == "Basic PID", "snapshot should expose config name");
    expect_true(snapshot.mode == PidMode::auto_mode, "snapshot should expose current mode");
    expect_true(snapshot.direction == PidDirection::direct, "snapshot should expose direction");
    expect_near(snapshot.setpoint, 12.5, 1e-9, "snapshot should expose current setpoint");
    expect_near(snapshot.process_value, 11.0, 1e-9, "snapshot should expose latest process value");
    expect_near(snapshot.output, result.value->output, 1e-9, "snapshot output should match compute result");
  }

  if (failures != 0) {
    std::cerr << "test_pid_core_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_core_basic passed\n";
  return 0;
}
