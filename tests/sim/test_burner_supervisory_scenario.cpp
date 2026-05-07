#include <iostream>
#include <vector>

#include "sim/sim_events.hpp"
#include "sim/sim_plant_models.hpp"
#include "sim/sim_scenario_runner.hpp"
#include "sim_test_support.hpp"

int main() {
  using controller::sequence::SequenceLifecycle;
  using controller::sim::BurnerScenarioHarness;
  using controller::sim::BurnerScenarioHarnessConfig;
  using controller::sim::BurnerScenarioPoint;
  using controller::sim::SimErrorCode;
  using controller::sim::SimHarness;
  using controller::sim::SimScenarioRunner;
  using controller::sim::SimScheduledEvent;
  using controller::sim::SimSequenceCommandEvent;

  {
    SimHarness harness;
    sim_test::expect_true(harness.initialize().ok(), "normal burner harness should initialize");

    auto draft = sim_test::make_burner_draft();
    sim_test::expect_true(harness.apply_template(draft, 0U).ok(), "burner template should apply");
    sim_test::expect_true(harness.set_program_enabled("burner.sim_1.program.main", true, 0U).ok(), "burner program should enable");
    sim_test::expect_true(harness.start_program("burner.sim_1.program.main", 0U).ok(), "burner program should start");

    BurnerScenarioHarness burner(BurnerScenarioHarnessConfig{
        "burner_normal_signals",
        "signal.air_ok",
        "signal.flame",
        std::nullopt,
        false,
        false,
        std::nullopt,
    });
    burner.add_point(BurnerScenarioPoint{100U, true, std::nullopt, std::nullopt});
    burner.add_point(BurnerScenarioPoint{1700U, std::nullopt, true, std::nullopt});

    SimScenarioRunner runner(harness, "burner_normal");
    sim_test::expect_true(runner.add_component(burner).ok(), "burner signal harness should register");

    const auto report = runner.run_for(3200U, 100U);
    sim_test::expect_true(report.completed, "normal burner scenario should complete");
    sim_test::expect_true(report.status.ok(), "normal burner scenario should succeed");

    const auto snapshot = harness.sequence_service.get_active_snapshot(report.ended_at_ms);
    sim_test::expect_true(snapshot.ok(), "normal burner snapshot should be available");
    if (snapshot.ok()) {
      sim_test::expect_true(
          snapshot.value->current_state_id == std::optional<std::string>{"RUN"},
          "normal burner path should reach RUN");
      sim_test::expect_true(
          snapshot.value->lifecycle == SequenceLifecycle::running,
          "normal burner lifecycle should remain running");
      sim_test::expect_true(!snapshot.value->lockout, "normal burner path should avoid lockout");
    }

    const auto order = sim_test::entered_state_order(harness.sequence_service.read_history());
    sim_test::expect_true(
        sim_test::contains_state_sequence(order, {"OFF", "READY_CHECK", "PREPURGE", "IGNITION", "FLAME_PROVE", "RUN"}),
        "normal burner history should traverse OFF -> READY_CHECK -> PREPURGE -> IGNITION -> FLAME_PROVE -> RUN");
  }

  {
    SimHarness harness;
    sim_test::expect_true(harness.initialize().ok(), "flame-loss burner harness should initialize");

    auto draft = sim_test::make_burner_draft();
    sim_test::expect_true(harness.apply_template(draft, 0U).ok(), "burner template should apply in flame-loss scenario");
    sim_test::expect_true(harness.set_program_enabled("burner.sim_1.program.main", true, 0U).ok(), "burner program should enable in flame-loss scenario");
    sim_test::expect_true(harness.start_program("burner.sim_1.program.main", 0U).ok(), "burner program should start in flame-loss scenario");

    BurnerScenarioHarness burner(BurnerScenarioHarnessConfig{
        "burner_fault_signals",
        "signal.air_ok",
        "signal.flame",
        std::nullopt,
        false,
        false,
        std::nullopt,
    });
    burner.add_point(BurnerScenarioPoint{100U, true, std::nullopt, std::nullopt});
    burner.add_point(BurnerScenarioPoint{1700U, std::nullopt, true, std::nullopt});
    burner.add_point(BurnerScenarioPoint{2500U, std::nullopt, false, std::nullopt});

    SimScenarioRunner runner(harness, "burner_flame_loss");
    sim_test::expect_true(runner.add_component(burner).ok(), "burner signal harness should register for flame-loss scenario");
    sim_test::expect_true(
        runner.injector()
            .add_event(SimScheduledEvent{
                "trip_on_flame_loss",
                2600U,
                SimSequenceCommandEvent{
                    SimSequenceCommandEvent::Kind::request_trip_stop,
                    "",
                    true,
                    "sim_fault",
                    "flame_loss_trip",
                },
                false,
            })
            .ok(),
        "flame-loss trip event should register");

    const auto report = runner.run_for(4200U, 100U);
    sim_test::expect_true(report.completed, "burner flame-loss scenario should complete");
    sim_test::expect_true(report.status.ok(), "burner flame-loss scenario should succeed");

    const auto snapshot = harness.sequence_service.get_active_snapshot(report.ended_at_ms);
    sim_test::expect_true(snapshot.ok(), "burner flame-loss snapshot should be available");
    if (snapshot.ok()) {
      sim_test::expect_true(snapshot.value->lockout, "burner flame-loss path should end in lockout");
      sim_test::expect_true(
          snapshot.value->current_state_id == std::optional<std::string>{"LOCKOUT"},
          "burner flame-loss path should transition into LOCKOUT");
    }

    const auto flame_alarm = harness.alarm_service.get_snapshot("burner.sim_1.alarm.flame_fault");
    sim_test::expect_true(
        flame_alarm.ok() && flame_alarm.value->state.active,
        "flame-loss scenario should assert the generated flame-fault alarm");

    const auto history = harness.sequence_service.read_history();
    sim_test::expect_true(
        sim_test::history_contains_reason(history, "flame_loss_trip"),
        "trip history should record the flame-loss reason");
  }

  if (sim_test::failures != 0) {
    std::cerr << "test_burner_supervisory_scenario failed with " << sim_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_burner_supervisory_scenario passed\n";
  return 0;
}
