#include <iostream>

#include "api_test_support.hpp"
#include "sequence/program_skeleton_builder.hpp"

int main() {
  using namespace api_test;
  using namespace sequence_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "sequence builder generation context should initialize");

  controller::sequence::ProgramSkeletonBuilder builder(
      context.sequence.registry,
      context.sequence.actuator_manager,
      context.sequence.timer_service,
      context.sequence.alarm_service,
      context.sequence.sequence_service);

  {
    auto draft = make_pump_builder_draft();
    const auto generated = builder.build_program(draft);
    expect_true(generated.ok(), "pump_basic should generate successfully");
    expect_true(generated.value->states.size() == 7U, "pump_basic should create the expected state count");
    expect_true(generated.value->states[3].id == "RUN", "pump_basic should include RUN in deterministic position");
    expect_true(!generated.value->enabled, "pump_basic should stay disabled by default");
  }

  {
    controller::sequence::ProgramBuilderDraft draft;
    draft.skeleton_kind = controller::sequence::ProgramSkeletonKind::burner_supervisory_skeleton;
    draft.program_type = controller::sequence::SequenceProgramType::burner;
    draft.program_id = "builder.burner_1";
    draft.program_name = "Builder Burner";
    draft.actuator_bindings["fan_output"] = "relay.fan";
    draft.actuator_bindings["ignition_output"] = "relay.ignition";
    draft.actuator_bindings["fuel_output"] = "relay.fuel";
    draft.signal_bindings["flame_signal"] = "signal.flame";
    draft.signal_bindings["air_ok_signal"] = "signal.air_ok";
    draft.parameters["prepurge_ms"] = std::int64_t{1000};
    draft.parameters["ignition_timeout_ms"] = std::int64_t{1500};
    draft.parameters["postpurge_ms"] = std::int64_t{1000};
    const auto generated = builder.build_program(draft);
    expect_true(generated.ok(), "burner_supervisory_skeleton should generate successfully");
    expect_true(generated.value->states.size() == 10U, "burner skeleton should create the expected state count");
    expect_true(generated.value->states[2].id == "PREPURGE", "burner skeleton should include PREPURGE");
    expect_true(generated.value->states[4].id == "FLAME_PROVE", "burner skeleton should include FLAME_PROVE");
    expect_true(!generated.value->enabled, "burner skeleton should stay disabled by default");
  }

  {
    controller::sequence::ProgramBuilderDraft draft;
    draft.skeleton_kind = controller::sequence::ProgramSkeletonKind::incinerator_supervisory_skeleton;
    draft.program_type = controller::sequence::SequenceProgramType::incinerator;
    draft.program_id = "builder.incinerator_1";
    draft.program_name = "Builder Incinerator";
    draft.actuator_bindings["fan_output"] = "relay.fan";
    draft.actuator_bindings["diesel_output"] = "relay.diesel";
    draft.actuator_bindings["sludge_output"] = "relay.valve";
    draft.signal_bindings["chamber_temp_signal"] = "signal.chamber_temp";
    draft.parameters["warmup_temp"] = 650.0;
    draft.parameters["cooldown_temp"] = 320.0;
    const auto generated = builder.build_program(draft);
    expect_true(generated.ok(), "incinerator_supervisory_skeleton should generate successfully");
    expect_true(generated.value->states.size() == 9U, "incinerator skeleton should create the expected state count");
    expect_true(generated.value->states[2].id == "DIESEL_WARMUP", "incinerator skeleton should include DIESEL_WARMUP");
    expect_true(generated.value->states[4].id == "SLUDGE_RUN", "incinerator skeleton should include SLUDGE_RUN");
    expect_true(!generated.value->enabled, "incinerator skeleton should stay disabled by default");
  }

  if (failures != 0) {
    std::cerr << "test_program_skeleton_builder_generation failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_skeleton_builder_generation passed\n";
  return 0;
}
