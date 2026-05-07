#pragma once

#include <cmath>
#include <cstdint>
#include <iostream>
#include <optional>
#include <string>

#include "actuators/stepper_service.hpp"
#include "hal/stepper_hal.hpp"
#include "signals/signal_registry.hpp"

namespace stepper_service_test_support {

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
      "test_stepper_service",
      controller::signals::SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

inline controller::actuators::StepperDescriptor make_descriptor(
    std::string id = "axis1",
    std::string name = "Axis 1") {
  controller::actuators::StepperDescriptor descriptor{};
  descriptor.id = std::move(id);
  descriptor.name = std::move(name);
  descriptor.enabled = true;
  descriptor.hal_stepper_id = "axis_1";
  descriptor.min_steps = 0;
  descriptor.max_steps = 1000;
  descriptor.home_required_on_boot = false;
  descriptor.home_position_steps = 0;
  descriptor.move_speed_steps_per_sec = 100.0;
  descriptor.home_speed_steps_per_sec = 50.0;
  descriptor.jog_speed_steps_per_sec = 40.0;
  descriptor.home_direction = controller::hal::StepperDirection::reverse;
  descriptor.publish_signals = true;
  return descriptor;
}

struct TestHarness {
  controller::hal::MockStepperHal stepper_hal;
  controller::signals::SignalRegistry registry;
  controller::actuators::StepperService service;

  explicit TestHarness(const std::size_t history_capacity = 128U)
      : stepper_hal({
            controller::hal::StepperChannelConfig{"axis_1"},
            controller::hal::StepperChannelConfig{"axis_2"},
        }),
        registry(),
        service(stepper_hal, registry, history_capacity) {
    (void)stepper_hal.initialize();
  }
};

inline void register_bool_signal(controller::signals::SignalRegistry& registry, const std::string& path) {
  (void)registry.register_signal(make_signal_descriptor(path, path, controller::signals::SignalType::boolean));
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

inline controller::actuators::StepperSnapshot snapshot(
    controller::actuators::StepperService& service,
    const std::string& id) {
  const auto result = service.get_snapshot(id);
  return result.value.value();
}

}  // namespace stepper_service_test_support
