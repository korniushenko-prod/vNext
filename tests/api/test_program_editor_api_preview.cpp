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
  expect_true(context.initialize(), "program editor API preview context should initialize");

  auto program = make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump);
  program.description = std::string{"Preview target"};
  expect_true(context.sequence.sequence_service.register_program(program).ok(), "preview target should register");

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    const auto preview = context.api_service.preview_program_edit(draft, 0U);
    expect_true(preview.ok(), "valid editor draft should preview successfully");
    if (preview.value.has_value()) {
      expect_true(!preview.value->ordered_state_summaries.empty(), "preview should include ordered state summaries");
    }
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.states.push_back(draft.states.front());
    const auto preview = context.api_service.preview_program_edit(draft, 0U);
    expect_true(!preview.ok(), "invalid preview should fail");
    expect_true(has_issue_code(preview.status.validation_issues, "PROGRAM_EDITOR_DUPLICATE_STATE_ID"), "preview should preserve validation issues");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.trip_state_id = "missing_trip";
    const auto preview = context.api_service.preview_program_edit(draft, 0U);
    expect_true(preview.value.has_value() && !preview.value->save_allowed, "invalid preview should disable save");
  }

  if (failures != 0) {
    std::cerr << "test_program_editor_api_preview failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_editor_api_preview passed\n";
  return 0;
}
