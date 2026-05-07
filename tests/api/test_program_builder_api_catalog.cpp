#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "program builder API catalog context should initialize");

  expect_true(context.sequence.sequence_service.register_program(sequence_test::make_basic_program()).ok(), "seed existing program");

  const auto catalog = context.api_service.get_builder_catalog(0U);
  expect_true(catalog.ok(), "catalog should load successfully");
  expect_true(!catalog.value->signals.empty(), "catalog should include signals");
  expect_true(!catalog.value->actuators.empty(), "catalog should include actuators");
  expect_true(!catalog.value->timers.empty(), "catalog should include timers");
  expect_true(!catalog.value->alarms.empty(), "catalog should include alarms");
  expect_true(!catalog.value->existing_program_ids.empty(), "catalog should include existing program ids");
  expect_true(catalog.value->supported_skeletons.size() >= 6U, "catalog should expose supported skeleton kinds");
  expect_true(catalog.value->signals.front().path <= catalog.value->signals.back().path, "signal ordering should be deterministic");
  expect_true(catalog.value->existing_program_ids.front() == "pump1", "existing program ids should include registered program id");

  if (failures != 0) {
    std::cerr << "test_program_builder_api_catalog failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_builder_api_catalog passed\n";
  return 0;
}
