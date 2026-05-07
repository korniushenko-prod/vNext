#include <iostream>

#include "flow/flow_snapshot.hpp"
#include "sim/sim_plant_models.hpp"
#include "sim/sim_scenario_runner.hpp"
#include "sim_test_support.hpp"

int main() {
  using controller::sim::PulseFlowPlant;
  using controller::sim::PulseFlowPlantConfig;
  using controller::sim::SimErrorCode;
  using controller::sim::SimHarness;
  using controller::sim::SimScenarioRunner;
  using controller::sim::SimScheduledAssertion;

  SimHarness harness;
  sim_test::expect_true(harness.initialize().ok(), "sim harness should initialize");

  const auto register_result = harness.flow_service.register_flowmeter(sim_test::make_flow_descriptor());
  sim_test::expect_true(register_result.ok(), "flowmeter should register");
  sim_test::expect_true(harness.flow_service.initialize_from_storage(0U).ok(), "flow storage should initialize");
  sim_test::expect_true(harness.start_batch("flow1", 0U).ok(), "batch should start before program launch");

  auto draft = sim_test::make_batch_dosing_draft();
  sim_test::expect_true(harness.apply_template(draft, 0U).ok(), "batch dosing template should apply");
  sim_test::expect_true(harness.set_program_enabled("batch.sim_1.program.main", true, 0U).ok(), "batch program should enable");
  sim_test::expect_true(harness.start_program("batch.sim_1.program.main", 0U).ok(), "batch program should start");

  PulseFlowPlant plant(PulseFlowPlantConfig{
      "batch_flow_plant",
      "pulse.flow1",
      std::optional<std::string>{"relay.valve"},
      std::nullopt,
      std::optional<std::string>{"signal.flow_rate"},
      1.0,
      10.0,
      0.0,
  });

  SimScenarioRunner runner(harness, "flow_batch");
  sim_test::expect_true(runner.add_component(plant).ok(), "flow plant should register");
  sim_test::expect_true(
      runner.add_assertion(SimScheduledAssertion{
          "valve_open",
          500U,
          "dispense output should open early",
          [](const SimHarness& current, const controller::sim::SimTimestampMs) {
            return current.relay_is_on("relay.valve")
                       ? controller::sim::SimStatus::success()
                       : controller::sim::SimStatus::error(
                             SimErrorCode::sim_assertion_failed,
                             "relay.valve should be active while the batch dispense state is running");
          },
      })
          .ok(),
      "valve-open assertion should register");

  const auto report = runner.run_for(4500U, 100U);
  sim_test::expect_true(report.completed, "flow batch scenario should complete");
  sim_test::expect_true(report.status.ok(), "flow batch scenario should succeed");

  const auto snapshot = harness.flow_service.get_snapshot("flow1");
  sim_test::expect_true(snapshot.ok(), "flow snapshot should be available");
  if (snapshot.ok()) {
    sim_test::expect_true(!snapshot.value->batch_active, "batch should be inactive after completion");
    sim_test::expect_true(snapshot.value->batch_done, "batch_done should assert when the target is reached");
    sim_test::expect_near(snapshot.value->batch_total_units, 2.0, 0.25, "batch total should land near the 2.0 L target");
    sim_test::expect_true(snapshot.value->lifetime_total_units >= 2.0, "lifetime total should preserve completed volume");
  }

  const auto program = sim_test::find_program_snapshot(
      harness.sequence_service.list_program_snapshots(report.ended_at_ms),
      "batch.sim_1.program.main");
  sim_test::expect_true(program.has_value(), "program snapshot should be available");
  if (program.has_value()) {
    sim_test::expect_true(
        program->current_state_id == std::optional<std::string>{"NORMAL_STOP"},
        "batch program should end in NORMAL_STOP after batch completion");
  }

  sim_test::expect_true(!harness.relay_is_on("relay.valve"), "valve output should release once the batch is complete");

  if (sim_test::failures != 0) {
    std::cerr << "test_flow_batch_scenario failed with " << sim_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_batch_scenario passed\n";
  return 0;
}
