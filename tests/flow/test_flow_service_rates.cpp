#include <cmath>
#include <iostream>
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

bool approx_equal(const double lhs, const double rhs, const double epsilon = 1e-6) {
  return std::fabs(lhs - rhs) <= epsilon;
}

FlowDescriptor make_descriptor(std::string id, FlowRateMode mode) {
  FlowDescriptor descriptor;
  descriptor.id = std::move(id);
  descriptor.name = descriptor.id;
  descriptor.pulse_input_id = "pulse." + descriptor.id;
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = mode;
  descriptor.time_window_ms = 60000U;
  descriptor.avg_last_n_pulses = 3U;
  descriptor.no_flow_timeout_ms = 1000U;
  descriptor.high_flow_threshold = 20.0;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_bucket_ms = 60000U;
  descriptor.trend_bucket_count = 10U;
  return descriptor;
}

}  // namespace

int main() {
  MockPulseInputHal hal({
      PulseInputChannelConfig{"pulse.window", 0U, 0.0, true},
      PulseInputChannelConfig{"pulse.frequency", 0U, 0.0, true},
      PulseInputChannelConfig{"pulse.avg", 0U, 0.0, true},
      PulseInputChannelConfig{"pulse.idle", 0U, 0.0, true},
  });
  expect_true(hal.initialize().ok(), "mock pulse HAL should initialize");

  InMemoryStorageBackend backend;
  StorageService storage{backend};
  SignalRegistry signals;
  FlowService service{hal, storage, signals};

  expect_true(service.register_flowmeter(make_descriptor("window", FlowRateMode::time_window)).ok(), "window flow should register");
  expect_true(service.register_flowmeter(make_descriptor("frequency", FlowRateMode::pulse_frequency)).ok(), "frequency flow should register");
  expect_true(service.register_flowmeter(make_descriptor("avg", FlowRateMode::avg_last_n_pulses)).ok(), "avg flow should register");
  expect_true(service.register_flowmeter(make_descriptor("idle", FlowRateMode::time_window)).ok(), "idle flow should register");
  expect_true(service.initialize_from_storage(0U).ok(), "storage init should succeed");

  expect_true(hal.increment_mock_count("pulse.window", 30U).ok(), "window pulses should increment");
  expect_true(hal.set_mock_frequency_hz("pulse.frequency", 5.0).ok(), "frequency should be injected");
  expect_true(service.tick(1000U).ok(), "first tick should succeed");

  expect_true(hal.increment_mock_count("pulse.avg", 1U).ok(), "avg pulse 1 should increment");
  expect_true(service.tick(1000U).ok(), "avg tick 1 should succeed");
  expect_true(hal.increment_mock_count("pulse.avg", 1U).ok(), "avg pulse 2 should increment");
  expect_true(service.tick(2000U).ok(), "avg tick 2 should succeed");
  expect_true(hal.increment_mock_count("pulse.avg", 1U).ok(), "avg pulse 3 should increment");
  expect_true(service.tick(3000U).ok(), "avg tick 3 should succeed");

  const auto window = service.get_snapshot("window");
  const auto frequency = service.get_snapshot("frequency");
  const auto avg = service.get_snapshot("avg");
  const auto idle = service.get_snapshot("idle");

  expect_true(window.ok() && approx_equal(window.value->time_window_rate_units_per_min, 3.0), "time window rate should match recent window pulses");
  expect_true(window.ok() && approx_equal(window.value->current_rate_units_per_min, 3.0), "primary time window rate should be selected");

  expect_true(frequency.ok() && approx_equal(frequency.value->pulse_frequency_rate_units_per_min, 30.0), "pulse frequency rate should use HAL frequency");
  expect_true(frequency.ok() && approx_equal(frequency.value->current_rate_units_per_min, 30.0), "primary pulse frequency rate should be selected");
  expect_true(frequency.ok() && frequency.value->high_flow, "high_flow should assert when current rate exceeds threshold");

  expect_true(avg.ok() && approx_equal(avg.value->avg_n_rate_units_per_min, 6.0), "avg_last_n_pulses rate should use pulse timestamps");
  expect_true(avg.ok() && approx_equal(avg.value->current_rate_units_per_min, 6.0), "primary avg_n rate should be selected");

  expect_true(service.tick(1000U).ok(), "duplicate now tick should be tolerated");
  expect_true(service.tick(2000U).ok(), "idle timeout tick should succeed");
  const auto idle_after_timeout = service.get_snapshot("idle");
  expect_true(idle_after_timeout.ok() && idle_after_timeout.value->no_flow, "no_flow should assert after timeout even if no pulses were ever seen");

  const auto published_rate = signals.read_double("flow.frequency.rate", 3000U);
  expect_true(published_rate.ok() && approx_equal(*published_rate.value, 30.0), "published primary rate should match selected mode");

  if (failures != 0) {
    std::cerr << "test_flow_service_rates failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_service_rates passed\n";
  return 0;
}
