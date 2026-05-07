#pragma once

#include <cmath>
#include <cstdint>
#include <iostream>
#include <limits>
#include <optional>
#include <string>
#include <utility>

#include "actuators/actuator_manager.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "pid/pid_service.hpp"
#include "signals/signal_registry.hpp"

namespace pid_service_test_support {

inline void expect_true(const bool condition, const std::string& message, int& failures) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

inline void expect_near(
    const double actual,
    const double expected,
    const double tolerance,
    const std::string& message,
    int& failures) {
  if (std::fabs(actual - expected) > tolerance) {
    std::cerr << "FAIL: " << message << " expected=" << expected << " actual=" << actual << '\n';
    ++failures;
  }
}

inline controller::signals::SignalDescriptor make_signal_descriptor(
    std::string path,
    std::string name,
    const controller::signals::SignalType type,
    const controller::signals::SignalTimestampMs max_age_ms = 0U) {
  return controller::signals::SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
      "",
      "test_pid_service",
      controller::signals::SignalAccessMode::read_only,
      max_age_ms,
      true,
      true,
  };
}

inline controller::pid::PidConfig make_pid_config() {
  controller::pid::PidConfig config{};
  config.id = "unused";
  config.name = "unused";
  config.kp = 2.0;
  config.ki = 0.5;
  config.kd = 0.0;
  config.sample_time_ms = 100U;
  config.mode = controller::pid::PidMode::manual;
  config.output_min = 0.0;
  config.output_max = 100.0;
  config.integral_min = -100.0;
  config.integral_max = 100.0;
  config.manual_output = 25.0;
  return config;
}

inline controller::pid::PidServiceDescriptor make_descriptor(
    std::string id = "loop1",
    std::string name = "Loop 1",
    std::string pv_signal_path = "plant.pv",
    std::string output_target_id = "pwm_1") {
  controller::pid::PidServiceDescriptor descriptor{};
  descriptor.id = std::move(id);
  descriptor.name = std::move(name);
  descriptor.enabled = true;
  descriptor.core_config = make_pid_config();
  descriptor.pv_signal_path = std::move(pv_signal_path);
  descriptor.setpoint_source_kind = controller::pid::PidSetpointSourceKind::constant;
  descriptor.constant_setpoint = 50.0;
  descriptor.output_target_id = std::move(output_target_id);
  descriptor.output_target_kind = controller::actuators::ActuatorTargetKind::pwm;
  descriptor.stale_as_fault = true;
  descriptor.invalid_as_fault = true;
  descriptor.fault_clears_output = true;
  descriptor.publish_signals = true;
  return descriptor;
}

struct TestHarness {
  controller::hal::MockRelayHal relay_hal;
  controller::hal::MockPwmHal pwm_hal;
  controller::signals::SignalRegistry registry;
  controller::actuators::ActuatorManager actuator_manager;
  controller::pid::PidService service;

  TestHarness(
      const double duty_min = 0.0,
      const double duty_max = 100.0,
      const double duty_safe = 0.0,
      const std::size_t history_capacity = 128U)
      : relay_hal({}),
        pwm_hal({controller::hal::PwmOutputChannelConfig{
            "pwm_1",
            {duty_min, duty_max, duty_safe},
            duty_safe,
            false,
            false,
        }}),
        registry(),
        actuator_manager(relay_hal, pwm_hal, &registry),
        service(registry, actuator_manager, history_capacity) {
    (void)relay_hal.initialize();
    (void)pwm_hal.initialize();
    (void)actuator_manager.register_pwm_target(
        controller::actuators::PwmActuatorTarget{"pwm_1", "PWM 1", true, controller::actuators::ActuatorRole::generic, duty_min, duty_max, duty_safe},
        0U);
  }
};

inline void register_double_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const controller::signals::SignalTimestampMs max_age_ms = 0U) {
  (void)registry.register_signal(
      make_signal_descriptor(path, path, controller::signals::SignalType::float64, max_age_ms));
}

inline void register_bool_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const controller::signals::SignalTimestampMs max_age_ms = 0U) {
  (void)registry.register_signal(
      make_signal_descriptor(path, path, controller::signals::SignalType::boolean, max_age_ms));
}

inline void update_double_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const double value,
    const controller::signals::SignalTimestampMs now_ms,
    const bool valid = true,
    const bool fault = false) {
  (void)registry.update_signal(path, controller::signals::SignalValue{value}, now_ms, valid, fault);
}

inline void update_bool_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const bool value,
    const controller::signals::SignalTimestampMs now_ms,
    const bool valid = true,
    const bool fault = false) {
  (void)registry.update_signal(path, controller::signals::SignalValue{value}, now_ms, valid, fault);
}

inline bool contains_text(const std::string& value, const std::string& expected_fragment) {
  return value.find(expected_fragment) != std::string::npos;
}

inline double nan_value() {
  return std::numeric_limits<double>::quiet_NaN();
}

}  // namespace pid_service_test_support
