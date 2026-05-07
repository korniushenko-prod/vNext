#include <cstdint>
#include <iostream>
#include <string>

#include "alarms/alarm_service.hpp"
#include "signals/signal_registry.hpp"

using controller::alarms::AlarmDescriptor;
using controller::alarms::AlarmService;
using controller::alarms::AlarmSeverity;
using controller::signals::SignalRegistry;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void expect_bool(
    const SignalRegistry& registry,
    const std::string& path,
    const std::uint64_t now_ms,
    const bool expected,
    const std::string& message) {
  const auto result = registry.read_bool(path, now_ms);
  if (!result.ok() || result.value.value() != expected) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void expect_int64(
    const SignalRegistry& registry,
    const std::string& path,
    const std::uint64_t now_ms,
    const std::int64_t expected,
    const std::string& message) {
  const auto result = registry.read_int64(path, now_ms);
  if (!result.ok() || result.value.value() != expected) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void expect_string(
    const SignalRegistry& registry,
    const std::string& path,
    const std::uint64_t now_ms,
    const std::string& expected,
    const std::string& message) {
  const auto result = registry.read_string(path, now_ms);
  if (!result.ok() || result.value.value() != expected) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

AlarmDescriptor make_descriptor(std::string id, const bool latching) {
  return AlarmDescriptor{
      std::move(id),
      "Signal alarm",
      true,
      AlarmSeverity::trip,
      latching,
      "Stage 7 signal test alarm",
      "tests",
      true,
      true,
      false,
      true,
  };
}

}  // namespace

int main() {
  SignalRegistry registry;
  AlarmService service(&registry);

  expect_true(service.register_alarm(make_descriptor("burner.lockout", true)).ok(), "signal-backed alarm registration should succeed");

  expect_true(registry.has_signal("alarm.any_active"), "aggregate any_active signal should be registered");
  expect_true(registry.has_signal("alarm.highest_severity"), "aggregate highest_severity signal should be registered");
  expect_true(registry.has_signal("alarm.burner.lockout.active"), "per-alarm active signal should be registered");
  expect_true(registry.has_signal("alarm.burner.lockout.last_reason"), "per-alarm last_reason signal should be registered");

  expect_bool(registry, "alarm.any_active", 0U, false, "initial any_active signal should be false");
  expect_bool(registry, "alarm.burner.lockout.condition_active", 0U, false, "initial condition_active should be false");
  expect_bool(registry, "alarm.burner.lockout.active", 0U, false, "initial active should be false");
  expect_bool(registry, "alarm.burner.lockout.latched", 0U, false, "initial latched should be false");
  expect_bool(registry, "alarm.burner.lockout.reset_allowed", 0U, false, "initial reset_allowed should be false");
  expect_int64(registry, "alarm.burner.lockout.activation_count", 0U, 0, "initial activation_count should be zero");
  expect_string(registry, "alarm.burner.lockout.severity", 0U, "trip", "severity signal should publish trip");
  expect_string(registry, "alarm.burner.lockout.last_reason", 0U, "", "initial last_reason should be empty");

  expect_true(service.raise_alarm("burner.lockout", 100U, "tests", "flame lost").ok(), "raise should succeed");
  expect_bool(registry, "alarm.any_active", 100U, true, "aggregate any_active should become true");
  expect_bool(registry, "alarm.trip_active", 100U, true, "aggregate trip_active should become true");
  expect_int64(registry, "alarm.active_count", 100U, 1, "aggregate active_count should become one");
  expect_string(registry, "alarm.highest_severity", 100U, "trip", "aggregate highest_severity should be trip");
  expect_bool(registry, "alarm.burner.lockout.condition_active", 100U, true, "condition_active should become true");
  expect_bool(registry, "alarm.burner.lockout.active", 100U, true, "active should become true");
  expect_bool(registry, "alarm.burner.lockout.latched", 100U, true, "latched should become true");
  expect_bool(registry, "alarm.burner.lockout.reset_allowed", 100U, false, "reset_allowed should stay false while condition is active");
  expect_int64(registry, "alarm.burner.lockout.activation_count", 100U, 1, "activation_count should increment on first activation");
  expect_string(registry, "alarm.burner.lockout.last_reason", 100U, "flame lost", "last_reason should update on raise");

  expect_true(service.clear_condition("burner.lockout", 150U, "tests", "signal returned").ok(), "clear should succeed");
  expect_bool(registry, "alarm.any_active", 150U, true, "aggregate any_active should remain true for latched alarm");
  expect_bool(registry, "alarm.burner.lockout.condition_active", 150U, false, "condition_active should clear");
  expect_bool(registry, "alarm.burner.lockout.active", 150U, true, "active should stay true while latched");
  expect_bool(registry, "alarm.burner.lockout.latched", 150U, true, "latched should remain true before reset");
  expect_bool(registry, "alarm.burner.lockout.reset_allowed", 150U, true, "reset_allowed should become true after condition clears");
  expect_string(registry, "alarm.burner.lockout.last_reason", 150U, "signal returned", "last_reason should update on clear");

  expect_true(service.reset_alarm("burner.lockout", 200U, "operator", "manual reset").ok(), "reset should succeed");
  expect_bool(registry, "alarm.any_active", 200U, false, "aggregate any_active should clear after reset");
  expect_bool(registry, "alarm.trip_active", 200U, false, "aggregate trip_active should clear after reset");
  expect_int64(registry, "alarm.active_count", 200U, 0, "aggregate active_count should return to zero");
  expect_string(registry, "alarm.highest_severity", 200U, "", "aggregate highest_severity should clear when no alarms are active");
  expect_bool(registry, "alarm.burner.lockout.active", 200U, false, "active should clear after reset");
  expect_bool(registry, "alarm.burner.lockout.latched", 200U, false, "latched should clear after reset");
  expect_bool(registry, "alarm.burner.lockout.reset_allowed", 200U, false, "reset_allowed should clear after reset");
  expect_int64(registry, "alarm.burner.lockout.activation_count", 200U, 1, "activation_count should remain one after reset");
  expect_string(registry, "alarm.burner.lockout.last_reason", 200U, "manual reset", "last_reason should update on reset");

  if (failures != 0) {
    std::cerr << "test_alarm_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_alarm_service_signals passed\n";
  return 0;
}
