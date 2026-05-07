#include <iostream>

#include "api_test_support.hpp"
#include "sequence/program_skeleton_builder.hpp"

int main() {
  using namespace api_test;
  using namespace sequence_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "sequence builder validation context should initialize");

  controller::sequence::ProgramSkeletonBuilder builder(
      context.sequence.registry,
      context.sequence.actuator_manager,
      context.sequence.timer_service,
      context.sequence.alarm_service,
      context.sequence.sequence_service);

  {
    auto draft = make_pump_builder_draft();
    draft.actuator_bindings.erase("primary_output");
    const auto validation = builder.validate_draft(draft);
    expect_true(validation.has_errors(), "missing required actuator binding should be rejected");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.signal_bindings["pressure_low"] = "signal.temperature";
    const auto validation = builder.validate_draft(draft);
    expect_true(validation.has_errors(), "wrong signal type should be rejected");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.actuator_bindings["primary_output"] = "relay.fuel";
    const auto validation = builder.validate_draft(draft);
    expect_true(validation.has_errors(), "wrong actuator role should be rejected");
  }

  {
    auto draft = make_pump_builder_draft();
    draft.parameters.erase("min_run_time_ms");
    const auto validation = builder.validate_draft(draft);
    expect_true(validation.has_errors(), "missing required parameter should be rejected");
  }

  {
    auto draft = make_pump_builder_draft();
    expect_true(context.sequence.sequence_service.register_program(sequence_test::make_basic_program()).ok(), "seed existing program");
    draft.program_id = "pump1";
    const auto validation = context.api_service.validate_draft(draft, 0U);
    expect_true(!validation.status.ok(), "duplicate program id should fail through API service validation");
    expect_true(validation.value->has_errors(), "duplicate id should remain a blocking validation issue");
  }

  if (failures != 0) {
    std::cerr << "test_program_skeleton_builder_validation failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_skeleton_builder_validation passed\n";
  return 0;
}
