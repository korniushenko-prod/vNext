#include <iostream>

#include "../templates/template_test_support.hpp"

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template api preview context should initialize");
  const auto preview = context.api_service.preview_template_draft(template_test::make_batch_dosing_draft(), 0U);
  template_test::expect_true(preview.value.has_value(), "preview should return a value");
  template_test::expect_true(!preview.value->bundle_summary.generated_programs.empty(), "preview should expose generated programs");
  template_test::expect_true(!preview.value->bundle_summary.generated_programs.front().state_ids.empty(), "preview should expose generated state ids");
  template_test::expect_true(preview.value->apply_allowed, "valid preview should allow apply");

  auto warning_draft = template_test::make_batch_dosing_draft();
  warning_draft.bindings.erase("batch_done_signal");
  const auto warning_preview = context.api_service.preview_template_draft(warning_draft, 0U);
  template_test::expect_true(warning_preview.value.has_value(), "warning preview should return a value");
  template_test::expect_true(template_test::contains_issue_code(warning_preview.value->validation_issues, "TEMPLATE_MISSING_OPTIONAL_BATCH_DONE_WARNING"), "preview should preserve validation warnings");
  if (template_test::failures != 0) {
    std::cerr << "test_template_api_preview failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_api_preview passed\n";
  return 0;
}
