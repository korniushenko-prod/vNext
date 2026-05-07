#include <iostream>

#include "../templates/template_test_support.hpp"

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template web adapter context should initialize");
  const auto preview = context.web_adapter.preview_template(template_test::make_incinerator_supervisory_draft(), 0U);
  template_test::expect_true(preview.value.has_value(), "web adapter preview should return a view model");
  template_test::expect_true(preview.value->will_create_disabled, "web adapter should preserve disabled-by-default note");
  template_test::expect_true(!preview.value->disabled_note.empty(), "web adapter should preserve disabled-by-default note text");
  template_test::expect_true(preview.value->supervisory_only, "web adapter should preserve supervisory-only flag");
  template_test::expect_true(!preview.value->binding_fields.empty(), "web adapter should expose binding fields");
  template_test::expect_true(!preview.value->parameter_fields.empty(), "web adapter should expose parameter fields");
  template_test::expect_true(!preview.value->preview_artifacts.empty(), "web adapter should expose preview artifacts");
  template_test::expect_true(!preview.value->warnings.empty(), "web adapter should preserve warnings");
  if (template_test::failures != 0) {
    std::cerr << "test_web_template_adapter failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_web_template_adapter passed\n";
  return 0;
}
