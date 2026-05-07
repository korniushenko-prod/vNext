#include <iostream>

#include "template_test_support.hpp"

namespace {

void expect_bundle_disabled(const controller::templates::TemplateBundle& bundle) {
  for (const auto& rule : bundle.generated_rules) {
    template_test::expect_false(rule.enabled, "generated rules should be disabled by default");
  }
  for (const auto& pid : bundle.generated_pids) {
    template_test::expect_false(pid.enabled, "generated pids should be disabled by default");
    template_test::expect_false(pid.core_config.enabled, "generated pid core config should be disabled by default");
  }
  for (const auto& program : bundle.generated_programs) {
    template_test::expect_false(program.enabled, "generated programs should be disabled by default");
  }
}

}  // namespace

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template generation context should initialize");

  {
    const auto generated = context.engine.generate_bundle(template_test::make_pressure_pump_draft());
    template_test::expect_true(generated.ok(), "pressure pump bundle should generate");
    template_test::expect_equal(generated.value->generated_rules.size(), std::size_t{2}, "pressure pump should generate two base rules");
    template_test::expect_equal(generated.value->generated_rules.front().id, std::string{"pump.template_1.rule.low_pressure_on"}, "pressure pump ids should be deterministic");
    expect_bundle_disabled(*generated.value);
  }

  {
    const auto generated = context.engine.generate_bundle(template_test::make_pump_with_flowmeter_draft());
    template_test::expect_true(generated.ok(), "pump-with-flowmeter bundle should generate");
    template_test::expect_equal(generated.value->generated_rules.size(), std::size_t{4}, "pump-with-flowmeter should generate base rules plus no-flow and high-trip supervision");
    template_test::expect_equal(generated.value->generated_alarms.size(), std::size_t{2}, "pump-with-flowmeter should generate no-flow and high-pressure alarms when configured");
    expect_bundle_disabled(*generated.value);
  }

  {
    const auto generated = context.engine.generate_bundle(template_test::make_batch_dosing_draft());
    template_test::expect_true(generated.ok(), "batch dosing bundle should generate");
    template_test::expect_equal(generated.value->generated_programs.size(), std::size_t{1}, "batch dosing should generate one sequence program");
    template_test::expect_equal(generated.value->generated_programs.front().states[2].id, std::string{"DISPENSE"}, "batch dosing should include DISPENSE state");
    expect_bundle_disabled(*generated.value);
  }

  {
    const auto generated = context.engine.generate_bundle(template_test::make_pid_pressure_pwm_pump_draft());
    template_test::expect_true(generated.ok(), "pid pressure bundle should generate");
    template_test::expect_equal(generated.value->generated_pids.size(), std::size_t{1}, "pid pressure template should generate one pid descriptor");
    template_test::expect_equal(generated.value->generated_pids.front().id, std::string{"pid.pressure_1.pid.main"}, "pid id should be deterministic");
    expect_bundle_disabled(*generated.value);
  }

  {
    const auto generated = context.engine.generate_bundle(template_test::make_pid_flow_pwm_pump_draft());
    template_test::expect_true(generated.ok(), "pid flow bundle should generate");
    template_test::expect_equal(generated.value->generated_pids.front().id, std::string{"pid.flow_1.pid.main"}, "pid flow id should be deterministic");
    expect_bundle_disabled(*generated.value);
  }

  {
    const auto compressor = context.engine.generate_bundle(template_test::make_compressor_basic_draft());
    template_test::expect_true(compressor.ok(), "compressor bundle should generate");
    template_test::expect_equal(compressor.value->generated_programs.size(), std::size_t{1}, "compressor template should generate one program");
    template_test::expect_equal(compressor.value->generated_alarms.size(), std::size_t{2}, "compressor template should generate optional alarms when bindings are present");
    expect_bundle_disabled(*compressor.value);
  }

  {
    const auto burner = context.engine.generate_bundle(template_test::make_burner_supervisory_draft());
    template_test::expect_true(burner.ok(), "burner supervisory bundle should generate");
    template_test::expect_equal(burner.value->generated_programs.size(), std::size_t{1}, "burner template should generate one supervisory program");
    template_test::expect_true(template_test::contains_text(burner.value->warnings, "Burner template is supervisory-only. It is not certified burner management logic and remains disabled after apply."), "burner warning should be preserved");
    template_test::expect_equal(burner.value->generated_programs.front().states.front().id, std::string{"OFF"}, "burner supervisory states should begin at OFF");
    expect_bundle_disabled(*burner.value);
  }

  {
    const auto incinerator = context.engine.generate_bundle(template_test::make_incinerator_supervisory_draft());
    template_test::expect_true(incinerator.ok(), "incinerator supervisory bundle should generate");
    template_test::expect_equal(incinerator.value->generated_programs.front().states[1].id, std::string{"READY_CHECK"}, "incinerator supervisory program should include READY_CHECK");
    template_test::expect_true(template_test::contains_text(incinerator.value->warnings, "Incinerator template is supervisory-only. It is not certified combustion logic and remains disabled after apply."), "incinerator warning should be preserved");
    expect_bundle_disabled(*incinerator.value);
  }

  if (template_test::failures != 0) {
    std::cerr << "test_template_engine_generation failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_engine_generation passed\n";
  return 0;
}
