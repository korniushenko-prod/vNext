#include <iostream>

#include "../templates/template_test_support.hpp"

int main() {
  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "template web view model context should initialize");
    const auto catalog = context.web_adapter.load_template_catalog(0U);
    template_test::expect_true(catalog.value.has_value(), "template catalog view model should load");
    template_test::expect_equal(catalog.value->templates.size(), std::size_t{8}, "template selector should expose all supported template kinds");
  }

  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "template schema view model context should initialize");
    const auto schema = context.web_adapter.load_template_schema(controller::templates::TemplateKind::burner_supervisory_skeleton, 0U);
    template_test::expect_true(schema.value.has_value(), "burner schema view model should load");
    template_test::expect_true(schema.value->supervisory_only, "burner view model should mark supervisory-only template");
    template_test::expect_true(!schema.value->supervisory_note.empty(), "burner view model should include supervisory warning");
    template_test::expect_true(schema.value->binding_fields.front().required, "required binding indicators should be present");
    template_test::expect_true(!schema.value->disabled_note.empty(), "burner schema view model should include disabled-by-default note");
  }

  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "template apply-disabled view model context should initialize");
    auto draft = template_test::make_pressure_pump_draft();
    draft.bindings.erase("primary_output");
    const auto preview = context.web_adapter.preview_template(draft, 0U);
    template_test::expect_true(preview.value.has_value(), "invalid preview should still return a view model");
    template_test::expect_false(preview.value->apply_allowed, "apply-disabled state should be represented");
    template_test::expect_true(!preview.value->issues.empty(), "invalid preview should surface issues");
  }

  if (template_test::failures != 0) {
    std::cerr << "test_web_template_view_model failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_web_template_view_model passed\n";
  return 0;
}
