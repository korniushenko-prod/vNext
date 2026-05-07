#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

#include "alarms/alarm_service.hpp"

using controller::alarms::AlarmDescriptor;
using controller::alarms::AlarmErrorCode;
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
    const AlarmSeverity severity = AlarmSeverity::warning,
    const bool latching = false) {
  return AlarmDescriptor{
      std::move(id),
      std::move(name),
      true,
      severity,
      latching,
      "Stage 7 basic test alarm",
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

  expect_true(service.register_alarm(make_descriptor("alarm.warning", "Warning alarm")).ok(), "warning alarm registration should succeed");
  expect_true(
      service.register_alarm(make_descriptor("alarm.trip", "Trip alarm", AlarmSeverity::trip, true)).ok(),
      "trip alarm registration should succeed");

  const auto duplicate = service.register_alarm(make_descriptor("alarm.warning", "Warning alarm copy"));
  expect_true(
      !duplicate.ok() && duplicate.status.code == AlarmErrorCode::alarm_already_registered,
      "duplicate alarm id should be rejected");

  const auto unknown = service.raise_alarm("missing.alarm", 10U, "tests", "missing");
  expect_true(
      !unknown.ok() && unknown.status.code == AlarmErrorCode::alarm_not_found,
      "unknown alarm id should return ALARM_NOT_FOUND");

  expect_true(service.has_alarm("alarm.warning"), "has_alarm should find registered alarm");
  expect_true(!service.has_alarm("missing.alarm"), "has_alarm should be false for unknown alarm");

  const auto descriptors = service.list_descriptors();
  expect_true(descriptors.size() == 2U, "list_descriptors should include every registered alarm");
  expect_true(
      descriptors.size() == 2U && descriptors[0].id == "alarm.warning" && descriptors[1].id == "alarm.trip",
      "descriptor listing should preserve registration order");

  expect_true(service.raise_alarm("alarm.warning", 100U, "tests", "sensor high").ok(), "raise_alarm should activate non-latching alarm");
  auto warning = service.get_snapshot("alarm.warning");
  expect_true(warning.ok(), "warning snapshot should exist");
  expect_true(
      warning.ok() && warning.value->state.condition_active && warning.value->state.active && !warning.value->state.latched,
      "non-latching alarm should be active without latching");
  expect_true(
      warning.ok() && warning.value->state.activation_count == 1U && warning.value->state.last_reason == "sensor high",
      "activation_count and last_reason should update on raise");

  auto aggregate = service.get_aggregate_status();
  expect_true(aggregate.any_active, "aggregate any_active should be true after raise");
  expect_true(aggregate.warning_active, "aggregate warning_active should be true for warning alarm");
  expect_true(aggregate.active_count == 1U, "aggregate active_count should be one after single raise");
  expect_true(
      aggregate.highest_severity.has_value() && *aggregate.highest_severity == AlarmSeverity::warning,
      "highest_severity should reflect the active warning");

  expect_true(
      service.clear_condition("alarm.warning", 150U, "tests", "sensor normal").ok(),
      "clear_condition should deactivate non-latching alarm");
  warning = service.get_snapshot("alarm.warning");
  expect_true(
      warning.ok() && !warning.value->state.condition_active && !warning.value->state.active &&
          !warning.value->state.latched,
      "non-latching alarm should clear when condition clears");

  aggregate = service.get_aggregate_status();
  expect_true(!aggregate.any_active, "aggregate any_active should clear after non-latching alarm clears");
  expect_true(aggregate.active_count == 0U, "aggregate active_count should return to zero");
  expect_true(!aggregate.highest_severity.has_value(), "highest_severity should be empty when no alarms are active");

  if (failures != 0) {
    std::cerr << "test_alarm_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_alarm_service_basic passed\n";
  return 0;
}
