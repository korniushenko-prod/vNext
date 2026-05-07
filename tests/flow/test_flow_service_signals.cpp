#include <cmath>
#include <iostream>
#include <optional>
#include <string>

#include "flow/flow_service.hpp"
#include "hal/pulse_input_hal.hpp"
#include "signals/signal_registry.hpp"
#include "storage/storage_service.hpp"

using controller::flow::FlowDescriptor;
using controller::flow::FlowRateMode;
using controller::flow::FlowService;
using controller::hal::MockPulseInputHal;
using controller::hal::PulseInputChannelConfig;
using controller::signals::SignalRegistry;
using controller::storage::InMemoryStorageBackend;
using controller::storage::StorageService;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

bool approx_equal(const double lhs, const double rhs, const double epsilon = 1e-9) {
  return std::fabs(lhs - rhs) <= epsilon;
}

}  // namespace

int main() {
  MockPulseInputHal hal({PulseInputChannelConfig{"pulse.signal", 0U, 0.0, true}});
  expect_true(hal.initialize().ok(), "mock pulse HAL should initialize");

  InMemoryStorageBackend backend;
  StorageService storage{backend};
  SignalRegistry signals;
  FlowService service{hal, storage, signals};

  FlowDescriptor descriptor;
  descriptor.id = "signal";
  descriptor.name = "Signal flow";
  descriptor.pulse_input_id = "pulse.signal";
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = FlowRateMode::pulse_frequency;
  descriptor.time_window_ms = 60000U;
  descriptor.no_flow_timeout_ms = 1000U;
  descriptor.high_flow_threshold = 20.0;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_bucket_ms = 60000U;
  descriptor.trend_bucket_count = 10U;

  expect_true(service.register_flowmeter(descriptor).ok(), "flow should register");
  expect_true(service.initialize_from_storage(0U).ok(), "storage init should succeed");
  expect_true(service.start_batch("signal", 0U, std::nullopt, "test", "start").ok(), "batch should start");

  expect_true(hal.set_mock_frequency_hz("pulse.signal", 5.0).ok(), "frequency should be injected");
  expect_true(hal.increment_mock_count("pulse.signal", 10U).ok(), "pulse count should increment");
  expect_true(service.tick(0U).ok(), "first tick should succeed");

  const auto raw_signal = signals.read_string("flow.signal.raw_pulse_lifetime", 0U);
  const auto lifetime_signal = signals.read_double("flow.signal.lifetime_total", 0U);
  const auto batch_active_signal = signals.read_bool("flow.signal.batch_active", 0U);
  const auto high_flow_signal = signals.read_bool("flow.signal.high_flow", 0U);
  expect_true(raw_signal.ok() && *raw_signal.value == "10", "raw_pulse_lifetime should publish as string");
  expect_true(lifetime_signal.ok() && approx_equal(*lifetime_signal.value, 1.0), "lifetime total signal should publish");
  expect_true(batch_active_signal.ok() && *batch_active_signal.value, "batch_active signal should publish");
  expect_true(high_flow_signal.ok() && *high_flow_signal.value, "high_flow signal should publish");

  expect_true(service.tick(2000U).ok(), "later tick should update pulse age and no-flow");
  const auto last_pulse_age_signal = signals.read_int64("flow.signal.last_pulse_age_ms", 2000U);
  const auto no_flow_signal = signals.read_bool("flow.signal.no_flow", 2000U);
  expect_true(last_pulse_age_signal.ok() && *last_pulse_age_signal.value == 2000, "last_pulse_age_ms signal should advance from last pulse time");
  expect_true(no_flow_signal.ok() && *no_flow_signal.value, "no_flow signal should assert after timeout");

  if (failures != 0) {
    std::cerr << "test_flow_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_service_signals passed\n";
  return 0;
}
