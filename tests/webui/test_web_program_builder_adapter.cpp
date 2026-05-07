#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "web program builder adapter context should initialize");

  {
    const auto loaded = context.web_adapter.load_builder_catalog(0U);
    expect_true(loaded.success, "adapter should load the builder catalog");
    expect_true(loaded.value->skeleton_options.size() >= 6U, "adapter should expose supported skeleton options");
    expect_true(loaded.value->will_create_disabled, "adapter should surface disabled-by-default create note");
  }

  {
    auto draft = make_pump_builder_draft();
    const auto preview = context.web_adapter.preview_draft(draft, 0U);
    expect_true(preview.value->preview_states.size() == 7U, "adapter preview should keep the generated state list");
    expect_true(!preview.value->warnings.empty(), "adapter preview should preserve required review warnings");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.parameters.erase("min_run_time_ms");
    const auto preview = context.web_adapter.preview_draft(draft, 0U);
    expect_true(!preview.success, "adapter should preserve invalid preview status");
    expect_true(!preview.value->issues.empty(), "adapter should preserve validation issues for the UI");
  }

  {
    auto draft = make_pump_builder_draft();
    const auto created = context.web_adapter.create_program(draft, make_command_context(1U, "builder_ui", "create from adapter"));
    expect_true(created.accepted, "adapter create should succeed for valid draft");
    expect_true(created.created_program.has_value(), "adapter create should map created program summary");
    expect_true(created.value.has_value() && created.value->will_create_disabled, "adapter create should keep the disabled create note");
  }

  if (failures != 0) {
    std::cerr << "test_web_program_builder_adapter failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_program_builder_adapter passed\n";
  return 0;
}
