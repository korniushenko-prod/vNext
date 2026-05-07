#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  {
    ApiTestContext context;
    expect_true(context.initialize(), "history retrieval context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for history retrieval");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program for history retrieval");
    expect_true(context.sequence.sequence_service.tick(1U).ok(), "tick to run for history retrieval");
    expect_true(
        context.sequence.sequence_service.request_normal_stop(2U, "test", "stop").ok(),
        "request normal stop for history retrieval");

    const auto active_history = context.api_service.get_active_program_history(2);
    expect_true(active_history.ok(), "active program history should succeed while a program is active");
    expect_true(
        active_history.ok() && active_history.value->size() == 2U,
        "active program history should respect the explicit limit");

    expect_true(context.sequence.sequence_service.tick(3U).ok(), "tick to stop for history retrieval");

    const auto history = context.api_service.get_program_history("pump1");
    expect_true(history.ok(), "program history should succeed");
    expect_true(history.ok() && !history.value->empty(), "program history should return entries");
    expect_true(
        history.ok() && history.value->front().event_type == controller::sequence::SequenceEventType::program_started,
        "history should remain oldest-first");
    expect_true(
        history.ok() && history.value->front().sequence_number < history.value->back().sequence_number,
        "history sequence numbers should stay deterministic");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "empty history context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for empty history");

    const auto history = context.api_service.get_program_history("pump1");
    expect_true(history.ok(), "empty history query should still succeed");
    expect_true(history.ok() && history.value->empty(), "registered program with no history should return an empty list");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "unknown history context should initialize");

    const auto history = context.api_service.get_program_history("missing");
    expect_true(!history.ok(), "unknown program history should be rejected");
    expect_true(
        history.status.code == controller::api::ApiErrorCode::api_program_not_found,
        "unknown program history should surface API_PROGRAM_NOT_FOUND");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_api_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_api_history passed\n";
  return 0;
}
