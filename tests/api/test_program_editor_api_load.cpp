#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramEditorApiTestContext context;
  expect_true(context.initialize(), "program editor API load context should initialize");

  auto inactive = make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump);
  inactive.description = std::string{"Inactive editor target"};
  auto active = make_program("burner.demo", "Burner Demo", controller::sequence::SequenceProgramType::burner);
  active.description = std::string{"Active editor target"};
  expect_true(context.sequence.sequence_service.register_program(inactive).ok(), "inactive program should register");
  expect_true(context.sequence.sequence_service.register_program(active).ok(), "active program should register");
  expect_true(context.sequence.sequence_service.start_program(active.id, 5U, "api_test", "activate").ok(), "active program should start");

  {
    const auto listed = context.api_service.list_programs(10U);
    expect_true(listed.ok(), "list_programs should succeed");
    expect_true(listed.value->size() == 2U, "list_programs should return both programs");
  }

  {
    const auto loaded = context.api_service.load_program_editor(inactive.id, 10U);
    expect_true(loaded.ok(), "load_program_editor should succeed for inactive program");
    if (loaded.value.has_value()) {
      expect_true(loaded.value->draft.program_id == inactive.id, "loaded draft should keep program id");
      expect_true(!loaded.value->runtime_status.active, "inactive program should report inactive runtime status");
      expect_true(!loaded.value->baseline_preview.ordered_state_summaries.empty(), "load should include baseline preview data");
    }
  }

  {
    const auto loaded = context.api_service.load_program_editor(active.id, 10U);
    expect_true(loaded.ok(), "load_program_editor should succeed for active program");
    if (loaded.value.has_value()) {
      expect_true(loaded.value->runtime_status.active, "active program should report active runtime");
      expect_true(!loaded.value->runtime_editable, "active program should be read-only for editing");
    }
  }

  {
    const auto catalog = context.api_service.get_editor_catalog(10U);
    expect_true(catalog.ok(), "catalog should load");
    expect_true(!catalog.value->signals.empty(), "catalog should expose signals");
    expect_true(catalog.value->signals.front().path <= catalog.value->signals.back().path, "catalog signals should be deterministic");
    expect_true(!catalog.value->writable_virtual_signals.empty(), "catalog should expose writable virtual signals");
  }

  if (failures != 0) {
    std::cerr << "test_program_editor_api_load failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_editor_api_load passed\n";
  return 0;
}
