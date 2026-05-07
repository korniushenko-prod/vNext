#include <iostream>

#include "api_test_support.hpp"

namespace {

bool has_issue_code(
    const std::vector<controller::sequence::ProgramEditorValidationIssue>& issues,
    const std::string& code) {
  for (const auto& issue : issues) {
    if (issue.code == code) {
      return true;
    }
  }
  return false;
}

}  // namespace

int main() {
  using namespace api_test;

  ProgramEditorApiTestContext context;
  expect_true(context.initialize(), "program editor API errors context should initialize");

  auto program = make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump);
  expect_true(context.sequence.sequence_service.register_program(program).ok(), "error target should register");

  {
    const auto loaded = context.api_service.load_program_editor("missing.program", 0U);
    expect_true(!loaded.ok(), "unknown program should be rejected");
    expect_true(loaded.status.code == controller::api::ProgramEditorUiResultCode::program_editor_program_not_found, "unknown program should map to not found");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    const auto invalid_context = context.api_service.save_program_edit(program.id, draft, make_command_context(1U, "", "missing source"));
    expect_true(!invalid_context.accepted, "invalid context should be rejected");
    expect_true(invalid_context.status.code == controller::api::ProgramEditorUiResultCode::program_editor_invalid_argument, "invalid context should map to invalid argument");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.states.push_back(draft.states.front());
    const auto invalid = context.api_service.save_program_edit(program.id, draft, make_command_context(2U, "editor_api", "invalid save"));
    expect_true(!invalid.accepted, "validation failure should block save");
    expect_true(invalid.status.code == controller::api::ProgramEditorUiResultCode::program_editor_validation_failed, "validation failure should surface");
    expect_true(has_issue_code(invalid.status.validation_issues, "PROGRAM_EDITOR_DUPLICATE_STATE_ID"), "duplicate state issue should be preserved");
  }

  {
    ProgramEditorApiTestContext active_context;
    expect_true(active_context.initialize(), "active error context should initialize");
    auto active = make_program("burner.demo", "Burner Demo", controller::sequence::SequenceProgramType::burner);
    expect_true(active_context.sequence.sequence_service.register_program(active).ok(), "active error target should register");
    expect_true(active_context.sequence.sequence_service.start_program(active.id, 3U, "editor_api", "activate").ok(), "program should start");

    auto draft = controller::sequence::make_program_editor_draft(active);
    const auto save_denied = active_context.api_service.save_program_edit(active.id, draft, make_command_context(4U, "editor_api", "save active"));
    expect_true(!save_denied.accepted, "active save should be denied");
    expect_true(save_denied.status.code == controller::api::ProgramEditorUiResultCode::program_editor_save_denied, "active save should surface save denied");

    const auto delete_denied = active_context.api_service.delete_program(active.id, make_command_context(5U, "editor_api", "delete active"));
    expect_true(!delete_denied.accepted, "active delete should be denied");
    expect_true(delete_denied.status.code == controller::api::ProgramEditorUiResultCode::program_editor_delete_denied, "active delete should surface delete denied");
  }

  if (failures != 0) {
    std::cerr << "test_program_editor_api_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_editor_api_errors passed\n";
  return 0;
}
