#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  {
    ApiTestContext context;
    expect_true(context.initialize(), "idle status context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register status program");

    const auto status = context.api_service.get_active_program_status(0U);
    expect_true(status.ok(), "get_active_program_status should succeed without an active program");
    expect_true(
        status.ok() && !status.value->active_program_id.has_value(),
        "idle active status should not expose an active program id");
    expect_true(
        status.ok() && status.value->lifecycle == controller::sequence::SequenceLifecycle::idle,
        "idle active status should report idle lifecycle");
    expect_true(
        status.ok() && status.value->transition_candidates.empty(),
        "idle active status should have no transition candidates");
    expect_true(
        status.ok() && status.value->actuators.size() == 3U,
        "idle active status should still include actuator summaries");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "active status context should initialize");

    auto active_program = make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump);
    auto standby_program = make_program("burner1", "Burner 1", controller::sequence::SequenceProgramType::burner);

    expect_true(context.sequence.sequence_service.register_program(active_program).ok(), "register active program");
    expect_true(context.sequence.sequence_service.register_program(standby_program).ok(), "register standby program");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start program").ok(),
        "start active program");
    expect_true(context.sequence.sequence_service.tick(1U).ok(), "tick active program to run state");
    expect_true(
        context.sequence.alarm_service.raise_alarm("alarm.sequence", 2U, "test", "trip active").ok(),
        "raise alarm for status aggregation");

    const auto active_status = context.api_service.get_program_status("pump1", 2U);
    expect_true(active_status.ok(), "get_program_status should succeed for the active program");
    expect_true(active_status.ok() && active_status.value->program_registered, "active program should be registered");
    expect_true(active_status.ok() && active_status.value->is_active, "active program status should be marked active");
    expect_true(
        active_status.ok() && active_status.value->current_state_id == std::optional<std::string>{"run"},
        "active status should include the current state");
    expect_true(
        active_status.ok() && active_status.value->lifecycle == controller::sequence::SequenceLifecycle::running,
        "active status should include lifecycle");
    expect_true(
        active_status.ok() && active_status.value->transition_candidates.size() == 1U,
        "active status should include transition candidates");
    expect_true(
        active_status.ok() && active_status.value->transition_candidates.front().transition_id == "to_stop",
        "transition candidate ordering should follow SequenceService ordering");
    expect_true(
        active_status.ok() && active_status.value->active_alarms.any_active,
        "active status should include alarm summary");
    expect_true(
        active_status.ok() && active_status.value->active_alarms.active_alarm_ids.size() == 1U,
        "active status should include active alarm ids");

    const auto relay_summary = active_status.ok() ? find_actuator(active_status.value->actuators, "relay.main") : std::nullopt;
    expect_true(relay_summary.has_value(), "active status should include relay actuator summary");
    expect_true(
        relay_summary.has_value() && !relay_summary->safe_fallback,
        "active relay summary should reflect effective request ownership");
    expect_true(
        relay_summary.has_value() && relay_summary->owner == "program:pump1:state:run",
        "active relay owner should come from SequenceService");

    const auto inactive_status = context.api_service.get_program_status("burner1", 2U);
    expect_true(inactive_status.ok(), "inactive registered program should return a structured success response");
    expect_true(
        inactive_status.ok() && inactive_status.value->program_id == std::optional<std::string>{"burner1"},
        "inactive registered program status should keep the queried program id");
    expect_true(
        inactive_status.ok() && !inactive_status.value->is_active,
        "inactive registered program should not be marked active");
    expect_true(
        inactive_status.ok() && inactive_status.value->active_program_id == std::optional<std::string>{"pump1"},
        "inactive registered program should still show the active program elsewhere");
    expect_true(
        inactive_status.ok() && !inactive_status.value->current_state_id.has_value(),
        "inactive registered program should not expose a current state");
    expect_true(
        inactive_status.ok() && inactive_status.value->lifecycle == controller::sequence::SequenceLifecycle::idle,
        "inactive registered program should report idle lifecycle");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_api_status failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_api_status passed\n";
  return 0;
}
