#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramEditorApiTestContext context;
  expect_true(context.initialize(), "web program editor adapter context should initialize");

  auto inactive = make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump);
  inactive.description = std::string{"Adapter target"};
  auto active = make_program("burner.demo", "Burner Demo", controller::sequence::SequenceProgramType::burner);
  expect_true(context.sequence.sequence_service.register_program(inactive).ok(), "inactive adapter target should register");
  expect_true(context.sequence.sequence_service.register_program(active).ok(), "active adapter target should register");
  expect_true(context.sequence.sequence_service.start_program(active.id, 1U, "adapter", "activate").ok(), "active adapter target should start");

  {
    const auto loaded = context.web_adapter.load_program_editor(inactive.id, 5U);
    expect_true(loaded.success, "adapter should load editor view model");
    if (loaded.value.has_value()) {
      expect_true(!loaded.value->program_list.empty(), "adapter should keep program list");
      expect_true(loaded.value->metadata.program_id == inactive.id, "adapter metadata should keep program id");
    }
  }

  {
    const auto loaded = context.web_adapter.load_program_editor(active.id, 5U);
    expect_true(loaded.success, "adapter should load active program");
    if (loaded.value.has_value()) {
      expect_true(loaded.value->runtime_status.active, "runtime read-only flag should be preserved");
      expect_true(!loaded.value->command_bar.can_save, "active program should disable save");
      expect_true(!loaded.value->command_bar.read_only_banner.empty(), "active banner should be represented");
    }
  }

  {
    auto draft = controller::sequence::make_program_editor_draft(inactive);
    draft.states.push_back(draft.states.front());
    const auto preview = context.web_adapter.preview_program_edit(draft, 5U);
    expect_true(!preview.success, "adapter should preserve invalid preview status");
    expect_true(!preview.value->issues.empty(), "adapter should preserve validation issues");
  }

  {
    const auto loaded = context.web_adapter.load_program_editor(inactive.id, 5U);
    if (loaded.value.has_value()) {
      expect_true(!loaded.value->states.empty() && loaded.value->states.front().id == "start", "state ordering should be preserved");
      expect_true(loaded.value->selected_state.has_value(), "selected state should be present");
      expect_true(!loaded.value->selected_state->transitions.empty() && loaded.value->selected_state->transitions.front().id == "to_run", "transition ordering should be preserved");
    }
  }

  if (failures != 0) {
    std::cerr << "test_web_program_editor_adapter failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_program_editor_adapter passed\n";
  return 0;
}
