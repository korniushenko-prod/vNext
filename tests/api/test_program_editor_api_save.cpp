#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  {
    ProgramEditorApiTestContext context;
    expect_true(context.initialize(), "save context should initialize");
    auto program = make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump);
    program.description = std::string{"Save target"};
    expect_true(context.sequence.sequence_service.register_program(program).ok(), "save target should register");

    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.name = "Pump 1 Edited";
    const auto saved = context.api_service.save_program_edit(program.id, draft, make_command_context(10U, "editor_api", "save"));
    expect_true(saved.accepted, "valid inactive edit should save");
    const auto loaded = context.sequence.sequence_service.get_program(program.id);
    expect_true(loaded.ok() && loaded.value->name == "Pump 1 Edited", "saved edit should persist descriptor");
  }

  {
    ProgramEditorApiTestContext context;
    expect_true(context.initialize(), "active save context should initialize");
    auto program = make_program("burner.demo", "Burner Demo", controller::sequence::SequenceProgramType::burner);
    expect_true(context.sequence.sequence_service.register_program(program).ok(), "active save target should register");
    expect_true(context.sequence.sequence_service.start_program(program.id, 11U, "editor_api", "activate").ok(), "program should start");

    auto draft = controller::sequence::make_program_editor_draft(program);
    draft.name = "Burner Edited";
    const auto saved = context.api_service.save_program_edit(program.id, draft, make_command_context(12U, "editor_api", "save active"));
    expect_true(!saved.accepted, "active program save should be denied");
    expect_true(saved.status.code == controller::api::ProgramEditorUiResultCode::program_editor_save_denied, "active save should map to save denied");
  }

  {
    ProgramEditorApiTestContext context;
    expect_true(context.initialize(), "enable disable context should initialize");
    auto program = make_program("pump.disabled", "Pump Disabled", controller::sequence::SequenceProgramType::pump);
    program.enabled = false;
    expect_true(context.sequence.sequence_service.register_program(program).ok(), "disabled program should register");

    const auto enabled = context.api_service.set_program_enabled(program.id, true, make_command_context(13U, "editor_api", "enable"));
    expect_true(enabled.accepted, "enable should succeed for inactive program");
    const auto disabled = context.api_service.set_program_enabled(program.id, false, make_command_context(14U, "editor_api", "disable"));
    expect_true(disabled.accepted, "disable should succeed for inactive program");
  }

  {
    ProgramEditorApiTestContext context;
    expect_true(context.initialize(), "delete context should initialize");
    auto program = make_program("pump.delete", "Pump Delete", controller::sequence::SequenceProgramType::pump);
    expect_true(context.sequence.sequence_service.register_program(program).ok(), "delete target should register");
    const auto deleted = context.api_service.delete_program(program.id, make_command_context(15U, "editor_api", "delete"));
    expect_true(deleted.accepted, "delete should succeed for inactive program");
    expect_true(!context.sequence.sequence_service.has_program(program.id), "deleted program should be removed");
  }

  if (failures != 0) {
    std::cerr << "test_program_editor_api_save failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_editor_api_save passed\n";
  return 0;
}
