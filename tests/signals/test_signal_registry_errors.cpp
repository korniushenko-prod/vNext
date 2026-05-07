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

SignalDescriptor make_descriptor(
    std::string path,
    std::string name,
    SignalType type,
    SignalAccessMode access_mode = SignalAccessMode::read_only) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
      "",
      "test_module",
      access_mode,
      0U,
      true,
      true,
  };
}

}  // namespace

int main() {
  SignalRegistry registry;

  const auto first_register = registry.register_signal(make_descriptor("di1.raw", "DI 1 raw", SignalType::boolean));
  const auto duplicate_register = registry.register_signal(make_descriptor("di1.raw", "DI 1 raw copy", SignalType::boolean));
  expect_true(first_register.ok(), "initial signal registration should succeed");
  expect_true(
      !duplicate_register.ok() && duplicate_register.status.code == SignalErrorCode::signal_already_registered,
      "duplicate registration should fail with SIGNAL_ALREADY_REGISTERED");

  const auto empty_path = registry.register_signal(make_descriptor("", "Broken", SignalType::boolean));
  expect_true(
      !empty_path.ok() && empty_path.status.code == SignalErrorCode::signal_invalid_path,
      "empty path should fail with SIGNAL_INVALID_PATH");

  const auto unknown_read = registry.read_signal("missing.signal", 0U);
  expect_true(
      !unknown_read.ok() && unknown_read.status.code == SignalErrorCode::signal_not_found,
      "read on unknown signal should fail with SIGNAL_NOT_FOUND");

  expect_true(
      registry.register_signal(make_descriptor("ai1.pressure_bar", "AI pressure", SignalType::float64)).ok(),
      "double descriptor registration should succeed");
  const auto wrong_type_update = registry.update_signal("ai1.pressure_bar", SignalValue{std::string{"bad"}}, 10U);
  expect_true(
      !wrong_type_update.ok() && wrong_type_update.status.code == SignalErrorCode::signal_type_mismatch,
      "type mismatch update should fail with SIGNAL_TYPE_MISMATCH");

  expect_true(
      registry.register_signal(make_descriptor("alarm.trip_active", "Trip active", SignalType::boolean)).ok(),
      "uninitialized signal registration should succeed");
  const auto before_init_read = registry.read_bool("alarm.trip_active", 100U);
  expect_true(
      !before_init_read.ok() && before_init_read.status.code == SignalErrorCode::signal_not_initialized,
      "read before initialization should fail with SIGNAL_NOT_INITIALIZED");

  expect_true(
      registry.register_signal(
          make_descriptor("relay1.state", "Relay 1 state", SignalType::boolean, SignalAccessMode::read_only))
          .ok(),
      "read-only signal registration should succeed");
  const auto denied_write = registry.write_virtual_signal("relay1.state", SignalValue{true}, 20U);
  expect_true(
      !denied_write.ok() && denied_write.status.code == SignalErrorCode::signal_write_denied,
      "write_virtual_signal should reject read-only signals");

  const auto wrong_typed_read = registry.update_signal("ai1.pressure_bar", SignalValue{3.5}, 30U);
  const auto bool_read = registry.read_bool("ai1.pressure_bar", 30U);
  expect_true(wrong_typed_read.ok(), "double update for typed read mismatch test should succeed");
  expect_true(
      !bool_read.ok() && bool_read.status.code == SignalErrorCode::signal_type_mismatch,
      "typed read mismatch should fail with SIGNAL_TYPE_MISMATCH");

  if (failures != 0) {
    std::cerr << "test_signal_registry_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_signal_registry_errors passed\n";
  return 0;
}
