#include <iostream>
#include <string>
#include <vector>

#include "sequence/program_matrix_builder.hpp"
#include "sequence_test_support.hpp"

namespace {

std::vector<controller::sequence::ProgramMatrixActuatorMetadata> make_metadata() {
  return {
      {"relay.main", "Main Relay", controller::actuators::ActuatorTargetKind::relay, controller::actuators::ActuatorRole::generic, true},
      {"relay.fuel", "Fuel Relay", controller::actuators::ActuatorTargetKind::relay, controller::actuators::ActuatorRole::fuel, true},
      {"pwm.main", "Main PWM", controller::actuators::ActuatorTargetKind::pwm, controller::actuators::ActuatorRole::generic, true},
  };
}

bool has_issue(const controller::sequence::ProgramMatrix& matrix, const std::string& code) {
  for (const auto& issue : matrix.issues) {
    if (issue.code == code) {
      return true;
    }
  }
  return false;
}

}  // namespace

int main() {
  using namespace sequence_test;

  auto program = make_basic_program();
  program.states[0].active_actions.push_back(relay_action("dup_1", "relay.main", controller::hal::RelayState::on));
  program.states[0].active_actions.push_back(relay_action("dup_2", "relay.main", controller::hal::RelayState::on));
  program.states[1].active_actions.push_back(pwm_action("pwm_a", "pwm.main", 20.0, true));
  program.states[1].active_actions.push_back(pwm_action("pwm_b", "pwm.main", 60.0, true));
  program.states[2].transitions.clear();
  program.states[2].active_actions.clear();
  program.states[3].active_actions.push_back(relay_action("trip_fuel_on", "relay.fuel", controller::hal::RelayState::on));
  program.states[4].active_actions.push_back(relay_action("lockout_fuel_on", "relay.fuel", controller::hal::RelayState::on));
  program.states[1].active_actions.push_back(relay_action("unknown_target", "relay.missing", controller::hal::RelayState::off));

  controller::sequence::ProgramMatrixBuilder builder;
  const auto matrix = builder.build(program, make_metadata());
  expect_true(matrix.ok(), "warning matrix should still build");

  if (matrix.ok()) {
    expect_true(has_issue(*matrix.value, "MATRIX_DUPLICATE_ACTUATOR_ACTION"), "duplicate actuator actions should warn");
    expect_true(has_issue(*matrix.value, "MATRIX_CONFLICTING_ACTUATOR_ACTION"), "conflicting actuator actions should warn");
    expect_true(has_issue(*matrix.value, "MATRIX_UNKNOWN_ACTUATOR_TARGET"), "unknown actuator target should warn");
    expect_true(has_issue(*matrix.value, "MATRIX_UNSAFE_TRIP_OUTPUT"), "unsafe trip output should warn");
    expect_true(has_issue(*matrix.value, "MATRIX_UNSAFE_LOCKOUT_OUTPUT"), "unsafe lockout output should warn");
  }

  if (failures != 0) {
    std::cerr << "test_program_matrix_builder_warnings failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_matrix_builder_warnings passed\n";
  return 0;
}
