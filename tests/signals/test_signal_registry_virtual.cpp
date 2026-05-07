#include <cstdint>
#include <iostream>
#include <string>
#include <utility>

#include "signals/signal_registry.hpp"

using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalErrorCode;
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

SignalDescriptor make_virtual_descriptor(std::string path, std::string name, SignalType type) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "virtual signal",
      type,
      "",
      "test_module",
      SignalAccessMode::writable_virtual,
      0U,
      true,
      true,
  };
}

}  // namespace

int main() {
  SignalRegistry registry;

  expect_true(
      registry.register_signal(make_virtual_descriptor("manual.enable", "Manual enable", SignalType::boolean)).ok(),
      "virtual bool signal registration should succeed");
  expect_true(
      registry.write_virtual_signal("manual.enable", SignalValue{true}, 10U).ok(),
      "writable virtual bool signal should accept writes");
  const auto bool_read = registry.read_bool("manual.enable", 10U);
  expect_true(bool_read.ok() && bool_read.value.value(), "virtual bool signal should return written value");

  const auto first_snapshot = registry.read_signal("manual.enable", 10U);
  expect_true(
      first_snapshot.ok() && first_snapshot.value->update_counter == 1U,
      "first virtual write should increment update_counter to 1");

  expect_true(
      registry.write_virtual_signal("manual.enable", SignalValue{false}, 20U).ok(),
      "second writable virtual write should succeed");
  const auto second_snapshot = registry.read_signal("manual.enable", 20U);
  expect_true(
      second_snapshot.ok() && second_snapshot.value->update_counter == 2U &&
          !std::get<bool>(second_snapshot.value->value.value()),
      "second virtual write should increment update_counter and replace value");

  expect_true(
      registry.register_signal(
          make_virtual_descriptor("manual.target_percent", "Manual target", SignalType::float64))
          .ok(),
      "virtual double signal registration should succeed");
  const auto wrong_type = registry.write_virtual_signal("manual.target_percent", SignalValue{std::int64_t{42}}, 30U);
  expect_true(
      !wrong_type.ok() && wrong_type.status.code == SignalErrorCode::signal_type_mismatch,
      "virtual signal writes should enforce descriptor type");

  const auto unknown = registry.write_virtual_signal("missing.virtual", SignalValue{true}, 40U);
  expect_true(
      !unknown.ok() && unknown.status.code == SignalErrorCode::signal_not_found,
      "write to unknown virtual signal should fail with SIGNAL_NOT_FOUND");

  const auto wrong_read_type = registry.read_string("manual.enable", 20U);
  expect_true(
      !wrong_read_type.ok() && wrong_read_type.status.code == SignalErrorCode::signal_type_mismatch,
      "typed reads should still enforce the signal type on virtual signals");

  if (failures != 0) {
    std::cerr << "test_signal_registry_virtual failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_signal_registry_virtual passed\n";
  return 0;
}
