#include <iostream>

#include "template_test_support.hpp"

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template test context should initialize");
  const auto templates = context.engine.list_templates();
  template_test::expect_equal(templates.size(), std::size_t{8}, "catalog should expose all supported template kinds");
  template_test::expect_equal(std::string{controller::templates::to_string(templates.front().kind)}, "pressure_pump", "template ordering should be deterministic");
  template_test::expect_equal(std::string{controller::templates::to_string(templates.back().kind)}, "incinerator_supervisory_skeleton", "template ordering should include the final supervisory template");

  const auto catalog = context.engine.get_catalog();
  template_test::expect_equal(catalog.supported_templates.size(), std::size_t{8}, "full catalog should expose eight template definitions");
  template_test::expect_true(!catalog.signals.empty(), "catalog should expose signals");
  template_test::expect_true(!catalog.actuators.empty(), "catalog should expose actuators");
  template_test::expect_true(!catalog.timers.empty(), "catalog should expose timers");
  template_test::expect_true(!catalog.alarms.empty(), "catalog should expose alarms");
  template_test::expect_equal(catalog.signals.front().path, std::string{"alarm.active_count"}, "signal catalog ordering should be deterministic");

  const auto schema = context.engine.get_schema(controller::templates::TemplateKind::pressure_pump);
  template_test::expect_true(schema.ok(), "pressure pump schema should load");
  template_test::expect_equal(schema.value->definition.slot_definitions.size(), std::size_t{2}, "pressure pump should expose two slot definitions");
  template_test::expect_equal(schema.value->definition.parameter_definitions.size(), std::size_t{4}, "pressure pump should expose four parameter definitions");
  template_test::expect_equal(schema.value->definition.slot_definitions.front().slot_id, std::string{"pressure_signal"}, "slot schema ordering should be deterministic");
  template_test::expect_equal(schema.value->definition.parameter_definitions.front().parameter_id, std::string{"start_threshold"}, "parameter schema ordering should be deterministic");
  if (template_test::failures != 0) {
    std::cerr << "test_template_engine_catalog failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_engine_catalog passed\n";
  return 0;
}
