#include <iostream>

#include "sim/sim_events.hpp"
#include "sim/sim_plant_models.hpp"
#include "sim/sim_scenario_runner.hpp"
#include "sim_test_support.hpp"

int main() {
  using controller::sim::IncineratorTemperaturePlant;
  using controller::sim::IncineratorTemperaturePlantConfig;
  using controller::sim::SimHarness;
  using controller::sim::SimScenarioRunner;
  using controller::sim::SimScheduledEvent;
  using controller::sim::SimSequenceCommandEvent;

  SimHarness harness;
  sim_test::expect_true(harness.initialize().ok(), "incinerator harness should initialize");
  sim_test::expect_true(
      harness.registry.update_signal("signal.sludge_ready", controller::signals::SignalValue{true}, 0U).ok(),
      "sludge_ready should seed true for the normal supervisory path");
  sim_test::expect_true(
      harness.registry.update_signal("signal.flame", controller::signals::SignalValue{true}, 0U).ok(),
      "flame should seed true to keep the optional flame alarm quiet");

  auto draft = sim_test::make_incinerator_draft();
  sim_test::expect_true(harness.apply_template(draft, 0U).ok(), "incinerator template should apply");
  sim_test::expect_true(harness.set_program_enabled("incinerator.sim_1.program.main", true, 0U).ok(), "incinerator program should enable");
  sim_test::expect_true(harness.start_program("incinerator.sim_1.program.main", 0U).ok(), "incinerator program should start");

  IncineratorTemperaturePlant plant(IncineratorTemperaturePlantConfig{
      "incinerator_temp",
      "signal.chamber_temp",
      "pwm.fan",
      "relay.diesel",
      "pwm.valve",
      25.0,
      40.0,
      18.0,
      0.05,
      0.10,
      450.0,
      25.0,
  });

  SimScenarioRunner runner(harness, "incinerator_supervisory");
  sim_test::expect_true(runner.add_component(plant).ok(), "incinerator temperature plant should register");
  sim_test::expect_true(
      runner.injector()
          .add_event(SimScheduledEvent{
              "request_normal_stop",
              11000U,
              SimSequenceCommandEvent{
                  SimSequenceCommandEvent::Kind::request_normal_stop,
                  "",
                  true,
                  "sim_operator",
                  "planned_stop",
              },
              false,
          })
          .ok(),
      "normal-stop event should register");

  const auto report = runner.run_for(22000U, 200U);
  sim_test::expect_true(report.completed, "incinerator scenario should complete");
  sim_test::expect_true(report.status.ok(), "incinerator scenario should succeed");

  const auto snapshot = sim_test::find_program_snapshot(
      harness.sequence_service.list_program_snapshots(report.ended_at_ms),
      "incinerator.sim_1.program.main");
  sim_test::expect_true(snapshot.has_value(), "incinerator sequence snapshot should be available");
  if (snapshot.has_value()) {
    sim_test::expect_true(
        snapshot->current_state_id == std::optional<std::string>{"NORMAL_STOP"},
        "normal stop should finish through the cooldown path into NORMAL_STOP");
  }

  const auto temperature = harness.registry.read_double("signal.chamber_temp", report.ended_at_ms);
  sim_test::expect_true(temperature.ok() && temperature.value.has_value(), "chamber temperature should be readable");
  if (temperature.ok() && temperature.value.has_value()) {
    sim_test::expect_true(*temperature.value <= 55.0, "temperature should cool back toward the configured cooldown threshold");
  }

  const auto states = sim_test::entered_state_order(harness.sequence_service.read_history());
  sim_test::expect_true(
      sim_test::contains_state_sequence(states, {"OFF", "READY_CHECK", "DIESEL_WARMUP", "SLUDGE_ENABLE", "SLUDGE_RUN", "COOLDOWN", "NORMAL_STOP"}),
      "incinerator history should preserve the warmup -> sludge -> cooldown order");

  if (sim_test::failures != 0) {
    std::cerr << "test_incinerator_supervisory_scenario failed with " << sim_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_incinerator_supervisory_scenario passed\n";
  return 0;
}
