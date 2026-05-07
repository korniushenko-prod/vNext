#include <cstdint>
#include <iostream>
#include <string>

#include "alarms/alarm_service.hpp"

using controller::alarms::AlarmDescriptor;
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

AlarmDescriptor make_descriptor(std::string id, const bool latching) {
  return AlarmDescriptor{
      std::move(id),
      "History alarm",
      true,
      AlarmSeverity::trip,
      latching,
      "Stage 7 history test alarm",
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
    AlarmService service(nullptr, 16U);
    expect_true(service.register_alarm(make_descriptor("alarm.trip", true)).ok(), "latching history alarm registration should succeed");

    expect_true(service.raise_alarm("alarm.trip", 10U, "tests", "raised").ok(), "raise should succeed");
    expect_true(service.reset_alarm("alarm.trip", 11U, "operator", "denied").status.code != controller::alarms::AlarmErrorCode::ok, "reset denial should be recorded via error");
    expect_true(service.clear_condition("alarm.trip", 12U, "tests", "cleared").ok(), "clear should succeed");
    expect_true(service.reset_alarm("alarm.trip", 13U, "operator", "reset").ok(), "reset should succeed");

    const auto history = service.read_history();
    expect_true(history.size() == 5U, "history should contain raise, latched, reset_denied, clear and reset");
    expect_true(history[0].event_type == AlarmEventType::condition_raised, "first event should be condition_raised");
    expect_true(history[1].event_type == AlarmEventType::latched, "second event should be latched");
    expect_true(history[2].event_type == AlarmEventType::reset_denied, "third event should be reset_denied");
    expect_true(history[3].event_type == AlarmEventType::condition_cleared, "fourth event should be condition_cleared");
    expect_true(history[4].event_type == AlarmEventType::reset, "fifth event should be reset");
    expect_true(
        history[0].sequence_number < history[1].sequence_number &&
            history[1].sequence_number < history[2].sequence_number &&
            history[2].sequence_number < history[3].sequence_number &&
            history[3].sequence_number < history[4].sequence_number,
        "history sequence numbers should be strictly increasing");

    service.clear_history();
    expect_true(service.read_history().empty(), "clear_history should remove stored entries");

    expect_true(service.raise_alarm("alarm.trip", 20U, "tests", "raised again").ok(), "raise after clear_history should still succeed");
    const auto after_clear = service.read_history();
    expect_true(after_clear.size() == 2U, "new raise after clear_history should create condition_raised and latched events");
    expect_true(
        after_clear[0].sequence_number > history.back().sequence_number,
        "sequence numbers should continue increasing after clear_history");
  }

  {
    AlarmService service(nullptr, 4U);
    expect_true(service.register_alarm(make_descriptor("alarm.trip.small", true)).ok(), "small history alarm registration should succeed");

    expect_true(service.raise_alarm("alarm.trip.small", 100U, "tests", "raised").ok(), "raise should succeed");
    expect_true(service.reset_alarm("alarm.trip.small", 101U, "operator", "denied").status.code != controller::alarms::AlarmErrorCode::ok, "reset denial should occur");
    expect_true(service.clear_condition("alarm.trip.small", 102U, "tests", "cleared").ok(), "clear should succeed");
    expect_true(service.reset_alarm("alarm.trip.small", 103U, "operator", "reset").ok(), "reset should succeed");

    const auto history = service.read_history();
    expect_true(history.size() == 4U, "bounded history should keep only the newest entries");
    expect_true(history[0].event_type == AlarmEventType::latched, "oldest retained entry should be latched after eviction");
    expect_true(history[1].event_type == AlarmEventType::reset_denied, "reset_denied should remain after eviction");
    expect_true(history[2].event_type == AlarmEventType::condition_cleared, "condition_cleared should remain after eviction");
    expect_true(history[3].event_type == AlarmEventType::reset, "reset should remain after eviction");
  }

  if (failures != 0) {
    std::cerr << "test_alarm_service_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_alarm_service_history passed\n";
  return 0;
}
