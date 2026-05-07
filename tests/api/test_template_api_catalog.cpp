#include <iostream>

#include "../templates/template_test_support.hpp"

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template api catalog context should initialize");

  const auto list = context.api_service.list_templates(0U);
  template_test::expect_true(list.ok(), "template api should expose list_templates");
  template_test::expect_equal(list.value->size(), std::size_t{8}, "template api should expose eight template kinds");
  template_test::expect_equal(std::string{controller::templates::to_string(list.value->front().kind)}, "pressure_pump", "template api list ordering should be deterministic");

  const auto catalog = context.api_service.get_template_catalog(0U);
  template_test::expect_true(catalog.ok(), "template api should expose catalog");
  template_test::expect_true(!catalog.value->signals.empty(), "template api catalog should include signals");

  const auto schema = context.api_service.get_template_schema(controller::templates::TemplateKind::burner_supervisory_skeleton, 0U);
  template_test::expect_true(schema.ok(), "template api should expose per-kind schema");
  template_test::expect_true(schema.value->definition.supervisory_only, "burner schema should be marked supervisory-only");

  if (template_test::failures != 0) {
    std::cerr << "test_template_api_catalog failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_api_catalog passed\n";
  return 0;
}
