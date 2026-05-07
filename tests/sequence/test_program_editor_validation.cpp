#include <iostream>

#include "sequence_test_support.hpp"

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

controller::conditions::ConditionTree invalid_condition_tree() {
  return controller::conditions::ConditionTree{"invalid_tree", "missing_root", {}};
}

}  // namespace

int main() {
  using namespace sequence_test;

  SequenceTestContext context;
  expect_true(context.initialize(), "program editor validation context should initialize");

  auto program = make_basic_program();
  program.description = std::string{"Validation target"};
  expect_true(context.sequence_service.register_program(program).ok(), "validation target program should register");

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.program_id = "pump.changed";
    const auto validation = context.sequence_service.validate_program_editor_draft(draft, true);
    expect_true(!validation.ok(), "program_id change should be rejected");
    expect_true(has_issue_code(validation.issues, "PROGRAM_EDITOR_INVALID_ID_CHANGE"), "immutable id issue should be reported");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.states.push_back(draft.states.front());
    const auto validation = context.sequence_service.validate_program_editor_draft(draft, true);
    expect_true(has_issue_code(validation.issues, "PROGRAM_EDITOR_DUPLICATE_STATE_ID"), "duplicate state ids should be rejected");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.states.front().transitions.front().target_state_id = "missing_state";
    const auto validation = context.sequence_service.validate_program_editor_draft(draft, true);
    expect_true(has_issue_code(validation.issues, "PROGRAM_EDITOR_INVALID_TRANSITION_TARGET"), "invalid transition target should be rejected");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.states.front().entry_actions.push_back(relay_action("bad_entry", "relay.main", controller::hal::RelayState::on));
    const auto validation = context.sequence_service.validate_program_editor_draft(draft, true);
    expect_true(has_issue_code(validation.issues, "PROGRAM_EDITOR_INVALID_ACTION_PLACEMENT"), "invalid action placement should be rejected");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.start_condition = invalid_condition_tree();
    const auto validation = context.sequence_service.validate_program_editor_draft(draft, true);
    expect_true(has_issue_code(validation.issues, "PROGRAM_EDITOR_INVALID_CONDITION"), "invalid condition should be rejected");
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.trip_state_id = "missing_trip";
    const auto validation = context.sequence_service.validate_program_editor_draft(draft, true);
    expect_true(has_issue_code(validation.issues, "PROGRAM_EDITOR_MISSING_SPECIAL_STATE"), "missing special state should be rejected");
  }

  if (failures != 0) {
    std::cerr << "test_program_editor_validation failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_editor_validation passed\n";
  return 0;
}
