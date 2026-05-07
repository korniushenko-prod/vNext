#include <iostream>

#include "sequence_test_support.hpp"

int main() {
  using namespace sequence_test;

  SequenceTestContext context;
  expect_true(context.initialize(), "sequence admin context should initialize");

  {
    auto program = make_basic_program();
    expect_true(context.sequence_service.register_program(program).ok(), "inactive program should register");
    auto edited = program;
    edited.name = "Pump 1 Edited";
    expect_true(context.sequence_service.replace_program(program.id, edited, 10U).ok(), "replace inactive program should succeed");
    const auto loaded = context.sequence_service.get_program(program.id);
    expect_true(loaded.ok() && loaded.value->name == "Pump 1 Edited", "replace should persist new descriptor");
  }

  {
    SequenceTestContext active_context;
    expect_true(active_context.initialize(), "active replace context should initialize");
    auto program = make_basic_program();
    expect_true(active_context.sequence_service.register_program(program).ok(), "active replace program should register");
    expect_true(active_context.sequence_service.start_program(program.id, 20U, "test", "activate").ok(), "program should start");
    auto edited = program;
    edited.name = "Should Fail";
    expect_true(
        !active_context.sequence_service.replace_program(program.id, edited, 21U).ok(),
        "replace active program should be denied");
  }

  {
    SequenceTestContext delete_context;
    expect_true(delete_context.initialize(), "delete context should initialize");
    auto program = make_basic_program();
    expect_true(delete_context.sequence_service.register_program(program).ok(), "delete program should register");
    expect_true(delete_context.sequence_service.remove_program(program.id, 30U).ok(), "delete inactive program should succeed");
    expect_true(!delete_context.sequence_service.has_program(program.id), "deleted program should disappear");
  }

  {
    SequenceTestContext active_delete_context;
    expect_true(active_delete_context.initialize(), "active delete context should initialize");
    auto program = make_basic_program();
    expect_true(active_delete_context.sequence_service.register_program(program).ok(), "active delete program should register");
    expect_true(active_delete_context.sequence_service.start_program(program.id, 40U, "test", "activate").ok(), "program should start");
    expect_true(
        !active_delete_context.sequence_service.remove_program(program.id, 41U).ok(),
        "delete active program should be denied");
  }

  {
    SequenceTestContext disable_context;
    expect_true(disable_context.initialize(), "disable context should initialize");
    auto program = make_basic_program();
    expect_true(disable_context.sequence_service.register_program(program).ok(), "disable program should register");
    expect_true(disable_context.sequence_service.start_program(program.id, 50U, "test", "activate").ok(), "program should start");
    expect_true(
        !disable_context.sequence_service.set_program_enabled(program.id, false, 51U).ok(),
        "disable active program should be denied");
  }

  {
    SequenceTestContext rollback_context;
    expect_true(rollback_context.initialize(), "rollback context should initialize");
    auto program = make_basic_program();
    expect_true(rollback_context.sequence_service.register_program(program).ok(), "rollback program should register");
    auto invalid = program;
    invalid.states.push_back(invalid.states.front());
    expect_true(
        !rollback_context.sequence_service.replace_program(program.id, invalid, 60U).ok(),
        "invalid replace should fail");
    const auto loaded = rollback_context.sequence_service.get_program(program.id);
    expect_true(loaded.ok() && loaded.value->states.size() == program.states.size(), "failed replace must not partially mutate program");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_service_admin failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_admin passed\n";
  return 0;
}
