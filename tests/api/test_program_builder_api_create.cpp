#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "program builder API create context should initialize");

  {
    auto draft = make_pump_builder_draft();
    const auto created = context.api_service.create_program_from_draft(draft, make_command_context(1U, "builder_ui", "create draft"));
    expect_true(created.accepted, "valid draft should create successfully");
    expect_true(created.created_program.has_value(), "create should return created program summary");
    expect_true(created.created_program->created_disabled, "created program should be disabled by default");
    const auto program = context.sequence.sequence_service.get_program(draft.program_id);
    expect_true(program.ok(), "created program should exist in SequenceService");
    expect_true(!program.value->enabled, "registered program should stay disabled");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.program_id = "builder.invalid";
    draft.parameters.erase("min_run_time_ms");
    const auto created = context.api_service.create_program_from_draft(draft, make_command_context(2U, "builder_ui", "create invalid"));
    expect_true(!created.accepted, "invalid draft should not create");
    expect_true(!context.sequence.sequence_service.has_program("builder.invalid"), "invalid draft should not register");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.program_id = "builder.duplicate";
    expect_true(context.api_service.create_program_from_draft(draft, make_command_context(3U, "builder_ui", "first create")).accepted, "seed duplicate id");
    const auto duplicate = context.api_service.create_program_from_draft(draft, make_command_context(4U, "builder_ui", "duplicate create"));
    expect_true(!duplicate.accepted, "duplicate id should be rejected");
    expect_true(duplicate.status.code == controller::api::ProgramBuilderUiResultCode::builder_ui_duplicate_id, "duplicate id should map to stable API error code");
  }

  if (failures != 0) {
    std::cerr << "test_program_builder_api_create failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_builder_api_create passed\n";
  return 0;
}
