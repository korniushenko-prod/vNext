#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "program builder API preview context should initialize");

  {
    auto draft = make_pump_builder_draft();
    const auto preview = context.api_service.preview_draft(draft, 0U);
    expect_true(preview.ok(), "valid pump draft should preview successfully");
    expect_true(!preview.value->generated_states.empty(), "preview should expose generated state list");
    expect_true(!preview.value->required_review_warnings.empty(), "preview should expose review warnings");
    expect_true(preview.value->will_create_disabled, "preview should warn that created program stays disabled");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.parameters.erase("min_run_time_ms");
    const auto preview = context.api_service.preview_draft(draft, 0U);
    expect_true(!preview.ok(), "invalid draft preview should report failure");
    expect_true(!preview.value->validation_issues.empty(), "invalid preview should preserve validation issues");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.enabled_after_create = true;
    const auto preview = context.api_service.preview_draft(draft, 0U);
    expect_true(preview.value->will_create_disabled, "preview should still show disabled create behavior");
    expect_true(!preview.value->validation_issues.empty(), "unsafe enable request should be preserved as a validation issue");
  }

  if (failures != 0) {
    std::cerr << "test_program_builder_api_preview failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_builder_api_preview passed\n";
  return 0;
}
