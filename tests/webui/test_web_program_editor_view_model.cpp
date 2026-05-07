#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramEditorApiTestContext context;
  expect_true(context.initialize(), "web program editor view model context should initialize");

  auto active = make_program("burner.demo", "Burner Demo", controller::sequence::SequenceProgramType::burner);
  active.description = std::string{"View model target"};
  expect_true(context.sequence.sequence_service.register_program(active).ok(), "view model target should register");
  expect_true(context.sequence.sequence_service.start_program(active.id, 2U, "view_model", "activate").ok(), "view model target should start");

  controller::api::ProgramEditorSourceData source;
  source.program_list = *context.api_service.list_programs(3U).value;
  source.catalog = *context.api_service.get_editor_catalog(3U).value;
  source.editor = *context.api_service.load_program_editor(active.id, 3U).value;
  source.preview = source.editor.baseline_preview;

  const auto view_model = controller::api::WebProgramEditorAdapter::build_view_model(source);
  expect_true(view_model.metadata.program_id == active.id, "metadata panel should be coherent");
  expect_true(!view_model.states.empty(), "states list should be coherent");
  expect_true(view_model.selected_state.has_value(), "selected state detail should be present");
  if (view_model.selected_state.has_value()) {
    expect_true(!view_model.selected_state->transitions.empty(), "transition editor should be coherent");
  }
  expect_true(!view_model.command_bar.can_save && !view_model.command_bar.can_delete, "command flags should reflect read-only active policy");
  expect_true(view_model.runtime_status.active, "runtime panel should represent active program");
  expect_true(!view_model.command_bar.read_only_banner.empty(), "active-program banner should be represented");

  if (failures != 0) {
    std::cerr << "test_web_program_editor_view_model failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_program_editor_view_model passed\n";
  return 0;
}
