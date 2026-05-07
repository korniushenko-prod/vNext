#include <iostream>
#include <optional>
#include <string>
#include <vector>

#include "sequence/program_matrix_builder.hpp"
#include "sequence_test_support.hpp"

namespace {

std::vector<controller::sequence::ProgramMatrixActuatorMetadata> make_metadata() {
  return {
      {"relay.main", "Main Relay", controller::actuators::ActuatorTargetKind::relay, controller::actuators::ActuatorRole::generic, true},
      {"relay.fan", "Fan Relay", controller::actuators::ActuatorTargetKind::relay, controller::actuators::ActuatorRole::fan, true},
      {"pwm.main", "Main PWM", controller::actuators::ActuatorTargetKind::pwm, controller::actuators::ActuatorRole::generic, true},
  };
}

const controller::sequence::ProgramMatrixCell* find_cell(
    const controller::sequence::ProgramMatrix& matrix,
    const std::string& state_id,
    const std::string& actuator_id) {
  for (const auto& cell : matrix.matrix_cells) {
    if (cell.state_id == state_id && cell.actuator_id == actuator_id) {
      return &cell;
    }
  }
  return nullptr;
}

const controller::sequence::ProgramMatrixStateDetailSummary* find_detail(
    const controller::sequence::ProgramMatrix& matrix,
    const std::string& state_id) {
  for (const auto& detail : matrix.state_details) {
    if (detail.state_id == state_id) {
      return &detail;
    }
  }
  return nullptr;
}

}  // namespace

int main() {
  using namespace sequence_test;

  auto program = make_basic_program();
  program.states[0].entry_actions.push_back(timer_start_action("start_timer", "timer.sequence"));
  program.states[0].exit_actions.push_back(timer_stop_action("stop_timer", "timer.sequence_exit"));
  program.states[1].active_actions.push_back(relay_action("run_fan_off", "relay.fan", controller::hal::RelayState::off));
  program.states[1].active_actions.push_back(pwm_action("run_pwm", "pwm.main", 45.0, true));

  controller::sequence::ProgramMatrixBuilder builder;
  const auto matrix = builder.build(program, make_metadata());
  expect_true(matrix.ok(), "cell matrix should build");

  if (matrix.ok()) {
    const auto* run_main = find_cell(*matrix.value, "run", "relay.main");
    const auto* run_fan = find_cell(*matrix.value, "run", "relay.fan");
    const auto* run_pwm = find_cell(*matrix.value, "run", "pwm.main");
    const auto* start_main = find_cell(*matrix.value, "start", "relay.main");

    expect_true(run_main != nullptr && run_main->cell_type == controller::sequence::ProgramMatrixCellType::relay_on, "relay ON cell should map correctly");
    expect_true(run_main != nullptr && run_main->label == "ON", "relay ON cell label should be stable");
    expect_true(run_fan != nullptr && run_fan->cell_type == controller::sequence::ProgramMatrixCellType::relay_off, "relay OFF cell should map correctly");
    expect_true(run_fan != nullptr && run_fan->label == "OFF", "relay OFF cell label should be stable");
    expect_true(run_pwm != nullptr && run_pwm->cell_type == controller::sequence::ProgramMatrixCellType::pwm_enabled, "PWM enabled cell should map correctly");
    expect_true(run_pwm != nullptr && run_pwm->value.has_value() && *run_pwm->value == 45.0, "PWM duty should be preserved");
    expect_true(start_main != nullptr && start_main->cell_type == controller::sequence::ProgramMatrixCellType::none, "blank cell should represent no persistent action");

    const auto* start_detail = find_detail(*matrix.value, "start");
    expect_true(start_detail != nullptr, "state detail should exist");
    if (start_detail != nullptr) {
      expect_true(start_detail->entry_actions.size() == 1U, "entry action should appear in detail summary");
      expect_true(start_detail->exit_actions.size() == 1U, "exit action should appear in detail summary");
      expect_true(start_detail->active_actions.empty(), "non-persistent entry/exit actions should not become matrix cells");
    }
  }

  if (failures != 0) {
    std::cerr << "test_program_matrix_builder_cells failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_matrix_builder_cells passed\n";
  return 0;
}
