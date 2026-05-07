#include <cstdint>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

#include "signals/signal_registry.hpp"

using controller::signals::SignalAccessMode;
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

SignalDescriptor make_descriptor(
    std::string path,
    std::string name,
    SignalType type,
    std::string unit,
    SignalAccessMode access_mode = SignalAccessMode::read_only,
    std::uint64_t max_age_ms = 0U) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
      std::move(unit),
      "test_module",
      access_mode,
      max_age_ms,
      true,
      true,
  };
}

}  // namespace

int main() {
  SignalRegistry registry;

  expect_true(
      registry.register_signal(make_descriptor("di1.raw", "DI 1 raw", SignalType::boolean, "")).ok(),
      "bool signal registration should succeed");
  expect_true(
      registry.register_signal(make_descriptor("counter1.total", "Counter total", SignalType::int64, "count")).ok(),
      "int64 signal registration should succeed");
  expect_true(
      registry.register_signal(make_descriptor("ai1.pressure_bar", "AI 1 pressure", SignalType::float64, "bar")).ok(),
      "double signal registration should succeed");
  expect_true(
      registry.register_signal(make_descriptor("program1.current_state", "Program state", SignalType::string, "")).ok(),
      "string signal registration should succeed");

  expect_true(registry.has_signal("di1.raw"), "has_signal should find registered signal");
  expect_true(!registry.has_signal("missing.signal"), "has_signal should be false for unknown signal");

  const auto descriptor = registry.get_descriptor("ai1.pressure_bar");
  expect_true(descriptor.ok(), "get_descriptor should succeed for registered signal");
  expect_true(
      descriptor.ok() && descriptor.value->unit == "bar" && descriptor.value->source_module == "test_module",
      "get_descriptor should return stored metadata");

  expect_true(registry.update_signal("di1.raw", SignalValue{true}, 10U).ok(), "bool update should succeed");
  expect_true(
      registry.update_signal("counter1.total", SignalValue{std::int64_t{1234}}, 20U).ok(),
      "int64 update should succeed");
  expect_true(
      registry.update_signal("ai1.pressure_bar", SignalValue{2.75}, 30U).ok(),
      "double update should succeed");
  expect_true(
      registry.update_signal("program1.current_state", SignalValue{std::string{"purge"}}, 40U).ok(),
      "string update should succeed");

  const auto bool_read = registry.read_bool("di1.raw", 10U);
  const auto int_read = registry.read_int64("counter1.total", 20U);
  const auto double_read = registry.read_double("ai1.pressure_bar", 35U);
  const auto string_read = registry.read_string("program1.current_state", 50U);

  expect_true(bool_read.ok() && bool_read.value.value(), "read_bool should return the stored bool value");
  expect_true(int_read.ok() && int_read.value.value() == 1234, "read_int64 should return the stored int64 value");
  expect_true(double_read.ok() && double_read.value.value() == 2.75, "read_double should return the stored double value");
  expect_true(
      string_read.ok() && string_read.value.value() == "purge",
      "read_string should return the stored string value");

  const auto paths = registry.list_signal_paths();
  expect_true(paths.size() == 4U, "list_signal_paths should include every registered signal");
  expect_true(
      paths == std::vector<std::string>({
                   "di1.raw",
                   "counter1.total",
                   "ai1.pressure_bar",
                   "program1.current_state",
               }),
      "signal paths should be returned in registration order");

  const auto descriptors = registry.list_descriptors();
  expect_true(descriptors.size() == 4U, "list_descriptors should include every registered descriptor");
  expect_true(
      descriptors.size() == 4U && descriptors[0].path == "di1.raw" &&
          descriptors[1].path == "counter1.total" &&
          descriptors[2].path == "ai1.pressure_bar" &&
          descriptors[3].path == "program1.current_state",
      "descriptor listing should be deterministic and match registration order");

  if (failures != 0) {
    std::cerr << "test_signal_registry_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_signal_registry_basic passed\n";
  return 0;
}
