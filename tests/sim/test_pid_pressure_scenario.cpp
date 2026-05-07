#include <iostream>

#include "pid/pid_service_snapshot.hpp"
#include "pid/pid_service_types.hpp"
#include "sim/sim_plant_models.hpp"
#include "sim/sim_scenario_runner.hpp"
#include "sim_test_support.hpp"

int main() {
  using controller::pid::PidServiceMode;
  using controller::sim::FirstOrderPressurePlant;
  using controller::sim::FirstOrderPressurePlantConfig;
  using controller::sim::SimErrorCode;
  using controller::sim::SimHarness;
  using controller::sim::SimScenarioRunner;
  using controller::sim::SimScheduledAssertion;

  SimHarness harness;
  sim_test::expect_true(harness.initialize().ok(), "sim harness should initialize");

  auto draft = sim_test::make_pid_pressure_draft();
  sim_test::expect_true(harness.apply_template(draft, 0U).ok(), "pid pressure template should apply");
  sim_test::expect_true(harness.set_pid_enabled("pid.sim_1.pid.main", true, 0U).ok(), "pid loop should enable");
  sim_test::expect_true(harness.set_pid_mode("pid.sim_1.pid.main", PidServiceMode::auto_mode, 0U).ok(), "pid loop should enter auto mode");

  FirstOrderPressurePlant plant(FirstOrderPressurePlantConfig{
      "pid_pressure_plant",
      "signal.pressure",
      std::nullopt,
      std::optional<std::string>{"pwm.main"},
      3.1,
      0.58,
      0.0,
      9.0,
      0.0,
  });

  SimScenarioRunner runner(harness, "pid_pressure");
  sim_test::expect_true(runner.add_component(plant).ok(), "pressure plant should register");
  sim_test::expect_true(
      runner.add_assertion(SimScheduledAssertion{
          "pid_output_active",
          3000U,
          "pid should begin driving pwm output",
          [](const SimHarness& current, const controller::sim::SimTimestampMs) {
            const auto enabled = current.pwm_hal.get_enabled("pwm.main");
            return enabled.ok() && enabled.value.has_value() && *enabled.value
                       ? controller::sim::SimStatus::success()
                       : controller::sim::SimStatus::error(
                             SimErrorCode::sim_assertion_failed,
                             "pwm.main should be enabled after the pid loop starts");
          },
      })
          .ok(),
      "pid output assertion should register");
  sim_test::expect_true(
      runner.add_assertion(SimScheduledAssertion{
          "pressure_near_band",
          18000U,
          "pressure should be near the setpoint band",
          [](const SimHarness& current, const controller::sim::SimTimestampMs now_ms) {
            const auto pressure = current.registry.read_double("signal.pressure", now_ms);
            return pressure.ok() && pressure.value.has_value() && *pressure.value >= 4.0 && *pressure.value <= 6.2
                       ? controller::sim::SimStatus::success()
                       : controller::sim::SimStatus::error(
                             SimErrorCode::sim_assertion_failed,
                             "pressure should settle into the coarse operating band by 18 s");
          },
      })
          .ok(),
      "pressure-band assertion should register");

  const auto report = runner.run_for(30000U, 200U);
  sim_test::expect_true(report.completed, "pid scenario should complete");
  sim_test::expect_true(report.status.ok(), "pid scenario should succeed");

  const auto pressure = harness.registry.read_double("signal.pressure", report.ended_at_ms);
  sim_test::expect_true(pressure.ok() && pressure.value.has_value(), "pressure signal should be readable at the end");
  if (pressure.ok() && pressure.value.has_value()) {
    sim_test::expect_near(*pressure.value, 5.0, 0.6, "pressure should converge within +/-10% of the 5.0 setpoint");
  }

  const auto pid_snapshot = harness.pid_service.get_snapshot("pid.sim_1.pid.main");
  sim_test::expect_true(pid_snapshot.ok(), "pid snapshot should be available");
  if (pid_snapshot.ok()) {
    sim_test::expect_true(pid_snapshot.value->effective_mode == PidServiceMode::auto_mode, "pid should remain in auto mode");
    sim_test::expect_true(
        pid_snapshot.value->output >= 0.0 && pid_snapshot.value->output <= 100.0,
        "pid output should stay within configured limits");
    sim_test::expect_true(
        !pid_snapshot.value->saturated_high || *pressure.value <= 6.5,
        "pid should avoid unstable overshoot beyond the loose documented tolerance");
  }

  if (sim_test::failures != 0) {
    std::cerr << "test_pid_pressure_scenario failed with " << sim_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_pressure_scenario passed\n";
  return 0;
}
