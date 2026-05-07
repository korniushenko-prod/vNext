#include <iostream>

#include "sequence/program_skeleton_builder.hpp"
#include "sequence_test_support.hpp"

int main() {
  using namespace sequence_test;

  SequenceTestContext context;
  expect_true(context.initialize(), "sequence builder basic context should initialize");

  controller::sequence::ProgramSkeletonBuilder builder(
      context.registry,
      context.actuator_manager,
      context.timer_service,
      context.alarm_service,
      context.sequence_service);

  auto draft = builder.create_empty_draft(controller::sequence::ProgramSkeletonKind::custom_blank);
  draft.program_id = "builder.custom_blank_1";
  draft.program_name = "Builder Custom Blank";
  const auto generated = builder.build_program(draft);
  expect_true(generated.ok(), "custom_blank should generate successfully");
  expect_true(generated.value->states.size() == 6U, "custom_blank should create the minimal six-state skeleton");
  expect_true(generated.value->states.front().id == "OFF", "custom_blank should start with OFF");
  expect_true(generated.value->states[1].id == "READY", "custom_blank should keep deterministic ordering");
  expect_true(generated.value->states[2].id == "RUN", "custom_blank should keep RUN in the preview path");
  expect_true(generated.value->initial_state_id == "OFF", "custom_blank should expose initial_state_id");
  expect_true(generated.value->normal_stop_state_id == "NORMAL_STOP", "custom_blank should expose normal_stop_state_id");
  expect_true(generated.value->trip_state_id == "TRIP_STOP", "custom_blank should expose trip_state_id");
  expect_true(generated.value->lockout_state_id == "LOCKOUT", "custom_blank should expose lockout_state_id");
  expect_true(!generated.value->enabled, "generated skeletons must be disabled by default");

  if (failures != 0) {
    std::cerr << "test_program_skeleton_builder_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_skeleton_builder_basic passed\n";
  return 0;
}
