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

AlarmDescriptor make_descriptor(std::string id) {
  return AlarmDescriptor{
      std::move(id),
      "Latching alarm",
      true,
      AlarmSeverity::trip,
      true,
      "Stage 7 latching test alarm",
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
  expect_true(service.register_alarm(make_descriptor("alarm.lockout")).ok(), "latching alarm registration should succeed");

  expect_true(service.raise_alarm("alarm.lockout", 100U, "tests", "flame lost").ok(), "initial raise should succeed");
  auto snapshot = service.get_snapshot("alarm.lockout");
  expect_true(snapshot.ok(), "snapshot should exist after raise");
  expect_true(
      snapshot.ok() && snapshot.value->state.active && snapshot.value->state.latched &&
          snapshot.value->state.condition_active,
      "latching alarm should become active and latched");
  expect_true(
      snapshot.ok() && snapshot.value->state.activation_count == 1U && snapshot.value->state.first_activated_ms == 100U,
      "first activation should increment activation_count once");

  expect_true(service.raise_alarm("alarm.lockout", 110U, "tests", "still flame lost").ok(), "repeated raise while active should be a no-op success");
  snapshot = service.get_snapshot("alarm.lockout");
  expect_true(
      snapshot.ok() && snapshot.value->state.activation_count == 1U && snapshot.value->state.update_counter == 1U,
      "repeated raise while already active should not increment activation_count or update_counter");

  expect_true(
      service.clear_condition("alarm.lockout", 150U, "tests", "signal returned").ok(),
      "clearing condition should succeed for latching alarm");
  snapshot = service.get_snapshot("alarm.lockout");
  expect_true(
      snapshot.ok() && !snapshot.value->state.condition_active && snapshot.value->state.active &&
          snapshot.value->state.latched && snapshot.value->state.reset_allowed,
      "clearing condition should not clear active state until reset");
  expect_true(
      snapshot.ok() && snapshot.value->state.activation_count == 1U,
      "activation_count should not increment on condition clear");

  expect_true(
      service.raise_alarm("alarm.lockout", 200U, "tests", "condition returned while still latched").ok(),
      "raise after condition clear but before reset should still succeed");
  snapshot = service.get_snapshot("alarm.lockout");
  expect_true(
      snapshot.ok() && snapshot.value->state.activation_count == 1U && snapshot.value->state.active &&
          snapshot.value->state.latched,
      "activation_count should only increment on inactive-to-active transitions");

  if (failures != 0) {
    std::cerr << "test_alarm_service_latching failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_alarm_service_latching passed\n";
  return 0;
}
