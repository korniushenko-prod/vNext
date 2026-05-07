#include <iostream>
#include <string>

#include "pid/pid_service.hpp"
#include "pid_service_test_support.hpp"

using controller::pid::PidServiceErrorCode;
using pid_service_test_support::TestHarness;
using pid_service_test_support::expect_near;
using pid_service_test_support::expect_true;
using pid_service_test_support::make_descriptor;
using pid_service_test_support::register_double_signal;

namespace {

int failures = 0;

}  // namespace

int main() {
  TestHarness harness;
  register_double_signal(harness.registry, "plant.pv");

  auto descriptor = make_descriptor();
  const auto register_result = harness.service.register_pid(descriptor);
  expect_true(register_result.ok(), "valid PID service descriptor should register", failures);

  const auto duplicate_result = harness.service.register_pid(descriptor);
  expect_true(
      !duplicate_result.ok() && duplicate_result.status.code == PidServiceErrorCode::pid_service_already_registered,
      "duplicate PID id should be rejected",
      failures);

  auto missing_target = make_descriptor("loop_missing_target", "Loop Missing Target", "plant.pv", "missing_pwm");
  const auto missing_target_result = harness.service.register_pid(missing_target);
  expect_true(
      !missing_target_result.ok() && missing_target_result.status.code == PidServiceErrorCode::pid_service_invalid_descriptor,
      "unknown PWM target should be rejected",
      failures);

  auto invalid_descriptor = make_descriptor("loop_invalid", "Loop Invalid", "", "pwm_1");
  const auto invalid_result = harness.service.register_pid(invalid_descriptor);
  expect_true(
      !invalid_result.ok() && invalid_result.status.code == PidServiceErrorCode::pid_service_invalid_descriptor,
      "invalid descriptor should be rejected",
      failures);

  const auto snapshot_result = harness.service.get_snapshot("loop1");
  expect_true(snapshot_result.ok(), "snapshot should be available for registered PID", failures);
  expect_true(snapshot_result.ok() && snapshot_result.value->enabled, "snapshot should reflect enabled state", failures);
  expect_true(
      snapshot_result.ok() && snapshot_result.value->requested_mode == controller::pid::PidServiceMode::manual,
      "snapshot should expose requested mode from core config",
      failures);
  expect_true(
      snapshot_result.ok() && snapshot_result.value->effective_mode == controller::pid::PidServiceMode::manual,
      "snapshot should expose effective manual mode before the first tick",
      failures);
  expect_true(snapshot_result.ok() && !snapshot_result.value->fault, "new snapshot should start fault-free", failures);
  expect_true(snapshot_result.ok() && snapshot_result.value->pv_signal_path == "plant.pv", "snapshot should expose PV path", failures);
  expect_true(
      snapshot_result.ok() && snapshot_result.value->output_target_id == "pwm_1",
      "snapshot should expose PWM target id",
      failures);
  expect_true(
      snapshot_result.ok() && snapshot_result.value->sp.has_value(),
      "constant setpoint should be visible in the initial snapshot",
      failures);
  expect_near(
      snapshot_result.ok() ? snapshot_result.value->sp.value_or(0.0) : 0.0,
      50.0,
      1e-9,
      "initial snapshot should expose the constant setpoint",
      failures);
  expect_true(
      snapshot_result.ok() && !snapshot_result.value->pv.has_value(),
      "PV should stay unresolved until the first runtime tick",
      failures);

  const auto descriptors = harness.service.list_descriptors();
  expect_true(descriptors.size() == 1U && descriptors.front().id == "loop1", "list_descriptors should be deterministic", failures);

  if (failures != 0) {
    std::cerr << "test_pid_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_service_basic passed\n";
  return 0;
}
