#include <iostream>
#include <string>

#include "hal/relay_hal.hpp"

using controller::hal::HalErrorCode;
using controller::hal::MockRelayHal;
using controller::hal::RelayChannelConfig;
using controller::hal::RelayState;

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
  MockRelayHal relay_hal({
      RelayChannelConfig{"relay_1", RelayState::off, RelayState::off},
      RelayChannelConfig{"relay_2", RelayState::on, RelayState::off},
  });

  expect_true(relay_hal.initialize().ok(), "relay HAL should initialize");

  const auto default_state = relay_hal.get_state("relay_1");
  expect_true(default_state.ok() && default_state.value.value() == RelayState::off, "relay should start in its startup state");

  expect_true(relay_hal.set_state("relay_1", RelayState::on).ok(), "set_state should succeed");
  const auto on_state = relay_hal.get_state("relay_1");
  expect_true(on_state.ok() && on_state.value.value() == RelayState::on, "get_state should return written relay state");

  expect_true(relay_hal.apply_safe_state("relay_2").ok(), "apply_safe_state should succeed");
  const auto relay_2_state = relay_hal.get_state("relay_2");
  const auto relay_2_safe_state = relay_hal.get_safe_state("relay_2");
  expect_true(relay_2_state.ok() && relay_2_safe_state.ok() &&
                  relay_2_state.value.value() == relay_2_safe_state.value.value(),
              "apply_safe_state should drive relay to configured safe state");

  expect_true(relay_hal.set_state("relay_1", RelayState::on).ok(), "relay_1 should switch back on");
  expect_true(relay_hal.apply_all_safe_states().ok(), "apply_all_safe_states should succeed");
  const auto relay_1_safe = relay_hal.get_state("relay_1");
  expect_true(relay_1_safe.ok() && relay_1_safe.value.value() == RelayState::off, "apply_all_safe_states should restore safe state on every relay");

  const auto unknown_relay = relay_hal.get_state("missing");
  expect_true(
      !unknown_relay.ok() && unknown_relay.status.code == HalErrorCode::unknown_id,
      "unknown relay id should return HAL_UNKNOWN_ID");

  if (failures != 0) {
    std::cerr << "test_relay_hal failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_relay_hal passed\n";
  return 0;
}
