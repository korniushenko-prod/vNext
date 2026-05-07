#pragma once

#include <cmath>
#include <cstdint>
#include <iostream>
#include <limits>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "actuators/motor_service.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "signals/signal_registry.hpp"

namespace motor_service_test_support {

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

inline bool contains_text(const std::string& value, const std::string& expected_fragment) {
  return value.find(expected_fragment) != std::string::npos;
}

inline controller::signals::SignalDescriptor make_signal_descriptor(
    std::string path,
    std::string name,
    const controller::signals::SignalType type) {
  return controller::signals::SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
      "",
      "test_motor_service",
      controller::signals::SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

inline controller::actuators::MotorDescriptor make_descriptor(
    std::string id = "motor1",
    std::string name = "Motor 1") {
  controller::actuators::MotorDescriptor descriptor{};
  descriptor.id = std::move(id);
  descriptor.name = std::move(name);
  descriptor.enabled = true;
  descriptor.pwm_target_id = "pwm_1";
  descriptor.enable_target_id = "enable_1";
  descriptor.direction_target_id = "direction_1";
  descriptor.allow_reverse = true;
  descriptor.fault_clears_output = true;
  descriptor.min_speed_percent = 0.0;
  descriptor.max_speed_percent = 100.0;
  descriptor.safe_speed_percent = 0.0;
  descriptor.ramp_up_percent_per_sec = 50.0;
  descriptor.ramp_down_percent_per_sec = 50.0;
  descriptor.reverse_delay_ms = 1000U;
  descriptor.publish_signals = true;
  return descriptor;
}

struct TestHarness {
  controller::hal::MockRelayHal relay_hal;
  controller::hal::MockPwmHal pwm_hal;
  controller::signals::SignalRegistry registry;
  controller::actuators::ActuatorManager actuator_manager;
  controller::actuators::MotorService service;

  explicit TestHarness(const std::size_t history_capacity = 128U)
      : relay_hal({
            controller::hal::RelayChannelConfig{"enable_1", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"direction_1", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"aux_1", controller::hal::RelayState::off, controller::hal::RelayState::off},
        }),
        pwm_hal({
            controller::hal::PwmOutputChannelConfig{"pwm_1", {0.0, 100.0, 0.0}, 0.0, false, false},
        }),
        registry(),
        actuator_manager(relay_hal, pwm_hal, &registry),
        service(registry, actuator_manager, history_capacity) {
    (void)relay_hal.initialize();
    (void)pwm_hal.initialize();
    (void)actuator_manager.register_pwm_target(
        controller::actuators::PwmActuatorTarget{
            "pwm_1",
            "PWM 1",
            true,
            controller::actuators::ActuatorRole::motor,
            0.0,
            100.0,
            0.0,
        },
        0U);
    (void)actuator_manager.register_relay_target(
        controller::actuators::RelayActuatorTarget{
            "enable_1",
            "Enable 1",
            true,
            controller::actuators::ActuatorRole::motor,
            controller::hal::RelayState::off,
            std::nullopt,
        },
        0U);
    (void)actuator_manager.register_relay_target(
        controller::actuators::RelayActuatorTarget{
            "direction_1",
            "Direction 1",
            true,
            controller::actuators::ActuatorRole::motor,
            controller::hal::RelayState::off,
            std::nullopt,
        },
        0U);
    (void)actuator_manager.register_relay_target(
        controller::actuators::RelayActuatorTarget{
            "aux_1",
            "Aux 1",
            true,
            controller::actuators::ActuatorRole::generic,
            controller::hal::RelayState::off,
            std::nullopt,
        },
        0U);
  }
};

inline void register_bool_signal(controller::signals::SignalRegistry& registry, const std::string& path) {
  (void)registry.register_signal(make_signal_descriptor(path, path, controller::signals::SignalType::boolean));
}

inline void register_double_signal(controller::signals::SignalRegistry& registry, const std::string& path) {
  (void)registry.register_signal(make_signal_descriptor(path, path, controller::signals::SignalType::float64));
}

inline void register_string_signal(controller::signals::SignalRegistry& registry, const std::string& path) {
  (void)registry.register_signal(make_signal_descriptor(path, path, controller::signals::SignalType::string));
}

inline void update_bool_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const bool value,
    const controller::signals::SignalTimestampMs now_ms) {
  (void)registry.update_signal(path, controller::signals::SignalValue{value}, now_ms, true, false);
}

inline void update_double_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const double value,
    const controller::signals::SignalTimestampMs now_ms) {
  (void)registry.update_signal(path, controller::signals::SignalValue{value}, now_ms, true, false);
}

inline void update_string_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const std::string& value,
    const controller::signals::SignalTimestampMs now_ms) {
  (void)registry.update_signal(path, controller::signals::SignalValue{value}, now_ms, true, false);
}

inline double nan_value() {
  return std::numeric_limits<double>::quiet_NaN();
}

}  // namespace motor_service_test_support
