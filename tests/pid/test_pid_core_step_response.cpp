#include <cmath>
#include <cstdint>
#include <iostream>
#include <string>

#include "pid/pid_core.hpp"

using controller::pid::PidConfig;
using controller::pid::PidCore;
using controller::pid::PidDirection;
using controller::pid::PidMode;

namespace {

int failures = 0;

struct FirstOrderPlant {
  double state{0.0};
  double time_constant_seconds{2.0};
  double gain{1.0};

  double step(const double input, const double dt_seconds) {
    const double target = gain * input;
    state += (target - state) * (dt_seconds / time_constant_seconds);
    return state;
  }
};

struct ReversePlant {
  double state{100.0};
  double time_constant_seconds{2.0};
  double bias{100.0};
  double gain{1.0};

  double step(const double input, const double dt_seconds) {
    const double target = bias - (gain * input);
    state += (target - state) * (dt_seconds / time_constant_seconds);
    return state;
  }
};

PidConfig make_direct_config() {
  PidConfig config{};
  config.id = "pid.step.direct";
  config.name = "Direct Step PID";
  config.kp = 1.8;
  config.ki = 0.6;
  config.kd = 0.1;
  config.sample_time_ms = 100U;
  config.mode = PidMode::auto_mode;
  config.direction = PidDirection::direct;
  config.output_min = 0.0;
  config.output_max = 100.0;
  config.integral_min = -40.0;
  config.integral_max = 80.0;
  config.deadband = 0.5;
  return config;
}

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

}  // namespace

int main() {
  {
    PidCore pid(make_direct_config());
    FirstOrderPlant plant{};
    pid.set_setpoint(60.0);

    double output = 0.0;
    for (std::uint64_t step = 0; step < 120U; ++step) {
      const double pv = plant.step(output, 0.1);
      const auto result = pid.compute(pv, step * 100U);
      if (result.ok()) {
        output = result.value->output;
      }
    }

    const auto snapshot = pid.get_snapshot();
    expect_true(std::abs(snapshot.process_value - 60.0) < 6.0, "direct step response should converge toward setpoint");
    expect_true(snapshot.output >= 0.0 && snapshot.output <= 100.0, "direct step response should respect output limits");
  }

  {
    auto config = make_direct_config();
    config.kp = 0.0;
    config.ki = 0.0;
    config.kd = 0.0;
    config.deadband = 0.5;

    PidCore pid(config);
    pid.set_setpoint(10.0);
    const auto result = pid.compute(10.2, 0U);

    expect_true(result.ok(), "deadband step-response check should succeed");
    expect_true(result.value->effective_error == 0.0, "deadband should zero effective error near setpoint");
  }

  {
    auto config = make_direct_config();
    config.id = "pid.step.reverse";
    config.name = "Reverse Step PID";
    config.direction = PidDirection::reverse;

    PidCore pid(config);
    ReversePlant plant{};
    pid.set_setpoint(40.0);

    double output = 0.0;
    for (std::uint64_t step = 0; step < 140U; ++step) {
      const double pv = plant.step(output, 0.1);
      const auto result = pid.compute(pv, step * 100U);
      if (result.ok()) {
        output = result.value->output;
      }
    }

    const auto snapshot = pid.get_snapshot();
    expect_true(std::abs(snapshot.process_value - 40.0) < 8.0, "reverse step response should converge with an inverted plant");
    expect_true(snapshot.output >= 0.0 && snapshot.output <= 100.0, "reverse step response should still respect output limits");
  }

  if (failures != 0) {
    std::cerr << "test_pid_core_step_response failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_core_step_response passed\n";
  return 0;
}
