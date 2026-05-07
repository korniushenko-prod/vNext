#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

#include "alarms/alarm_service.hpp"

using controller::alarms::AlarmDescriptor;
using controller::alarms::AlarmErrorCode;
using controller::alarms::AlarmEventType;
using controller::alarms::AlarmService;
using controller::alarms::AlarmSeverity;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

AlarmDescriptor make_latching_descriptor(std::string id) {
  return AlarmDescriptor{
      std::move(id),
      "Trip alarm",
      true,
      AlarmSeverity::trip,
      true,
      "Stage 7 reset test alarm",
      "tests",
      true,
      true,
      false,
      true,
  };
}

AlarmDescriptor make_non_latching_descriptor(std::string id) {
  return AlarmDescriptor{
      std::move(id),
      "Warning alarm",
      true,
      AlarmSeverity::warning,
      false,
      "Stage 7 reset test alarm",
      "tests",
      true,
      true,
      false,
      true,
  };
}

}  // namespace

int main() {
  {
    AlarmService service;
    expect_true(service.register_alarm(make_latching_descriptor("alarm.trip")).ok(), "latching alarm registration should succeed");

    expect_true(service.raise_alarm("alarm.trip", 100U, "tests", "low pressure").ok(), "raise should succeed");
    const auto denied = service.reset_alarm("alarm.trip", 110U, "operator", "premature reset");
    expect_true(
        !denied.ok() && denied.status.code == AlarmErrorCode::alarm_reset_denied,
        "reset while condition is active should be denied");

    auto history = service.read_history();
    expect_true(!history.empty(), "history should contain entries after reset denial");
    expect_true(
        history.back().event_type == AlarmEventType::reset_denied && history.back().reason == "premature reset",
        "reset_denied should be recorded in history");

    expect_true(service.clear_condition("alarm.trip", 120U, "tests", "pressure normal").ok(), "condition clear should succeed");
    const auto reset = service.reset_alarm("alarm.trip", 130U, "operator", "manual reset");
    expect_true(reset.ok(), "reset should succeed after condition clears");

    const auto snapshot = service.get_snapshot("alarm.trip");
    expect_true(snapshot.ok(), "snapshot should exist after reset");
    expect_true(
        snapshot.ok() && !snapshot.value->state.active && !snapshot.value->state.latched &&
            !snapshot.value->state.reset_allowed,
        "successful reset should clear active, latched and reset_allowed");

    history = service.read_history();
    expect_true(
        history.size() >= 5U && history.back().event_type == AlarmEventType::reset,
        "successful reset should create a reset history entry");
  }

  {
    AlarmService service;
    expect_true(
        service.register_alarm(make_non_latching_descriptor("alarm.warning")).ok(),
        "non-latching alarm registration should succeed");

    expect_true(service.raise_alarm("alarm.warning", 200U, "tests", "maintenance").ok(), "non-latching raise should succeed");
    const auto reset = service.reset_alarm("alarm.warning", 210U, "operator", "noop reset");
    expect_true(reset.ok(), "reset on non-latching alarm should be a success no-op");

    auto snapshot = service.get_snapshot("alarm.warning");
    expect_true(
        snapshot.ok() && snapshot.value->state.active && snapshot.value->state.condition_active,
        "non-latching reset should not clear an active condition");

    expect_true(service.clear_condition("alarm.warning", 220U, "tests", "maintenance done").ok(), "non-latching clear should succeed");
    snapshot = service.get_snapshot("alarm.warning");
    expect_true(
        snapshot.ok() && !snapshot.value->state.active && !snapshot.value->state.condition_active,
        "non-latching alarm should still clear from clear_condition, not reset");
  }

  if (failures != 0) {
    std::cerr << "test_alarm_service_reset failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_alarm_service_reset passed\n";
  return 0;
}
