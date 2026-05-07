#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperErrorCode;
using controller::actuators::StepperRuntimeState;
using controller::hal::StepperDirection;
using stepper_service_test_support::TestHarness;

namespace {

int failures = 0;

}

int main() {
  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.fault_signal_path = "inputs.fault";
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.fault");
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.fault", false, 0U);
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "fault descriptor should register", failures);

    stepper_service_test_support::expect_true(harness.service.move_to_steps("axis1", 200, 0U, "operator", "move_before_fault").ok(), "move should start", failures);
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.fault", true, 100U);
    stepper_service_test_support::expect_true(harness.service.tick(100U).ok(), "fault tick should succeed", failures);

    const auto faulted = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(faulted.runtime_state == StepperRuntimeState::fault, "fault signal should enter fault state", failures);
    stepper_service_test_support::expect_true(faulted.fault, "fault snapshot flag should be true", failures);

    const auto blocked_clear = harness.service.clear_fault("axis1", 101U, "operator", "clear_while_active");
    stepper_service_test_support::expect_true(
        !blocked_clear.ok() && blocked_clear.status.code == StepperErrorCode::stepper_fault_active,
        "clear_fault should reject while fault signal is active",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.fault_signal_path = "inputs.fault";
    descriptor.home_required_on_boot = true;
    descriptor.home_signal_path = "inputs.home";
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.fault");
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.home");
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.fault", true, 0U);
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "clear-fault descriptor should register", failures);
    stepper_service_test_support::expect_true(harness.service.tick(0U).ok(), "fault should latch on tick", failures);

    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.fault", false, 1U);
    stepper_service_test_support::expect_true(harness.service.clear_fault("axis1", 1U, "operator", "clear_fault").ok(), "clear_fault should succeed once signal clears", failures);
    const auto after_clear = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(after_clear.runtime_state == StepperRuntimeState::need_homing, "clear_fault should return to need_homing when required", failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "emergency-stop descriptor should register", failures);
    stepper_service_test_support::expect_true(
        harness.service.start_jog("axis1", StepperDirection::forward, 0U, "operator", "jog_then_estop").ok(),
        "jog before emergency stop should succeed",
        failures);
    stepper_service_test_support::expect_true(harness.service.emergency_stop("axis1", 10U, "operator", "estop").ok(), "emergency_stop should succeed", failures);

    const auto emergency = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(emergency.runtime_state == StepperRuntimeState::fault, "emergency_stop should place stepper into fault state", failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_faults failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_faults passed\n";
  return 0;
}
