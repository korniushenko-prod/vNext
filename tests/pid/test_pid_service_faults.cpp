#include <iostream>
#include <string>

#include "pid/pid_service.hpp"
#include "pid_service_test_support.hpp"

using controller::pid::PidMode;
using controller::pid::PidServiceMode;
using pid_service_test_support::TestHarness;
using pid_service_test_support::expect_true;
using pid_service_test_support::make_descriptor;
using pid_service_test_support::register_bool_signal;
using pid_service_test_support::register_double_signal;
using pid_service_test_support::update_bool_signal;
using pid_service_test_support::update_double_signal;

namespace {

int failures = 0;

}  // namespace

int main() {
  {
    TestHarness harness;
    auto missing_descriptor = make_descriptor("loop_missing", "Loop Missing", "missing.pv", "pwm_1");
    missing_descriptor.core_config.mode = PidMode::auto_mode;
    expect_true(harness.service.register_pid(missing_descriptor).ok(), "missing PV controller should register", failures);
    expect_true(harness.service.tick(100U).ok(), "missing PV should become a runtime fault", failures);
    const auto snapshot = harness.service.get_snapshot("loop_missing");
    expect_true(snapshot.ok() && snapshot.value->fault, "missing PV signal should force fault mode", failures);

    register_double_signal(harness.registry, "missing.pv");
    update_double_signal(harness.registry, "missing.pv", 30.0, 200U);
    expect_true(harness.service.tick(200U).ok(), "fault should clear automatically after source recovery", failures);
    const auto recovered = harness.service.get_snapshot("loop_missing");
    expect_true(
        recovered.ok() && !recovered.value->fault &&
            recovered.value->effective_mode == PidServiceMode::auto_mode,
        "runtime fault should be non-latching in Stage 17",
        failures);
  }

  {
    TestHarness harness;
    register_bool_signal(harness.registry, "plant.bool_pv");
    update_bool_signal(harness.registry, "plant.bool_pv", true, 0U);
    auto type_descriptor = make_descriptor("loop_type", "Loop Type", "plant.bool_pv", "pwm_1");
    expect_true(harness.service.register_pid(type_descriptor).ok(), "type-mismatch controller should register", failures);
    expect_true(harness.service.tick(100U).ok(), "type mismatch should become a runtime fault", failures);
    const auto snapshot = harness.service.get_snapshot("loop_type");
    expect_true(snapshot.ok() && snapshot.value->fault, "type mismatch should force fault mode", failures);
  }

  {
    TestHarness harness;
    register_double_signal(harness.registry, "plant.stale_pv", 10U);
    update_double_signal(harness.registry, "plant.stale_pv", 12.0, 0U);
    auto stale_descriptor = make_descriptor("loop_stale", "Loop Stale", "plant.stale_pv", "pwm_1");
    expect_true(harness.service.register_pid(stale_descriptor).ok(), "stale-policy controller should register", failures);
    expect_true(harness.service.tick(20U).ok(), "stale PV should become a runtime fault", failures);
    const auto snapshot = harness.service.get_snapshot("loop_stale");
    expect_true(snapshot.ok() && snapshot.value->fault, "stale_as_fault should be enforced", failures);
  }

  {
    TestHarness harness;
    register_double_signal(harness.registry, "plant.invalid_pv");
    update_double_signal(harness.registry, "plant.invalid_pv", 12.0, 0U, false, false);
    auto invalid_descriptor = make_descriptor("loop_invalid", "Loop Invalid", "plant.invalid_pv", "pwm_1");
    expect_true(harness.service.register_pid(invalid_descriptor).ok(), "invalid-policy controller should register", failures);
    expect_true(harness.service.tick(20U).ok(), "invalid PV should become a runtime fault", failures);
    const auto snapshot = harness.service.get_snapshot("loop_invalid");
    expect_true(snapshot.ok() && snapshot.value->fault, "invalid_as_fault should be enforced", failures);
  }

  {
    TestHarness harness;
    register_double_signal(harness.registry, "plant.integral_pv");
    update_double_signal(harness.registry, "plant.integral_pv", 0.0, 0U);
    auto integral_descriptor = make_descriptor("loop_integral", "Loop Integral", "plant.integral_pv", "pwm_1");
    integral_descriptor.core_config.mode = PidMode::auto_mode;
    integral_descriptor.constant_setpoint = 100.0;
    expect_true(harness.service.register_pid(integral_descriptor).ok(), "integral-reset controller should register", failures);
    expect_true(harness.service.tick(0U).ok(), "first auto tick should succeed", failures);
    update_double_signal(harness.registry, "plant.integral_pv", 0.0, 100U);
    expect_true(harness.service.tick(100U).ok(), "second auto tick should succeed", failures);
    const auto before_reset = harness.service.get_snapshot("loop_integral");
    expect_true(before_reset.ok() && before_reset.value->i_term > 0.0, "integral term should accumulate before reset", failures);

    expect_true(harness.service.reset_integral("loop_integral", 150U).ok(), "reset_integral should succeed", failures);
    const auto after_reset = harness.service.get_snapshot("loop_integral");
    expect_true(after_reset.ok() && after_reset.value->i_term == 0.0, "reset_integral should zero the integral term", failures);
  }

  if (failures != 0) {
    std::cerr << "test_pid_service_faults failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_service_faults passed\n";
  return 0;
}
