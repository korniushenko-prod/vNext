#include <cmath>
#include <iostream>
#include <string>

#include "actuators/actuator_manager.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "signals/signal_registry.hpp"

using controller::actuators::ActuatorManager;
using controller::actuators::ActuatorPriority;
using controller::actuators::ActuatorRequest;
using controller::actuators::ActuatorRole;
using controller::actuators::PwmActuatorCommand;
using controller::actuators::PwmActuatorTarget;
using controller::actuators::RelayActuatorCommand;
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
      "relay registration should succeed");
  expect_true(
      manager.register_pwm_target(
                 PwmActuatorTarget{"pwm_1", "PWM 1", true, ActuatorRole::generic, 10.0, 90.0, 20.0},
                 0U)
          .ok(),
      "PWM registration should succeed");

  expect_true(
      manager.submit_request(ActuatorRequest{
          "relay_1",
          "operator",
          "manual_on",
          ActuatorPriority::manual,
          10U,
          std::nullopt,
          RelayActuatorCommand{RelayState::on},
      }).ok(),
      "relay request should succeed");
  expect_true(
      manager.submit_request(ActuatorRequest{
          "pwm_1",
          "sequence",
          "sequence_drive",
          ActuatorPriority::sequence,
          10U,
          std::nullopt,
          PwmActuatorCommand{55.0, true},
      }).ok(),
      "PWM request should succeed");
  expect_true(manager.evaluate(25U).ok(), "evaluation with active requests should succeed");

  const auto relay_on = registry.read_bool("actuators.relay_1.effective.on", 25U);
  const auto pwm_enabled = registry.read_bool("actuators.pwm_1.effective.enabled", 25U);
  const auto pwm_duty = registry.read_double("actuators.pwm_1.effective.duty_percent", 25U);
  const auto relay_owner = registry.read_string("actuators.relay_1.meta.owner", 25U);
  const auto relay_reason = registry.read_string("actuators.relay_1.meta.reason", 25U);
  const auto relay_priority = registry.read_string("actuators.relay_1.meta.priority", 25U);
  const auto relay_safe = registry.read_bool("actuators.relay_1.meta.safe_fallback", 25U);

  expect_true(relay_on.ok() && relay_on.value.value(), "effective relay state should be published");
  expect_true(pwm_enabled.ok() && pwm_enabled.value.value(), "effective PWM enabled state should be published");
  expect_true(pwm_duty.ok() && almost_equal(pwm_duty.value.value(), 55.0), "effective PWM duty should be published");
  expect_true(relay_owner.ok() && relay_owner.value.value() == "operator", "owner signal should be published");
  expect_true(relay_reason.ok() && relay_reason.value.value() == "manual_on", "reason signal should be published");
  expect_true(relay_priority.ok() && relay_priority.value.value() == "Manual", "priority signal should be published");
  expect_true(relay_safe.ok() && !relay_safe.value.value(), "safe_fallback signal should reflect the active request");

  expect_true(
      manager.submit_request(ActuatorRequest{
          "relay_1",
          "safety",
          "safety_off",
          ActuatorPriority::safety,
          30U,
          std::nullopt,
          RelayActuatorCommand{RelayState::off},
      }).ok(),
      "higher-priority relay request should succeed");
  expect_true(manager.remove_request("pwm_1", "sequence").ok(), "PWM request removal should succeed");
  expect_true(manager.evaluate(40U).ok(), "second evaluation should succeed");

  const auto relay_on_after = registry.read_bool("actuators.relay_1.effective.on", 40U);
  const auto relay_owner_after = registry.read_string("actuators.relay_1.meta.owner", 40U);
  const auto relay_reason_after = registry.read_string("actuators.relay_1.meta.reason", 40U);
  const auto relay_priority_after = registry.read_string("actuators.relay_1.meta.priority", 40U);
  const auto pwm_enabled_after = registry.read_bool("actuators.pwm_1.effective.enabled", 40U);
  const auto pwm_duty_after = registry.read_double("actuators.pwm_1.effective.duty_percent", 40U);
  const auto pwm_owner_after = registry.read_string("actuators.pwm_1.meta.owner", 40U);
  const auto pwm_safe_after = registry.read_bool("actuators.pwm_1.meta.safe_fallback", 40U);

  expect_true(relay_on_after.ok() && !relay_on_after.value.value(), "relay signal should update after reevaluation");
  expect_true(relay_owner_after.ok() && relay_owner_after.value.value() == "safety", "updated owner should be published");
  expect_true(relay_reason_after.ok() && relay_reason_after.value.value() == "safety_off", "updated reason should be published");
  expect_true(relay_priority_after.ok() && relay_priority_after.value.value() == "Safety", "updated priority should be published");
  expect_true(pwm_enabled_after.ok() && !pwm_enabled_after.value.value(), "PWM enabled signal should update after fallback");
  expect_true(pwm_duty_after.ok() && almost_equal(pwm_duty_after.value.value(), 20.0), "PWM duty signal should update after fallback");
  expect_true(pwm_owner_after.ok() && pwm_owner_after.value.value() == "safe_fallback", "fallback owner should be published");
  expect_true(pwm_safe_after.ok() && pwm_safe_after.value.value(), "fallback flag should update after request removal");

  if (failures != 0) {
    std::cerr << "test_actuator_manager_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_actuator_manager_signals passed\n";
  return 0;
}
