#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  {
    ApiTestContext context;
    expect_true(context.initialize(), "unknown program context should initialize");

    const auto result = context.api_service.start_program("missing", make_command_context(0U));
    expect_true(!result.accepted, "unknown program start should be rejected");
    expect_true(
        result.code == controller::api::ApiErrorCode::api_program_not_found,
        "unknown program should surface API_PROGRAM_NOT_FOUND");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "invalid context test should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for invalid context");

    controller::api::CommandContext invalid_context;
    invalid_context.now_ms = 1U;
    invalid_context.source = "";
    invalid_context.reason = "";

    const auto result = context.api_service.start_program("pump1", invalid_context);
    expect_true(!result.accepted, "empty command context should be rejected");
    expect_true(
        result.code == controller::api::ApiErrorCode::api_invalid_argument,
        "empty command context should surface API_INVALID_ARGUMENT");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "no-active command context should initialize");

    const auto stop_result = context.api_service.request_normal_stop(make_command_context(0U));
    const auto trip_result = context.api_service.request_trip_stop(make_command_context(0U));
    const auto reset_result = context.api_service.reset_active_program(make_command_context(0U));

    expect_true(!stop_result.accepted, "normal stop without active program should be rejected");
    expect_true(
        stop_result.code == controller::api::ApiErrorCode::api_no_active_program,
        "normal stop without active program should return API_NO_ACTIVE_PROGRAM");
    expect_true(!trip_result.accepted, "trip without active program should be rejected");
    expect_true(
        trip_result.code == controller::api::ApiErrorCode::api_no_active_program,
        "trip without active program should return API_NO_ACTIVE_PROGRAM");
    expect_true(!reset_result.accepted, "reset without active program should be rejected");
    expect_true(
        reset_result.code == controller::api::ApiErrorCode::api_no_active_program,
        "reset without active program should return API_NO_ACTIVE_PROGRAM");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "start denied context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for start denied");
    expect_true(
        context.sequence.registry.update_signal("permit.start", controller::signals::SignalValue{false}, 0U).ok(),
        "block start condition");

    const auto result = context.api_service.start_program("pump1", make_command_context(1U, "ui", "blocked start"));
    expect_true(!result.accepted, "denied start should be rejected");
    expect_true(
        result.code == controller::api::ApiErrorCode::api_start_denied,
        "denied start should surface API_START_DENIED");
    expect_true(
        result.status.has_value() && !result.status->can_start,
        "denied start should return embedded status with can_start=false");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "history limit context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for history limit validation");

    const auto history = context.api_service.get_program_history("pump1", -1);
    expect_true(!history.ok(), "negative history limit should be rejected");
    expect_true(
        history.status.code == controller::api::ApiErrorCode::api_invalid_argument,
        "negative history limit should surface API_INVALID_ARGUMENT");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_api_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_api_errors passed\n";
  return 0;
}
