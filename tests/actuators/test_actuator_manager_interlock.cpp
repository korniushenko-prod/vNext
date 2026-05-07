#include <iostream>
#include <string>

#include "actuators/actuator_manager.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"

using controller::actuators::ActuatorManager;
using controller::actuators::ActuatorPriority;
using controller::actuators::ActuatorRequest;
using controller::actuators::ActuatorRole;
using controller::actuators::RelayActuatorCommand;
using controller::actuators::RelayActuatorTarget;
using controller::actuators::RelayEffectiveState;
using controller::hal::MockPwmHal;
using controller::hal::MockRelayHal;
using controller::hal::RelayChannelConfig;
using controller::hal::RelayState;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

}  // namespace

int main() {
  MockRelayHal relay_hal({
      RelayChannelConfig{"relay_a", RelayState::off, RelayState::off},
      RelayChannelConfig{"relay_b", RelayState::off, RelayState::off},
      RelayChannelConfig{"relay_free", RelayState::off, RelayState::off},
  });
  MockPwmHal pwm_hal({});

  expect_true(relay_hal.initialize().ok(), "relay HAL should initialize");
  expect_true(pwm_hal.initialize().ok(), "PWM HAL should initialize");

  ActuatorManager manager(relay_hal, pwm_hal, nullptr);
  expect_true(
      manager.register_relay_target(
                 RelayActuatorTarget{"relay_a", "Relay A", true, ActuatorRole::generic, RelayState::off, std::string{"burner_group"}},
                 0U)
          .ok(),
      "relay_a registration should succeed");
  expect_true(
      manager.register_relay_target(
                 RelayActuatorTarget{"relay_b", "Relay B", true, ActuatorRole::generic, RelayState::off, std::string{"burner_group"}},
                 0U)
          .ok(),
      "relay_b registration should succeed");
  expect_true(
      manager.register_relay_target(
                 RelayActuatorTarget{"relay_free", "Relay Free", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                 0U)
          .ok(),
      "relay_free registration should succeed");

  expect_true(
      manager.submit_request(ActuatorRequest{
          "relay_a",
          "alpha",
          "request_on",
          ActuatorPriority::manual,
          10U,
          std::nullopt,
          RelayActuatorCommand{RelayState::on},
      }).ok(),
      "relay_a request should succeed");
  expect_true(
      manager.submit_request(ActuatorRequest{
          "relay_b",
          "beta",
          "request_on",
          ActuatorPriority::manual,
          10U,
          std::nullopt,
          RelayActuatorCommand{RelayState::on},
      }).ok(),
      "relay_b request should succeed");
  expect_true(
      manager.submit_request(ActuatorRequest{
          "relay_free",
          "gamma",
          "request_on",
          ActuatorPriority::manual,
          10U,
          std::nullopt,
          RelayActuatorCommand{RelayState::on},
      }).ok(),
      "relay_free request should succeed");

  expect_true(manager.evaluate(20U).ok(), "interlock evaluation should succeed");

  const auto relay_a = manager.get_snapshot("relay_a");
  const auto relay_b = manager.get_snapshot("relay_b");
  const auto relay_free = manager.get_snapshot("relay_free");
  const auto relay_a_hal = relay_hal.get_state("relay_a");
  const auto relay_b_hal = relay_hal.get_state("relay_b");
  const auto relay_free_hal = relay_hal.get_state("relay_free");

  expect_true(
      relay_a.ok() &&
          std::get<RelayEffectiveState>(relay_a.value->effective).state == RelayState::on &&
          relay_a_hal.ok() && relay_a_hal.value.value() == RelayState::on,
      "deterministic winner should be chosen inside the interlock group");
  expect_true(
      relay_b.ok() &&
          std::get<RelayEffectiveState>(relay_b.value->effective).state == RelayState::off &&
          relay_b.value->interlock_blocked &&
          relay_b.value->reason == "interlock_blocked_by:relay_a" &&
          relay_b_hal.ok() && relay_b_hal.value.value() == RelayState::off,
      "loser relay should be forced OFF and expose interlock reason");
  expect_true(
      relay_free.ok() &&
          std::get<RelayEffectiveState>(relay_free.value->effective).state == RelayState::on &&
          relay_free_hal.ok() && relay_free_hal.value.value() == RelayState::on,
      "relay outside the interlock group should be unaffected");

  if (failures != 0) {
    std::cerr << "test_actuator_manager_interlock failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_actuator_manager_interlock passed\n";
  return 0;
}
