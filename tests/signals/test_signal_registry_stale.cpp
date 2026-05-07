#include <cstdint>
#include <iostream>
#include <string>
#include <utility>

#include "signals/signal_registry.hpp"

using controller::signals::SignalDescriptor;
using controller::signals::SignalRegistry;
using controller::signals::SignalType;
using controller::signals::SignalValue;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

SignalDescriptor make_descriptor(std::string path, std::string name, SignalType type, std::uint64_t max_age_ms) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
      "",
      "test_module",
      controller::signals::SignalAccessMode::read_only,
      max_age_ms,
      true,
      true,
  };
}

}  // namespace

int main() {
  SignalRegistry registry;

  expect_true(
      registry.register_signal(make_descriptor("flow1.rate_l_min", "Flow rate", SignalType::float64, 100U)).ok(),
      "stale-checked signal registration should succeed");
  expect_true(
      registry.register_signal(make_descriptor("alarm.trip_active", "Trip active", SignalType::boolean, 0U)).ok(),
      "non-stale signal registration should succeed");
  expect_true(
      registry.register_signal(make_descriptor("di1.active", "DI active", SignalType::boolean, 50U)).ok(),
      "independent-flag signal registration should succeed");

  expect_true(
      registry.update_signal("flow1.rate_l_min", SignalValue{12.5}, 1000U, true, false).ok(),
      "fresh stale-checked update should succeed");
  expect_true(
      registry.update_signal("alarm.trip_active", SignalValue{true}, 1000U, true, true).ok(),
      "faulted non-stale update should succeed");
  expect_true(
      registry.update_signal("di1.active", SignalValue{false}, 1000U, false, true).ok(),
      "invalid and faulted update should succeed");

  const auto fresh = registry.read_signal("flow1.rate_l_min", 1099U);
  expect_true(fresh.ok() && !fresh.value->stale, "signal should stay fresh while age does not exceed max_age_ms");

  const auto stale = registry.read_signal("flow1.rate_l_min", 1101U);
  expect_true(stale.ok() && stale.value->stale, "signal should become stale once age exceeds max_age_ms");

  const auto no_stale_check = registry.read_signal("alarm.trip_active", 5000U);
  expect_true(
      no_stale_check.ok() && !no_stale_check.value->stale,
      "signal with max_age_ms disabled should never become stale");
  expect_true(
      no_stale_check.ok() && no_stale_check.value->valid && no_stale_check.value->fault,
      "fault and valid flags should remain independent when stale checking is disabled");

  const auto independent_flags = registry.read_signal("di1.active", 1100U);
  expect_true(
      independent_flags.ok() && independent_flags.value->stale && !independent_flags.value->valid &&
          independent_flags.value->fault,
      "stale, valid and fault flags should remain independent");

  expect_true(
      registry.update_signal("flow1.rate_l_min", SignalValue{13.0}, 1200U, true, false).ok(),
      "second update should succeed");
  const auto refreshed = registry.read_signal("flow1.rate_l_min", 1250U);
  expect_true(refreshed.ok() && !refreshed.value->stale, "fresh update should clear stale on the next read");
  expect_true(
      refreshed.ok() && refreshed.value->last_update_ms == 1200U,
      "last_update_ms should move forward after refresh");

  if (failures != 0) {
    std::cerr << "test_signal_registry_stale failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_signal_registry_stale passed\n";
  return 0;
}
