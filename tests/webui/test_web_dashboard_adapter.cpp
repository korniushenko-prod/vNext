#include <iostream>

#include "api_test_support.hpp"
#include "api/web_dashboard_adapter.hpp"

int main() {
  using namespace api_test;

  {
    ApiTestContext context;
    expect_true(context.initialize(), "dashboard idle context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for idle dashboard");

    controller::api::WebDashboardAdapter adapter(context.api_service);
    const auto response = adapter.get_dashboard_data(0U);
    expect_true(response.success, "idle dashboard load should succeed");
    expect_true(
        response.code == controller::api::DashboardResultCode::dashboard_no_active_program,
        "idle dashboard should report no active program");
    expect_true(
        response.dashboard.selected_program_id == std::optional<std::string>{"pump1"},
        "idle dashboard should default-select the registered program");
    expect_true(response.dashboard.can_start, "idle dashboard should allow starting the selected program");
    expect_true(
        response.dashboard.stop_reason == "No active program to stop.",
        "idle dashboard should explain disabled stop");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "dashboard active context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for active dashboard");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program for active dashboard");
    expect_true(context.sequence.sequence_service.tick(1U).ok(), "tick into run state");
    expect_true(context.sequence.sequence_service.tick(2U).ok(), "tick to evaluate blocked transition");
    expect_true(
        context.sequence.alarm_service.raise_alarm("alarm.sequence", 3U, "test", "trip active").ok(),
        "raise alarm for dashboard aggregation");

    controller::api::WebDashboardAdapter adapter(context.api_service);
    const auto response = adapter.get_dashboard_data(3U);
    expect_true(response.success, "active dashboard load should succeed");
    expect_true(
        response.code == controller::api::DashboardResultCode::dashboard_ok,
        "active dashboard should report ok");
    expect_true(
        response.dashboard.active_program_id == std::optional<std::string>{"pump1"},
        "active dashboard should expose the active program");
    expect_true(
        response.dashboard.transition_candidates.size() == 1U,
        "active dashboard should include transition candidates");
    expect_true(
        response.dashboard.blocked_transitions.size() == 1U,
        "blocked transitions should be surfaced when no candidate is eligible");
    expect_true(
        response.dashboard.alarms_any_active && response.dashboard.active_alarm_entries.size() == 1U,
        "active alarms should be aggregated into the dashboard");
    expect_true(
        !response.dashboard.actuator_summaries.empty() && response.dashboard.actuator_summaries.front().id == "relay.main",
        "active actuator summaries should be present");
    expect_true(
        !response.dashboard.recent_history.empty(),
        "recent history should be loaded for the selected program");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "dashboard start command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for start command");

    controller::api::WebDashboardAdapter adapter(context.api_service);
    const auto start_result = adapter.post_start("pump1", make_command_context(10U, "ui", "start"));
    expect_true(start_result.accepted, "adapter start should delegate successfully");
    expect_true(
        start_result.code == controller::api::DashboardResultCode::dashboard_ok,
        "adapter start should return dashboard ok");
    expect_true(
        start_result.updated_dashboard.has_value() &&
            start_result.updated_dashboard->dashboard.active_program_id == std::optional<std::string>{"pump1"},
        "adapter start should return updated dashboard data");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "dashboard stop command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for stop command");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program before stop command");

    controller::api::WebDashboardAdapter adapter(context.api_service);
    const auto stop_result = adapter.post_stop(make_command_context(1U, "ui", "normal stop"));
    expect_true(stop_result.accepted, "adapter stop should delegate successfully");
    expect_true(
        stop_result.updated_dashboard.has_value() &&
            stop_result.updated_dashboard->dashboard.pending_normal_stop,
        "adapter stop should refresh pending normal stop state");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "dashboard trip command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for trip command");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program before trip command");

    controller::api::WebDashboardAdapter adapter(context.api_service);
    const auto trip_result = adapter.post_trip(make_command_context(1U, "ui", "trip"));
    expect_true(trip_result.accepted, "adapter trip should delegate successfully");
    expect_true(
        trip_result.updated_dashboard.has_value() &&
            trip_result.updated_dashboard->dashboard.pending_trip,
        "adapter trip should refresh pending trip state");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "dashboard reset command context should initialize");
    expect_true(
        context.sequence.sequence_service.register_program(
            make_program("pump1", "Pump 1", controller::sequence::SequenceProgramType::pump))
            .ok(),
        "register program for reset command");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "start program before reset command");
    expect_true(context.sequence.sequence_service.tick(1U).ok(), "tick to run before trip");
    expect_true(
        context.sequence.sequence_service.request_trip_stop(2U, "test", "trip").ok(),
        "request trip before reset");
    expect_true(context.sequence.sequence_service.tick(3U).ok(), "tick to trip state");
    expect_true(context.sequence.sequence_service.tick(4U).ok(), "tick to lockout state");
    expect_true(
        context.sequence.registry.update_signal("permit.reset", controller::signals::SignalValue{true}, 5U).ok(),
        "publish reset permit");
    expect_true(context.sequence.sequence_service.tick(5U).ok(), "tick to publish reset permission");

    controller::api::WebDashboardAdapter adapter(context.api_service);
    const auto reset_result = adapter.post_reset(make_command_context(6U, "ui", "reset"));
    expect_true(reset_result.accepted, "adapter reset should delegate successfully");
    expect_true(
        reset_result.updated_dashboard.has_value() &&
            !reset_result.updated_dashboard->dashboard.active_program_id.has_value(),
        "adapter reset should refresh into idle state");
  }

  {
    ApiTestContext context;
    expect_true(context.initialize(), "dashboard denied command context should initialize");

    controller::api::WebDashboardAdapter adapter(context.api_service);
    const auto denied = adapter.post_stop(make_command_context(1U, "ui", "normal stop"));
    expect_true(!denied.accepted, "adapter should surface denied stop commands");
    expect_true(
        denied.code == controller::api::DashboardResultCode::dashboard_no_active_program,
        "denied stop with no active program should return a stable dashboard code");
    expect_true(
        denied.message.find("No active program") != std::string::npos,
        "denied stop should preserve the human-readable message");
  }

  if (failures != 0) {
    std::cerr << "test_web_dashboard_adapter failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_dashboard_adapter passed\n";
  return 0;
}
