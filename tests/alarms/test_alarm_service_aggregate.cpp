#include <cstdint>
#include <iostream>
#include <string>

#include "alarms/alarm_service.hpp"

using controller::alarms::AlarmDescriptor;
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

AlarmDescriptor make_descriptor(
    std::string id,
    std::string name,
    const AlarmSeverity severity,
    const bool latching = false) {
  return AlarmDescriptor{
      std::move(id),
      std::move(name),
      true,
      severity,
      latching,
      "Stage 7 aggregate test alarm",
      "tests",
      true,
      true,
      false,
      true,
  };
}

}  // namespace

int main() {
  AlarmService service;

  expect_true(service.register_alarm(make_descriptor("alarm.warning", "Warning", AlarmSeverity::warning)).ok(), "warning registration should succeed");
  expect_true(service.register_alarm(make_descriptor("alarm.inhibit", "Inhibit", AlarmSeverity::inhibit)).ok(), "inhibit registration should succeed");
  expect_true(service.register_alarm(make_descriptor("alarm.trip", "Trip", AlarmSeverity::trip, true)).ok(), "trip registration should succeed");
  expect_true(service.register_alarm(make_descriptor("alarm.safety", "Safety", AlarmSeverity::safety)).ok(), "safety registration should succeed");

  expect_true(service.raise_alarm("alarm.warning", 10U, "tests", "warning").ok(), "warning raise should succeed");
  expect_true(service.raise_alarm("alarm.inhibit", 10U, "tests", "inhibit").ok(), "inhibit raise should succeed");
  expect_true(service.raise_alarm("alarm.trip", 10U, "tests", "trip").ok(), "trip raise should succeed");

  auto aggregate = service.get_aggregate_status();
  expect_true(aggregate.any_active, "aggregate any_active should be true");
  expect_true(aggregate.warning_active, "warning_active should be true");
  expect_true(aggregate.inhibit_active, "inhibit_active should be true");
  expect_true(aggregate.trip_active, "trip_active should be true");
  expect_true(!aggregate.safety_active, "safety_active should be false before safety raise");
  expect_true(aggregate.active_count == 3U, "active_count should count active alarms");
  expect_true(
      aggregate.highest_severity.has_value() && *aggregate.highest_severity == AlarmSeverity::trip,
      "highest_severity should initially be trip");
  expect_true(
      aggregate.highest_severity_alarm_id.has_value() && *aggregate.highest_severity_alarm_id == "alarm.trip",
      "highest severity alarm id should point at the trip alarm");

  expect_true(service.clear_condition("alarm.warning", 20U, "tests", "warning cleared").ok(), "warning clear should succeed");
  aggregate = service.get_aggregate_status();
  expect_true(!aggregate.warning_active, "warning_active should clear after warning clears");
  expect_true(aggregate.active_count == 2U, "active_count should drop after warning clears");

  expect_true(service.clear_condition("alarm.trip", 30U, "tests", "trip condition cleared").ok(), "trip condition clear should succeed");
  aggregate = service.get_aggregate_status();
  expect_true(
      aggregate.trip_active && aggregate.active_count == 2U,
      "latching trip should remain active in aggregate until reset");

  expect_true(service.reset_alarm("alarm.trip", 40U, "operator", "trip reset").ok(), "trip reset should succeed");
  aggregate = service.get_aggregate_status();
  expect_true(!aggregate.trip_active, "trip_active should clear after reset");
  expect_true(aggregate.active_count == 1U, "active_count should drop after trip reset");
  expect_true(
      aggregate.highest_severity.has_value() && *aggregate.highest_severity == AlarmSeverity::inhibit,
      "highest_severity should fall back to inhibit after trip reset");

  expect_true(service.raise_alarm("alarm.safety", 50U, "tests", "safety").ok(), "safety raise should succeed");
  aggregate = service.get_aggregate_status();
  expect_true(aggregate.safety_active, "safety_active should become true");
  expect_true(aggregate.active_count == 2U, "active_count should include safety plus inhibit");
  expect_true(
      aggregate.highest_severity.has_value() && *aggregate.highest_severity == AlarmSeverity::safety,
      "highest_severity should become safety");
  expect_true(
      aggregate.highest_severity_alarm_id.has_value() && *aggregate.highest_severity_alarm_id == "alarm.safety",
      "highest severity alarm id should update to the safety alarm");

  if (failures != 0) {
    std::cerr << "test_alarm_service_aggregate failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_alarm_service_aggregate passed\n";
  return 0;
}
