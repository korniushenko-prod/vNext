#include <iostream>

#include "sim/sim_events.hpp"
#include "sim/sim_scenario_runner.hpp"
#include "sim_test_support.hpp"

int main() {
  using controller::sim::SimCustomEvent;
  using controller::sim::SimErrorCode;
  using controller::sim::SimHarness;
  using controller::sim::SimScenarioRunner;
  using controller::sim::SimScheduledEvent;
  using controller::templates::TemplateDraft;

  SimHarness harness;
  sim_test::expect_true(harness.initialize().ok(), "fault-injection harness should initialize");
  sim_test::expect_true(
      harness.registry.update_signal("signal.air_ok", controller::signals::SignalValue{true}, 0U).ok(),
      "air_ok should seed true for the blocking burner program");

  auto blocking = sim_test::make_burner_draft();
  sim_test::expect_true(harness.apply_template(blocking, 0U).ok(), "blocking burner template should apply");
  sim_test::expect_true(harness.set_program_enabled("burner.sim_1.program.main", true, 0U).ok(), "blocking burner program should enable");
  sim_test::expect_true(harness.start_program("burner.sim_1.program.main", 0U).ok(), "blocking burner program should start");

  SimScenarioRunner runner(harness, "template_apply_blocked");
  sim_test::expect_true(
      runner.injector()
          .add_event(SimScheduledEvent{
              "apply_while_active",
              200U,
              SimCustomEvent{
                  "apply pressure template while a program is active",
                  [](SimHarness& current, const controller::sim::SimTimestampMs now_ms) {
                    TemplateDraft draft = sim_test::make_pressure_pump_draft();
                    draft.instance_id = "pressure.blocked_1";
                    draft.display_name = "Blocked Apply";
                    return current.apply_template(draft, now_ms, "sim_fault", "apply_while_active");
                  },
              },
              false,
          })
          .ok(),
      "blocking apply event should register");

  const auto report = runner.run_for(1000U, 100U);
  sim_test::expect_true(!report.completed, "fault-injection scenario should stop early");
  sim_test::expect_true(report.stopped_early, "fault-injection scenario should stop at the injected failure");
  sim_test::expect_true(
      report.status.code == SimErrorCode::sim_scenario_failed,
      "fault-injection scenario should surface a structured SIM_SCENARIO_FAILED code");
  sim_test::expect_true(
      report.reason.find("active program") != std::string::npos || report.reason.find("Active program") != std::string::npos,
      "fault-injection reason should mention the active-program apply guard");

  if (sim_test::failures != 0) {
    std::cerr << "test_sim_fault_injection failed with " << sim_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sim_fault_injection passed\n";
  return 0;
}
