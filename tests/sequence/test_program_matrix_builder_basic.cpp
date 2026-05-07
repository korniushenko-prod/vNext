#include <iostream>
#include <vector>

#include "sequence/program_matrix_builder.hpp"
#include "sequence_test_support.hpp"

namespace {

std::vector<controller::sequence::ProgramMatrixActuatorMetadata> make_metadata() {
  return {
      {"relay.main", "Main Relay", controller::actuators::ActuatorTargetKind::relay, controller::actuators::ActuatorRole::generic, true},
      {"relay.trip", "Trip Relay", controller::actuators::ActuatorTargetKind::relay, controller::actuators::ActuatorRole::fuel, true},
      {"pwm.main", "Main PWM", controller::actuators::ActuatorTargetKind::pwm, controller::actuators::ActuatorRole::generic, true},
  };
}

}  // namespace

int main() {
  using namespace sequence_test;

  controller::sequence::ProgramMatrixBuilder builder;
  auto program = make_basic_program();
  program.states[0].active_actions.push_back(relay_action("start_trip_off", "relay.trip", controller::hal::RelayState::off));
  program.states[1].active_actions.push_back(pwm_action("run_pwm", "pwm.main", 45.0, true));

  const auto matrix = builder.build(program, make_metadata());
  expect_true(matrix.ok(), "basic matrix should build");
  if (matrix.ok()) {
    expect_true(matrix.value->state_rows.size() == program.states.size(), "state row count should match descriptor");
    expect_true(matrix.value->state_rows[0].state_id == "start", "state order should stay deterministic");
    expect_true(matrix.value->state_rows[1].state_id == "run", "second state should preserve descriptor order");
    expect_true(matrix.value->actuator_columns.size() == 3U, "all persistent actuator targets should become columns");
    expect_true(matrix.value->actuator_columns[0].actuator_id == "relay.trip", "first seen actuator should be first column");
    expect_true(matrix.value->actuator_columns[1].actuator_id == "relay.main", "second seen actuator should preserve order");
    expect_true(matrix.value->actuator_columns[2].actuator_id == "pwm.main", "later seen pwm actuator should preserve order");
    expect_true(matrix.value->special_states.initial_state_id == "start", "initial special state summary should be coherent");
    expect_true(matrix.value->special_states.normal_stop_state_id == "stop", "normal stop state summary should be coherent");
    expect_true(matrix.value->special_states.trip_state_id == "trip", "trip state summary should be coherent");
    expect_true(matrix.value->special_states.lockout_state_id == "lockout", "lockout state summary should be coherent");
    expect_true(matrix.value->special_states.all_present, "all special states should be marked as present");
    expect_true(matrix.value->issues.empty(), "basic program should not emit warnings");
  }

  if (failures != 0) {
    std::cerr << "test_program_matrix_builder_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_matrix_builder_basic passed\n";
  return 0;
}
