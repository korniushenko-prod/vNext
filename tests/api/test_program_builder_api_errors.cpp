#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "program builder API errors context should initialize");

  {
    auto draft = make_pump_builder_draft();
    auto bad_context = make_command_context(1U, "", "missing source");
    const auto created = context.api_service.create_program_from_draft(draft, bad_context);
    expect_true(!created.accepted, "invalid command context should be rejected");
    expect_true(created.status.code == controller::api::ProgramBuilderUiResultCode::builder_ui_invalid_argument, "invalid context should map to stable API code");
  }

  {
    const auto draft = context.api_service.create_empty_draft(static_cast<controller::sequence::ProgramSkeletonKind>(999));
    expect_true(!draft.ok(), "unknown skeleton kind should be rejected");
  }

  {
    sequence_test::SequenceTestContext empty_sequence;
    controller::api::ProgramBuilderApiService empty_service(
        empty_sequence.registry,
        empty_sequence.actuator_manager,
        empty_sequence.timer_service,
        empty_sequence.alarm_service,
        empty_sequence.sequence_service);
    const auto catalog = empty_service.get_builder_catalog(0U);
    expect_true(catalog.ok(), "missing runtime catalog data should be handled gracefully");
    expect_true(catalog.value->signals.empty(), "empty context should expose empty signal catalog instead of failing");
  }

  if (failures != 0) {
    std::cerr << "test_program_builder_api_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_builder_api_errors passed\n";
  return 0;
}
