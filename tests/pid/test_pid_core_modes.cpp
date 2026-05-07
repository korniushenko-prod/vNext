#include <cmath>
#include <iostream>
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
  config.id = "pid.modes";
  config.name = "Modes PID";
  config.kp = 1.0;
  config.ki = 0.5;
  config.kd = 0.0;
  config.sample_time_ms = 100U;
  config.mode = PidMode::manual;
  config.output_min = 0.0;
  config.output_max = 100.0;
  config.integral_min = -100.0;
  config.integral_max = 100.0;
  config.manual_output = 42.0;
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
    PidCore pid(make_config());
    pid.set_setpoint(50.0);
    const auto result = pid.compute(20.0, 0U);

    expect_true(result.ok(), "manual-mode compute should succeed");
    expect_true(result.value->mode == PidMode::manual, "manual snapshot should report manual mode");
    expect_near(result.value->output, 42.0, 1e-9, "manual mode should output manual_output");
  }

  {
    auto config = make_config();
    config.mode = PidMode::auto_mode;
    config.manual_output = std::nullopt;

    PidCore pid(config);
    pid.set_setpoint(50.0);
    const auto result = pid.compute(20.0, 0U);

    expect_true(result.ok(), "auto-mode compute should succeed");
    expect_true(result.value->mode == PidMode::auto_mode, "auto snapshot should report auto mode");
    expect_true(result.value->output > 0.0, "auto mode should compute a control effort");
  }

  {
    auto config = make_config();
    config.mode = PidMode::auto_mode;
    PidCore pid(config);
    pid.set_setpoint(50.0);
    const auto first = pid.compute(20.0, 0U);
    expect_true(pid.set_mode(PidMode::hold, 10U).ok(), "set_mode(hold) should succeed");
    const auto held = pid.compute(10.0, 100U);

    expect_code(held.status.code, PidStatusCode::PID_NOT_UPDATED, "hold mode should not update the controller");
    expect_true(held.has_value(), "hold mode should still expose a snapshot");
    expect_near(held.value->output, first.value->output, 1e-9, "hold mode should freeze last output");
    expect_true(held.value->update_counter == first.value->update_counter, "hold mode should not increment update counter");
  }

  {
    PidCore pid(make_config());
    pid.set_setpoint(50.0);
    const auto manual = pid.compute(30.0, 0U);
    expect_true(pid.set_mode(PidMode::auto_mode, 100U, 30.0).ok(), "manual-to-auto transition should succeed");
    const auto auto_result = pid.compute(30.0, 100U);

    expect_true(auto_result.ok(), "first auto compute after manual should succeed");
    expect_near(auto_result.value->output, manual.value->output, 1.0, "manual-to-auto transition should be bumpless");
  }

  {
    auto config = make_config();
    config.mode = PidMode::auto_mode;
    PidCore pid(config);
    pid.set_setpoint(100.0);
    auto result = pid.compute(0.0, 0U);
    result = pid.compute(0.0, 100U);
    expect_true(result.value->i_term > 0.0, "integral should accumulate before reset_integral");

    pid.reset_integral();
    expect_near(pid.get_snapshot().i_term, 0.0, 1e-9, "reset_integral should zero the integral term");
  }

  {
    auto config = make_config();
    config.mode = PidMode::auto_mode;
    PidCore pid(config);
    pid.set_setpoint(90.0);
    (void)pid.compute(10.0, 0U);
    pid.reset();
    const auto snapshot = pid.get_snapshot();

    expect_true(!snapshot.initialized, "reset should clear initialized flag");
    expect_true(snapshot.update_counter == 0U, "reset should clear update counter");
    expect_near(snapshot.p_term, 0.0, 1e-9, "reset should clear proportional term");
    expect_near(snapshot.i_term, 0.0, 1e-9, "reset should clear integral term");
    expect_near(snapshot.d_term, 0.0, 1e-9, "reset should clear derivative term");
  }

  if (failures != 0) {
    std::cerr << "test_pid_core_modes failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_core_modes passed\n";
  return 0;
}
