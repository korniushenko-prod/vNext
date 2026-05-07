#include <iostream>
#include <string>

#include "pid/pid_service.hpp"
#include "pid_service_test_support.hpp"

using controller::signals::SignalType;
using controller::pid::PidMode;
using controller::pid::PidServiceErrorCode;
using controller::pid::PidSetpointSourceKind;
using pid_service_test_support::TestHarness;
using pid_service_test_support::expect_true;
using pid_service_test_support::make_descriptor;
using pid_service_test_support::make_signal_descriptor;
using pid_service_test_support::nan_value;
using pid_service_test_support::register_double_signal;
using pid_service_test_support::update_double_signal;

namespace {

int failures = 0;

}  // namespace

int main() {
  {
    TestHarness harness;
    register_double_signal(harness.registry, "plant.pv");
    register_double_signal(harness.registry, "plant.sp");
    auto descriptor = make_descriptor("loop_signal_sp", "Loop Signal SP", "plant.pv", "pwm_1");
    descriptor.setpoint_source_kind = PidSetpointSourceKind::signal;
    descriptor.constant_setpoint = std::nullopt;
    descriptor.setpoint_signal_path = std::string{"plant.sp"};
    expect_true(harness.service.register_pid(descriptor).ok(), "signal-SP controller should register", failures);

    const auto setpoint_result = harness.service.set_constant_setpoint("loop_signal_sp", 50.0, 10U);
    expect_true(
        !setpoint_result.ok() && setpoint_result.status.code == PidServiceErrorCode::pid_service_invalid_argument,
        "set_constant_setpoint should reject signal-source controllers",
        failures);
  }

  {
    TestHarness harness;
    register_double_signal(harness.registry, "plant.pv");
    auto descriptor = make_descriptor("loop_manual_error", "Loop Manual Error", "plant.pv", "pwm_1");
    expect_true(harness.service.register_pid(descriptor).ok(), "manual-output controller should register", failures);

    const auto manual_result = harness.service.set_manual_output("loop_manual_error", nan_value(), 10U);
    expect_true(
        !manual_result.ok() && manual_result.status.code == PidServiceErrorCode::pid_service_invalid_argument,
        "set_manual_output should reject non-finite values",
        failures);
  }

  {
    TestHarness harness;
    const auto unknown_result = harness.service.set_requested_mode("missing", controller::pid::PidServiceMode::manual, 0U);
    expect_true(
        !unknown_result.ok() && unknown_result.status.code == PidServiceErrorCode::pid_service_not_found,
        "unknown controller ids should be rejected",
        failures);
  }

  {
    TestHarness harness(10.0, 90.0, 20.0);
    register_double_signal(harness.registry, "plant.pv");
    update_double_signal(harness.registry, "plant.pv", 20.0, 100U);
    auto descriptor = make_descriptor("loop_output_error", "Loop Output Error", "plant.pv", "pwm_1");
    descriptor.core_config.mode = PidMode::manual;
    descriptor.core_config.output_min = 0.0;
    descriptor.core_config.output_max = 100.0;
    descriptor.core_config.manual_output = 95.0;
    expect_true(harness.service.register_pid(descriptor).ok(), "out-of-range output controller should register", failures);

    const auto tick_result = harness.service.tick(100U);
    expect_true(
        !tick_result.ok() && tick_result.status.code == PidServiceErrorCode::pid_service_output_request_failed,
        "ActuatorManager request failures should surface through PIDService",
        failures);
  }

  {
    TestHarness harness;
    register_double_signal(harness.registry, "plant.pv");
    update_double_signal(harness.registry, "plant.pv", 10.0, 0U);
    expect_true(
        harness.registry
            .register_signal(
                make_signal_descriptor("pid.loop_publish.output", "conflict", SignalType::string),
                controller::signals::SignalValue{std::string{"bad"}},
                0U)
            .ok(),
        "conflicting PID signal path should pre-register successfully",
        failures);

    auto descriptor = make_descriptor("loop_publish", "Loop Publish", "plant.pv", "pwm_1");
    const auto register_result = harness.service.register_pid(descriptor);
    expect_true(
        !register_result.ok() && register_result.status.code == PidServiceErrorCode::pid_service_signal_publish_failed,
        "signal publication failures should surface during registration",
        failures);
  }

  if (failures != 0) {
    std::cerr << "test_pid_service_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_service_errors passed\n";
  return 0;
}
