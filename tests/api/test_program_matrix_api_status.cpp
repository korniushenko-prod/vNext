#include <iostream>

#include "api_test_support.hpp"

namespace {

const controller::sequence::ProgramMatrixStateRow* find_row(
    const controller::sequence::ProgramMatrix& matrix,
    const std::string& state_id) {
  for (const auto& row : matrix.state_rows) {
    if (row.state_id == state_id) {
      return &row;
    }
  }
  return nullptr;
}

}  // namespace

int main() {
  using namespace api_test;

  {
    ProgramMatrixApiTestContext context;
    expect_true(context.initialize(), "program matrix status context should initialize");

    auto active = make_program("burner.demo", "Burner Demo", controller::sequence::SequenceProgramType::burner);
    active.states[0].active_actions.push_back(relay_action("dup_1", "relay.main", controller::hal::RelayState::on));
    active.states[0].active_actions.push_back(relay_action("dup_2", "relay.main", controller::hal::RelayState::on));
    expect_true(context.sequence.sequence_service.register_program(active).ok(), "active matrix program should register");
    expect_true(context.sequence.sequence_service.start_program(active.id, 2U, "matrix_api", "activate").ok(), "active matrix program should start");

    const auto loaded = context.api_service.get_program_matrix(active.id, 3U);
    expect_true(loaded.ok(), "program matrix detail should load");
    if (loaded.ok()) {
      expect_true(loaded.value->matrix.has_value(), "matrix detail should contain a matrix");
      expect_true(loaded.value->runtime_summary.selected_program_active, "runtime summary should mark selected program active");
      expect_true(loaded.value->runtime_summary.current_state_id.value_or("") == "start", "runtime summary should keep current state");
      expect_true(!loaded.value->matrix->issues.empty(), "matrix detail should surface warnings");
      const auto* active_row = find_row(*loaded.value->matrix, "start");
      expect_true(active_row != nullptr && active_row->currently_active, "current state row should be highlighted");
    }
  }

  {
    ProgramMatrixApiTestContext context;
    expect_true(context.initialize(), "no-active matrix status context should initialize");

    const auto loaded = context.api_service.get_active_program_matrix(0U);
    expect_true(!loaded.status.ok(), "no-active matrix should use a structured non-ok status");
    expect_true(
        loaded.status.code == controller::api::ProgramMatrixUiResultCode::matrix_ui_no_active_program,
        "no-active matrix should surface MATRIX_UI_NO_ACTIVE_PROGRAM");
    expect_true(loaded.value.has_value() && !loaded.value->matrix.has_value(), "no-active payload should not contain a matrix");
  }

  if (failures != 0) {
    std::cerr << "test_program_matrix_api_status failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_matrix_api_status passed\n";
  return 0;
}
