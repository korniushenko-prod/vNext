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

void submit_relay_request(
    ActuatorManager& manager,
    const std::string& target_id,
    const std::string& owner,
    const std::string& reason,
    const ActuatorPriority priority,
    const RelayState state,
    const unsigned long long issued_at_ms,
    const std::optional<unsigned long long> expires_at_ms = std::nullopt) {
  expect_true(
      manager.submit_request(ActuatorRequest{
          target_id,
          owner,
          reason,
          priority,
          issued_at_ms,
          expires_at_ms,
          RelayActuatorCommand{state},
      }).ok(),
      "relay request should be accepted");
}

}  // namespace

int main() {
  MockRelayHal relay_hal({
      RelayChannelConfig{"priority_relay", RelayState::off, RelayState::off},
      RelayChannelConfig{"safety_relay", RelayState::off, RelayState::off},
      RelayChannelConfig{"trip_relay", RelayState::off, RelayState::off},
      RelayChannelConfig{"sequence_relay", RelayState::off, RelayState::off},
      RelayChannelConfig{"tie_relay", RelayState::off, RelayState::off},
      RelayChannelConfig{"expiring_relay", RelayState::off, RelayState::off},
  });
  MockPwmHal pwm_hal({});

  expect_true(relay_hal.initialize().ok(), "relay HAL should initialize");
  expect_true(pwm_hal.initialize().ok(), "PWM HAL should initialize");

  ActuatorManager manager(relay_hal, pwm_hal, nullptr);
  expect_true(manager.register_relay_target(
                  RelayActuatorTarget{"priority_relay", "Priority Relay", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                  0U)
                  .ok(),
              "priority relay registration should succeed");
  expect_true(manager.register_relay_target(
                  RelayActuatorTarget{"safety_relay", "Safety Relay", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                  0U)
                  .ok(),
              "safety relay registration should succeed");
  expect_true(manager.register_relay_target(
                  RelayActuatorTarget{"trip_relay", "Trip Relay", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                  0U)
                  .ok(),
              "trip relay registration should succeed");
  expect_true(manager.register_relay_target(
                  RelayActuatorTarget{"sequence_relay", "Sequence Relay", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                  0U)
                  .ok(),
              "sequence relay registration should succeed");
  expect_true(manager.register_relay_target(
                  RelayActuatorTarget{"tie_relay", "Tie Relay", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                  0U)
                  .ok(),
              "tie relay registration should succeed");
  expect_true(manager.register_relay_target(
                  RelayActuatorTarget{"expiring_relay", "Expiring Relay", true, ActuatorRole::generic, RelayState::off, std::nullopt},
                  0U)
                  .ok(),
              "expiring relay registration should succeed");

  submit_relay_request(manager, "priority_relay", "scheduler", "schedule_on", ActuatorPriority::schedule, RelayState::on, 10U);
  submit_relay_request(manager, "priority_relay", "service", "service_off", ActuatorPriority::service, RelayState::off, 11U);

  submit_relay_request(manager, "safety_relay", "operator", "manual_on", ActuatorPriority::manual, RelayState::on, 10U);
  submit_relay_request(manager, "safety_relay", "safety", "safety_off", ActuatorPriority::safety, RelayState::off, 11U);

  submit_relay_request(manager, "trip_relay", "pid", "pid_on", ActuatorPriority::pid, RelayState::on, 10U);
  submit_relay_request(manager, "trip_relay", "trip", "trip_off", ActuatorPriority::trip, RelayState::off, 11U);

  submit_relay_request(manager, "sequence_relay", "autorule", "auto_off", ActuatorPriority::auto_rule, RelayState::off, 10U);
  submit_relay_request(manager, "sequence_relay", "sequence", "sequence_on", ActuatorPriority::sequence, RelayState::on, 11U);

  submit_relay_request(manager, "tie_relay", "zeta", "manual_off", ActuatorPriority::manual, RelayState::off, 10U);
  submit_relay_request(manager, "tie_relay", "alpha", "manual_on", ActuatorPriority::manual, RelayState::on, 11U);

  submit_relay_request(manager, "expiring_relay", "service", "temporary_on", ActuatorPriority::service, RelayState::on, 10U, 50U);
  submit_relay_request(manager, "expiring_relay", "operator", "manual_off", ActuatorPriority::manual, RelayState::off, 11U);

  expect_true(manager.evaluate(40U).ok(), "evaluation before expiry should succeed");

  const auto priority_snapshot = manager.get_snapshot("priority_relay");
  const auto safety_snapshot = manager.get_snapshot("safety_relay");
  const auto trip_snapshot = manager.get_snapshot("trip_relay");
  const auto sequence_snapshot = manager.get_snapshot("sequence_relay");
  const auto tie_snapshot = manager.get_snapshot("tie_relay");
  const auto expiring_before = manager.get_snapshot("expiring_relay");

  expect_true(
      priority_snapshot.ok() && priority_snapshot.value->owner == "service" &&
          std::get<controller::actuators::RelayEffectiveState>(priority_snapshot.value->effective).state == RelayState::off,
      "higher priority should override lower priority on the same target");
  expect_true(
      safety_snapshot.ok() && safety_snapshot.value->owner == "safety" &&
          std::get<controller::actuators::RelayEffectiveState>(safety_snapshot.value->effective).state == RelayState::off,
      "Safety should override Manual");
  expect_true(
      trip_snapshot.ok() && trip_snapshot.value->owner == "trip" &&
          std::get<controller::actuators::RelayEffectiveState>(trip_snapshot.value->effective).state == RelayState::off,
      "Trip should override PID");
  expect_true(
      sequence_snapshot.ok() && sequence_snapshot.value->owner == "sequence" &&
          std::get<controller::actuators::RelayEffectiveState>(sequence_snapshot.value->effective).state == RelayState::on,
      "Sequence should override AutoRule");
  expect_true(
      tie_snapshot.ok() && tie_snapshot.value->owner == "alpha" &&
          std::get<controller::actuators::RelayEffectiveState>(tie_snapshot.value->effective).state == RelayState::on,
      "same-priority tie-break should be deterministic");
  expect_true(
      expiring_before.ok() &&
          std::get<controller::actuators::RelayEffectiveState>(expiring_before.value->effective).state == RelayState::on,
      "unexpired higher-priority request should win before expiry");

  expect_true(manager.evaluate(50U).ok(), "evaluation at expiry should succeed");
  const auto expiring_after = manager.get_snapshot("expiring_relay");
  expect_true(
      expiring_after.ok() && expiring_after.value->owner == "operator" &&
          std::get<controller::actuators::RelayEffectiveState>(expiring_after.value->effective).state == RelayState::off,
      "expired request should no longer win");

  if (failures != 0) {
    std::cerr << "test_actuator_manager_priority failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_actuator_manager_priority passed\n";
  return 0;
}
