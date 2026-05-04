#include <iostream>
#include <string>

#include "config/config_defaults.hpp"
#include "config/config_validation.hpp"

using controller::config::SafeState;
using controller::config::factory_default_config;
using controller::config::validate_config;

namespace {

int failures = 0;

void expect_true(bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

}  // namespace

int main() {
  const auto config = factory_default_config();
  const auto result = validate_config(config);

  expect_true(result.valid, "factory_default_config() must validate successfully");
  expect_true(!result.has_errors(), "factory default config must contain zero validation errors");
  expect_true(config.programs.empty(), "factory default config must not contain active programs");

  for (const auto& relay : config.relays) {
    expect_true(!relay.enabled, "default relay must be disabled");
    expect_true(relay.safe_state == SafeState::off, "default relay safe_state must be OFF");
  }

  if (failures != 0) {
    std::cerr << "test_config_defaults failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_config_defaults passed\n";
  return 0;
}
