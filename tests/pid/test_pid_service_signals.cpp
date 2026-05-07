#include <iostream>
#include <string>

#include "pid/pid_service.hpp"
#include "pid_service_test_support.hpp"

using controller::pid::PidMode;
using controller::pid::PidServiceMode;
using controller::pid::PidSetpointSourceKind;
using pid_service_test_support::TestHarness;
using pid_service_test_support::expect_near;
using pid_service_test_support::expect_true;
using pid_service_test_support::make_descriptor;
using pid_service_test_support::make_signal_descriptor;
using pid_service_test_support::register_double_signal;
using pid_service_test_support::update_double_signal;

namespace {

int failures = 0;

}  // namespace

int main() {
  TestHarness harness;

  register_double_signal(harness.registry, "plant.pv", 50U);
  register_double_signal(harness.registry, "plant.sp", 50U);
  update_double_signal(harness.registry, "plant.pv", 20.0, 100U);
  update_double_signal(harness.registry, "plant.sp", 60.0, 100U);

  auto signal_descriptor = make_descriptor("loop_signal", "Loop Signal", "plant.pv", "pwm_1");
  signal_descriptor.core_config.mode = PidMode::auto_mode;
  signal_descriptor.setpoint_source_kind = PidSetpointSourceKind::signal;
  signal_descriptor.constant_setpoint = std::nullopt;
  signal_descriptor.setpoint_signal_path = std::string{"plant.sp"};
  expect_true(harness.service.register_pid(signal_descriptor).ok(), "signal-source PID should register", failures);
  expect_true(harness.service.tick(100U).ok(), "tick with fresh PV/SP should succeed", failures);

  const auto signal_snapshot = harness.service.get_snapshot("loop_signal");
  expect_true(signal_snapshot.ok(), "signal-source snapshot should exist", failures);
  expect_near(signal_snapshot.ok() ? signal_snapshot.value->pv.value_or(0.0) : 0.0, 20.0, 1e-9, "PV should come from SignalRegistry", failures);
  expect_near(signal_snapshot.ok() ? signal_snapshot.value->sp.value_or(0.0) : 0.0, 60.0, 1e-9, "signal SP should come from SignalRegistry", failures);

  register_double_signal(harness.registry, "plant.pv2");
  update_double_signal(harness.registry, "plant.pv2", 10.0, 100U);
  auto constant_descriptor = make_descriptor("loop_constant", "Loop Constant", "plant.pv2", "pwm_1");
  constant_descriptor.core_config.mode = PidMode::manual;
  constant_descriptor.core_config.manual_output = 33.0;
  constant_descriptor.constant_setpoint = 70.0;
  expect_true(harness.service.register_pid(constant_descriptor).ok(), "constant-source PID should register", failures);
  expect_true(harness.service.tick(150U).ok(), "tick for constant-source PID should succeed", failures);

  const auto constant_snapshot = harness.service.get_snapshot("loop_constant");
  expect_near(
      constant_snapshot.ok() ? constant_snapshot.value->sp.value_or(0.0) : 0.0,
      70.0,
      1e-9,
      "constant SP should be exposed in the snapshot",
      failures);

  const auto mode_signal = harness.registry.read_string("pid.loop_signal.effective_mode", 150U);
  const auto pv_signal = harness.registry.read_double("pid.loop_signal.pv", 150U);
  const auto sp_signal = harness.registry.read_double("pid.loop_signal.sp", 150U);
  const auto fault_signal = harness.registry.read_bool("pid.loop_signal.fault", 150U);
  expect_true(mode_signal.ok() && mode_signal.value.value() == "auto", "effective_mode should publish as a string signal", failures);
  expect_true(pv_signal.ok() && pv_signal.value.value() == 20.0, "PV should publish as a PID signal", failures);
  expect_true(sp_signal.ok() && sp_signal.value.value() == 60.0, "SP should publish as a PID signal", failures);
  expect_true(fault_signal.ok() && !fault_signal.value.value(), "fault signal should publish false while healthy", failures);

  update_double_signal(harness.registry, "plant.pv", 22.0, 200U, false, false);
  expect_true(harness.service.tick(200U).ok(), "tick with invalid PV should complete and enter runtime fault", failures);
  const auto invalid_snapshot = harness.service.get_snapshot("loop_signal");
  expect_true(
      invalid_snapshot.ok() && invalid_snapshot.value->fault &&
          invalid_snapshot.value->effective_mode == PidServiceMode::fault,
      "invalid_as_fault should convert invalid PV into runtime fault mode",
      failures);

  update_double_signal(harness.registry, "plant.pv", 22.0, 230U, true, false);
  update_double_signal(harness.registry, "plant.sp", 62.0, 230U, true, true);
  expect_true(harness.service.tick(230U).ok(), "tick with faulted SP should complete and enter runtime fault", failures);
  const auto faulted_sp_snapshot = harness.service.get_snapshot("loop_signal");
  expect_true(faulted_sp_snapshot.ok() && faulted_sp_snapshot.value->fault, "faulted SP signal should force fault mode", failures);

  update_double_signal(harness.registry, "plant.pv", 22.0, 300U, true, false);
  update_double_signal(harness.registry, "plant.sp", 62.0, 300U, true, false);
  expect_true(harness.service.tick(370U).ok(), "tick with stale sources should still complete", failures);
  const auto stale_snapshot = harness.service.get_snapshot("loop_signal");
  expect_true(stale_snapshot.ok() && stale_snapshot.value->fault, "stale_as_fault should convert stale inputs into runtime fault", failures);

  auto missing_descriptor = make_descriptor("loop_missing_signal", "Loop Missing Signal", "missing.pv", "pwm_1");
  missing_descriptor.core_config.mode = PidMode::auto_mode;
  expect_true(harness.service.register_pid(missing_descriptor).ok(), "missing-signal PID should still register", failures);
  expect_true(harness.service.tick(400U).ok(), "missing PV should become a runtime fault, not a tick failure", failures);
  const auto missing_snapshot = harness.service.get_snapshot("loop_missing_signal");
  expect_true(missing_snapshot.ok() && missing_snapshot.value->fault, "missing PV should surface as deterministic runtime fault", failures);

  if (failures != 0) {
    std::cerr << "test_pid_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_service_signals passed\n";
  return 0;
}
