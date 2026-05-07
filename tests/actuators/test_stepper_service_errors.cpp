#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperErrorCode;
using stepper_service_test_support::TestHarness;

namespace {

int failures = 0;

}

int main() {
  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.id.clear();

    const auto invalid = harness.service.register_stepper(descriptor);
    stepper_service_test_support::expect_true(
        !invalid.ok() && invalid.status.code == StepperErrorCode::stepper_invalid_descriptor,
        "invalid descriptor should be rejected",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.home_required_on_boot = true;

    const auto invalid = harness.service.register_stepper(descriptor);
    stepper_service_test_support::expect_true(
        !invalid.ok() && invalid.status.code == StepperErrorCode::stepper_invalid_descriptor,
        "home_required_on_boot without home signal should be rejected",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "error descriptor should register", failures);

    const auto unknown = harness.service.move_to_steps("missing", 10, 0U, "operator", "unknown");
    stepper_service_test_support::expect_true(
        !unknown.ok() && unknown.status.code == StepperErrorCode::stepper_not_found,
        "unknown stepper should return stepper_not_found",
        failures);

    const auto unsupported_home = harness.service.command_home("axis1", 0U, "operator", "no_home");
    stepper_service_test_support::expect_true(
        !unsupported_home.ok() && unsupported_home.status.code == StepperErrorCode::stepper_home_unsupported,
        "unsupported home command should be rejected",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "hal-failure descriptor should register", failures);
    (void)harness.stepper_hal.set_fault("axis_1", true);

    const auto hal_failure = harness.service.move_to_steps("axis1", 50, 0U, "operator", "hal_fault");
    stepper_service_test_support::expect_true(
        !hal_failure.ok() && hal_failure.status.code == StepperErrorCode::stepper_hal_command_failed,
        "HAL failures should surface as stepper_hal_command_failed",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    (void)harness.registry.register_signal(
        stepper_service_test_support::make_signal_descriptor(
            "stepper.axis1.enabled",
            "preexisting enabled",
            controller::signals::SignalType::boolean));
    const auto publish_failure = harness.service.register_stepper(descriptor);
    stepper_service_test_support::expect_true(
        !publish_failure.ok() && publish_failure.status.code == StepperErrorCode::stepper_signal_publish_failed,
        "signal registration conflicts should surface as publish failures",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.home_required_on_boot = true;
    descriptor.home_signal_path = "inputs.bad_home";
    stepper_service_test_support::register_string_signal(harness.registry, "inputs.bad_home");
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "bad-signal descriptor should register", failures);
    stepper_service_test_support::expect_true(harness.service.command_home("axis1", 0U, "operator", "bad_home").ok(), "home should start before bad read", failures);

    const auto read_failure = harness.service.tick(1U);
    stepper_service_test_support::expect_true(
        !read_failure.ok() && read_failure.status.code == StepperErrorCode::stepper_signal_read_failed,
        "bad signal reads should surface as stepper_signal_read_failed",
        failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_errors passed\n";
  return 0;
}
