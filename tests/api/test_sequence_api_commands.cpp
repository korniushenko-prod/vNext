#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  {
    ApiTestContext context;
    expect_true(context.initialize(), "start command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for start");

    const auto result = context.api_service.start_program("pump1", make_command_context(10U, "ui", "start"));
    expect_true(result.accepted, "start_program should delegate successfully");
    expect_true(result.code == controller::api::ApiErrorCode::ok, "successful start should return OK");
    expect_true(
        result.active_program_id == std::optional<std::string>{"pump1"},
        "successful start should expose the active program id");
    expect_true(
        result.status.has_value() && result.status->is_active,
        "successful start should embed updated active status");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "normal stop command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for normal stop");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program before normal stop");

    const auto result = context.api_service.request_normal_stop(make_command_context(1U, "ui", "normal stop"));
    expect_true(result.accepted, "normal stop should delegate successfully");
    expect_true(
        result.lifecycle == std::optional{controller::sequence::SequenceLifecycle::normal_stop_requested},
        "normal stop result should expose updated lifecycle");
    expect_true(
        result.status.has_value() && result.status->pending_normal_stop,
        "normal stop result should expose pending stop status");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "trip command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for trip");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program before trip");

    const auto result = context.api_service.request_trip_stop(make_command_context(1U, "ui", "trip stop"));
    expect_true(result.accepted, "trip stop should delegate successfully");
    expect_true(
        result.lifecycle == std::optional{controller::sequence::SequenceLifecycle::trip_requested},
        "trip result should expose updated lifecycle");
    expect_true(
        result.status.has_value() && result.status->pending_trip,
        "trip result should expose pending trip status");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "reset command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for reset");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program before lockout");
    expect_true(context.sequence.sequence_service.tick(1U).ok(), "tick to run before trip");
    expect_true(
        context.sequence.sequence_service.request_trip_stop(2U, "test", "trip").ok(),
        "request trip before reset");
    expect_true(context.sequence.sequence_service.tick(3U).ok(), "tick to trip");
    expect_true(context.sequence.sequence_service.tick(4U).ok(), "tick to lockout");
    expect_true(
        context.sequence.registry.update_signal("permit.reset", controller::signals::SignalValue{true}, 5U).ok(),
        "allow reset");
    expect_true(context.sequence.sequence_service.tick(5U).ok(), "tick to publish reset permission");

    const auto result = context.api_service.reset_active_program(make_command_context(6U, "ui", "reset lockout"));
    expect_true(result.accepted, "reset should delegate successfully when lockout reset is allowed");
    expect_true(
        result.lifecycle == std::optional{controller::sequence::SequenceLifecycle::idle},
        "reset result should expose idle lifecycle");
    expect_true(
        result.status.has_value() && !result.status->active_program_id.has_value(),
        "reset result should embed idle status after reset");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_api_commands failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_api_commands passed\n";
  return 0;
}
