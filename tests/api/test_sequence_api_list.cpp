#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ApiTestContext context;
  expect_true(context.initialize(), "api list context should initialize");

  auto pump_program = make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump);
  auto burner_program = make_program("burner1", "Burner 1", controller::sequence::SequenceProgramType::burner);

  expect_true(context.sequence.sequence_service.register_program(pump_program).ok(), "register first program");
  expect_true(context.sequence.sequence_service.register_program(burner_program).ok(), "register second program");
  expect_true(
      context.sequence.sequence_service.start_program("pump1", 10U, "test", "start active").ok(),
      "start first program");

  const auto result = context.api_service.list_programs(10U);
  expect_true(result.ok(), "list_programs should succeed");
  expect_true(result.ok() && result.value->size() == 2U, "list_programs should return all registered programs");
  expect_true(result.ok() && result.value->at(0).id == "pump1", "program ordering should remain deterministic");
  expect_true(result.ok() && result.value->at(1).id == "burner1", "second program should keep registration order");
  expect_true(result.ok() && result.value->at(0).is_active, "active program should be marked");
  expect_true(
      result.ok() && result.value->at(0).lifecycle == std::optional{controller::sequence::SequenceLifecycle::running},
      "active program summary should include lifecycle");
  expect_true(
      result.ok() && result.value->at(0).current_state == std::optional<std::string>{"start"},
      "active program summary should include current state");
  expect_true(result.ok() && !result.value->at(1).is_active, "inactive program should not be marked active");
  expect_true(
      result.ok() && !result.value->at(1).lifecycle.has_value(),
      "inactive program summary should omit lifecycle");

  if (failures != 0) {
    std::cerr << "test_sequence_api_list failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_api_list passed\n";
  return 0;
}
