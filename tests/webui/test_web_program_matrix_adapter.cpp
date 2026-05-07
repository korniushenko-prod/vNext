#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramMatrixApiTestContext context;
  expect_true(context.initialize(), "web program matrix adapter context should initialize");

  auto program = make_program("matrix.demo", "Matrix Demo", controller::sequence::SequenceProgramType::burner);
  program.states[0].active_actions.push_back(relay_action("dup_1", "relay.main", controller::hal::RelayState::on));
  program.states[0].active_actions.push_back(relay_action("dup_2", "relay.main", controller::hal::RelayState::on));
  expect_true(context.sequence.sequence_service.register_program(program).ok(), "adapter matrix program should register");
  expect_true(context.sequence.sequence_service.start_program(program.id, 1U, "matrix_adapter", "activate").ok(), "adapter matrix program should start");

  const auto loaded = context.web_adapter.load_program_matrix(program.id, 2U);
  expect_true(loaded.value.has_value(), "adapter should always return a view model");
  expect_true(loaded.success, "adapter should load program matrix successfully");
  if (loaded.value.has_value()) {
    expect_true(loaded.value->has_matrix, "adapter view model should include matrix rows");
    expect_true(loaded.value->has_warnings, "adapter should preserve matrix warnings");
    expect_true(!loaded.value->rows.empty() && loaded.value->rows.front().currently_active, "active row highlight should be preserved");
    expect_true(loaded.value->selected_state.has_value(), "adapter should map a selected state detail");
    if (loaded.value->selected_state.has_value()) {
      expect_true(
          loaded.value->selected_state->state_id == "start",
          "selected state detail should follow current active state by default");
    }
  }

  if (failures != 0) {
    std::cerr << "test_web_program_matrix_adapter failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_program_matrix_adapter passed\n";
  return 0;
}
