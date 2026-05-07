#include <cmath>
#include <iostream>
#include <string>

#include "actuators/actuator_manager.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "signals/signal_registry.hpp"

using controller::actuators::ActuatorErrorCode;
using controller::actuators::ActuatorManager;
using controller::actuators::ActuatorPriority;
using controller::actuators::ActuatorRequest;
using controller::actuators::ActuatorRole;
using controller::actuators::PwmActuatorCommand;
using controller::actuators::PwmActuatorTarget;
using controller::actuators::RelayActuatorTarget;
using controller::hal::MockPwmHal;
using controller::hal::MockRelayHal;
using controller::hal::PwmOutputChannelConfig;
using controller::hal::RelayChannelConfig;
using controller::hal::RelayState;
using controller::signals::SignalRegistry;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

bool almost_equal(const double lhs, const double rhs) {
  return std::fabs(lhs - rhs) < 0.000001;
}

}  // namespace

int main() {
  MockRelayHal relay_hal({
      RelayChannelConfig{"relay_1", RelayState::off, RelayState::off},
      RelayChannelConfig{"fuel_relay", RelayState::off, RelayState::off},
  });
  MockPwmHal pwm_hal({
      PwmOutputChannelConfig{"pwm_1", {0.0, 100.0, 0.0}, 0.0, false, false},
  });
  SignalRegistry registry;

  expect_true(relay_hal.initialize().ok(), "relay HAL should initialize");
  expect_true(pwm_hal.initialize().ok(), "PWM HAL should initialize");

  ActuatorManager manager(relay_hal, pwm_hal, &registry);

  expect_true(
      manager.register_relay_target(
                 RelayActuatorTarget{"relay_1", "Relay 1", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                 0U)
          .ok(),
      "generic relay registration should succeed");
  expect_true(
      manager.register_relay_target(
                 RelayActuatorTarget{"fuel_relay", "Fuel Relay", true, ActuatorRole::fuel, RelayState::off, std::nullopt},
                 0U)
          .ok(),
      "fuel relay registration should succeed");
  expect_true(
      manager.register_pwm_target(
                 PwmActuatorTarget{"pwm_1", "PWM 1", true, ActuatorRole::generic, 10.0, 90.0, 25.0},
                 0U)
          .ok(),
      "PWM registration should succeed");

  expect_true(manager.has_target("relay_1"), "registered relay target should be discoverable");
  expect_true(manager.has_target("pwm_1"), "registered PWM target should be discoverable");

  const auto relay_state = relay_hal.get_state("relay_1");
  const auto fuel_state = relay_hal.get_state("fuel_relay");
  const auto pwm_duty = pwm_hal.get_duty_percent("pwm_1");
  const auto pwm_enabled = pwm_hal.get_enabled("pwm_1");
  expect_true(relay_state.ok() && relay_state.value.value() == RelayState::off, "no request should drive relay safe fallback");
  expect_true(fuel_state.ok() && fuel_state.value.value() == RelayState::off, "fuel relay must stay OFF while unowned");
  expect_true(pwm_duty.ok() && almost_equal(pwm_duty.value.value(), 25.0), "no request should drive PWM safe duty");
  expect_true(pwm_enabled.ok() && !pwm_enabled.value.value(), "no request should keep PWM disabled");

  const auto relay_snapshot = manager.get_snapshot("relay_1");
  expect_true(relay_snapshot.ok(), "relay snapshot should be available");
  expect_true(
      relay_snapshot.ok() && relay_snapshot.value->owner == "safe_fallback" &&
          relay_snapshot.value->reason == "no_active_request" &&
          relay_snapshot.value->priority == ActuatorPriority::default_priority &&
          relay_snapshot.value->safe_fallback,
      "safe fallback snapshot should expose owner, reason and priority");

  const auto invalid_target = manager.register_pwm_target(
      PwmActuatorTarget{"pwm_invalid", "PWM Invalid", true, ActuatorRole::generic, 80.0, 60.0, 70.0},
      0U);
  expect_true(
      !invalid_target.ok() && invalid_target.status.code == ActuatorErrorCode::invalid_range,
      "invalid PWM target range should be rejected");

  const auto invalid_request = manager.submit_request(ActuatorRequest{
      "pwm_1",
      "operator",
      "too_high",
      ActuatorPriority::manual,
      10U,
      std::nullopt,
      PwmActuatorCommand{95.0, true},
  });
  expect_true(
      !invalid_request.ok() && invalid_request.status.code == ActuatorErrorCode::invalid_range,
      "out-of-range PWM request should be rejected");

  if (failures != 0) {
    std::cerr << "test_actuator_manager_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_actuator_manager_basic passed\n";
  return 0;
}
