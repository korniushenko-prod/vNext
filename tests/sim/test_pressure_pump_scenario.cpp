#include <iostream>

#include "mqtt/mqtt_client_backend.hpp"
#include "sim/sim_plant_models.hpp"
#include "sim/sim_scenario_runner.hpp"
#include "sim_test_support.hpp"

int main() {
  using controller::sim::FirstOrderPressurePlant;
  using controller::sim::FirstOrderPressurePlantConfig;
  using controller::sim::SimErrorCode;
  using controller::sim::SimHarness;
  using controller::sim::SimScenarioRunner;
  using controller::sim::SimScheduledAssertion;

  SimHarness harness;
  sim_test::expect_true(harness.initialize().ok(), "sim harness should initialize");
  sim_test::expect_true(harness.mqtt_service.connect(0U).ok(), "mqtt bridge should connect for smoke coverage");

  auto draft = sim_test::make_pressure_pump_draft();
  sim_test::expect_true(harness.apply_template(draft, 0U).ok(), "pressure pump template should apply");
  sim_test::expect_true(harness.set_rule_enabled("pressure.sim_1.rule.low_pressure_on", true, 0U).ok(), "low-pressure rule should enable");
  sim_test::expect_true(harness.set_rule_enabled("pressure.sim_1.rule.high_pressure_off", true, 0U).ok(), "high-pressure rule should enable");

  FirstOrderPressurePlant plant(FirstOrderPressurePlantConfig{
      "pressure_plant",
      "signal.pressure",
      std::optional<std::string>{"relay.main"},
      std::nullopt,
      2.6,
      0.22,
      0.0,
      8.0,
      1.2,
  });

  SimScenarioRunner runner(harness, "pressure_pump");
  sim_test::expect_true(runner.add_component(plant).ok(), "pressure plant should register");
  sim_test::expect_true(
      runner.add_assertion(SimScheduledAssertion{
          "pump_on_early",
          1200U,
          "pump should turn on under low pressure",
          [](const SimHarness& current, const controller::sim::SimTimestampMs) {
            return current.relay_is_on("relay.main")
                       ? controller::sim::SimStatus::success()
                       : controller::sim::SimStatus::error(
                             SimErrorCode::sim_assertion_failed,
                             "relay.main should be on while pressure is below the start threshold");
          },
      })
          .ok(),
      "early pressure assertion should register");
  sim_test::expect_true(
      runner.add_assertion(SimScheduledAssertion{
          "pressure_risen",
          3000U,
          "pressure should rise into the operating band",
          [](const SimHarness& current, const controller::sim::SimTimestampMs now_ms) {
            const auto pressure = current.registry.read_double("signal.pressure", now_ms);
            return pressure.ok() && *pressure.value >= 4.5
                       ? controller::sim::SimStatus::success()
                       : controller::sim::SimStatus::error(
                             SimErrorCode::sim_assertion_failed,
                             "pressure should rise above 4.5 bar during the normal pump cycle");
          },
      })
          .ok(),
      "pressure-rise assertion should register");
  sim_test::expect_true(
      runner.add_assertion(SimScheduledAssertion{
          "pump_off_late",
          5200U,
          "pump should stop after the upper threshold",
          [](const SimHarness& current, const controller::sim::SimTimestampMs) {
            return !current.relay_is_on("relay.main")
                       ? controller::sim::SimStatus::success()
                       : controller::sim::SimStatus::error(
                             SimErrorCode::sim_assertion_failed,
                             "relay.main should be off after pressure crosses the stop threshold");
          },
      })
          .ok(),
      "late pressure assertion should register");

  const auto report = runner.run_for(6000U, 200U);
  sim_test::expect_true(report.completed, "pressure scenario should complete");
  sim_test::expect_true(report.status.ok(), "pressure scenario should succeed");
  sim_test::expect_true(plant.current_pressure() > 4.0, "plant should retain a sane pressure after the cycle");
  sim_test::expect_true(!harness.relay_is_on("relay.main"), "pump relay should be idle at the end of the scenario");

  const auto mqtt_messages = harness.mqtt_backend.published_messages();
  sim_test::expect_true(!mqtt_messages.empty(), "mqtt smoke coverage should publish status snapshots");

  const auto frame = harness.display_service.get_current_frame("display.main");
  sim_test::expect_true(frame.ok(), "display smoke coverage should render a frame");

  if (sim_test::failures != 0) {
    std::cerr << "test_pressure_pump_scenario failed with " << sim_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pressure_pump_scenario passed\n";
  return 0;
}
