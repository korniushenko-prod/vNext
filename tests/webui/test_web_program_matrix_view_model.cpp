#include <iostream>

#include "api_test_support.hpp"

namespace {

const controller::api::ProgramMatrixCellViewModel* find_cell(
    const controller::api::ProgramMatrixRowViewModel& row,
    const std::string& actuator_id) {
  for (const auto& cell : row.cells) {
    if (cell.actuator_id == actuator_id) {
      return &cell;
    }
  }
  return nullptr;
}

}

int main() {
  using namespace api_test;

  ProgramMatrixApiTestContext context;
  expect_true(context.initialize(), "web program matrix view model context should initialize");

  auto program = make_program("matrix.vm", "Matrix VM", controller::sequence::SequenceProgramType::burner);
  program.states[0].active_actions.push_back(relay_action("start_off", "relay.trip", controller::hal::RelayState::off));
  program.states[1].active_actions.push_back(relay_action("run_on", "relay.main", controller::hal::RelayState::on));
  program.states[1].active_actions.push_back(pwm_action("run_pwm", "pwm.main", 33.0, true));
  expect_true(context.sequence.sequence_service.register_program(program).ok(), "view model matrix program should register");
  expect_true(context.sequence.sequence_service.start_program(program.id, 5U, "matrix_view", "activate").ok(), "view model matrix program should start");

  controller::api::ProgramMatrixSourceData source;
  source.program_list = *context.api_service.list_programs(6U).value;
  source.payload = *context.api_service.get_program_matrix(program.id, 6U).value;
  source.status = controller::api::ProgramMatrixUiStatus::success("view model");

  const auto view_model = controller::api::WebProgramMatrixAdapter::build_view_model(source);
  expect_true(view_model.has_matrix, "view model should expose matrix data");
  expect_true(!view_model.columns.empty(), "view model should expose actuator columns");
  expect_true(!view_model.rows.empty(), "view model should expose state rows");
  expect_true(view_model.legend.size() >= 4U, "legend should be coherent");
  expect_true(view_model.runtime_summary.active, "runtime summary should report an active program");
  expect_true(view_model.runtime_summary.current_state == "start", "runtime summary should preserve current state");

  if (view_model.rows.size() >= 2U) {
    const auto& start_row = view_model.rows[0];
    const auto& run_row = view_model.rows[1];
    const auto* start_trip = find_cell(start_row, "relay.trip");
    const auto* run_main = find_cell(run_row, "relay.main");
    const auto* run_pwm = find_cell(run_row, "pwm.main");
    expect_true(!start_row.badges.empty() && start_row.badges.front() == "initial", "special state badges should include initial");
    expect_true(start_trip != nullptr && start_trip->explicit_off, "explicit OFF should stay distinct from blank");
    expect_true(run_row.cells.size() >= 2U, "run row should expose relay and pwm cells");
    expect_true(run_main != nullptr && run_main->label == "ON", "explicit ON cell should stay visible");
    expect_true(run_pwm != nullptr && run_pwm->label.find("PWM") != std::string::npos, "PWM cell should stay visible");
  }

  if (view_model.selected_state.has_value()) {
    expect_true(
        !view_model.selected_state->active_actions.empty() || !view_model.selected_state->entry_actions.empty(),
        "selected state detail should remain coherent");
  }

  if (failures != 0) {
    std::cerr << "test_web_program_matrix_view_model failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_program_matrix_view_model passed\n";
  return 0;
}
