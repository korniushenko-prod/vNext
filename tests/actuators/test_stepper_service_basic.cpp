#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperErrorCode;
using controller::actuators::StepperRuntimeState;
using stepper_service_test_support::TestHarness;

namespace {

int failures = 0;

}

int main() {
  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();

    const auto registered = harness.service.register_stepper(descriptor);
    stepper_service_test_support::expect_true(registered.ok(), "valid descriptor should register", failures);

    const auto duplicate = harness.service.register_stepper(descriptor);
    stepper_service_test_support::expect_true(
        !duplicate.ok() && duplicate.status.code == StepperErrorCode::stepper_already_registered,
        "duplicate id should be rejected",
        failures);

    const auto snapshot = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(snapshot.runtime_state == StepperRuntimeState::ready, "initial state should be ready", failures);
    stepper_service_test_support::expect_true(snapshot.enabled, "registered stepper should be enabled", failures);
    stepper_service_test_support::expect_true(!snapshot.need_homing, "default descriptor should not need homing", failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.enabled = false;

    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "disabled descriptor should register", failures);

    const auto disabled_snapshot = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(
        disabled_snapshot.runtime_state == StepperRuntimeState::disabled,
        "descriptor-disabled stepper should start disabled",
        failures);

    const auto runtime_toggle = harness.service.set_enabled("axis1", false, 10U, "operator", "maintenance");
    stepper_service_test_support::expect_true(runtime_toggle.ok(), "service disable should succeed", failures);

    const auto after_disable = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(after_disable.runtime_state == StepperRuntimeState::disabled, "runtime disable should keep disabled state", failures);

    const auto list = harness.service.list_snapshots();
    stepper_service_test_support::expect_true(list.size() == 1U, "list_snapshots should include the registered stepper", failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_basic passed\n";
  return 0;
}
