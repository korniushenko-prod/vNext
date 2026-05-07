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

bool approx_equal(const double lhs, const double rhs, const double epsilon = 1e-9) {
  return std::fabs(lhs - rhs) <= epsilon;
}

}  // namespace

int main() {
  MockPulseInputHal hal({PulseInputChannelConfig{"pulse.trend", 0U, 0.0, true}});
  expect_true(hal.initialize().ok(), "mock pulse HAL should initialize");

  InMemoryStorageBackend backend;
  StorageService storage{backend};
  SignalRegistry signals;
  FlowService service{hal, storage, signals};

  FlowDescriptor descriptor;
  descriptor.id = "trend";
  descriptor.name = "Trend flow";
  descriptor.pulse_input_id = "pulse.trend";
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = FlowRateMode::time_window;
  descriptor.time_window_ms = 60000U;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_enabled = true;
  descriptor.trend_bucket_ms = 1000U;
  descriptor.trend_bucket_count = 3U;

  expect_true(service.register_flowmeter(descriptor).ok(), "trend flow should register");
  expect_true(service.initialize_from_storage(0U).ok(), "trend flow should initialize");

  expect_true(hal.increment_mock_count("pulse.trend", 10U).ok(), "bucket 0 pulses should increment");
  expect_true(service.tick(0U).ok(), "bucket 0 tick should succeed");
  expect_true(hal.increment_mock_count("pulse.trend", 20U).ok(), "bucket 1000 pulses should increment");
  expect_true(service.tick(1000U).ok(), "bucket 1000 tick should succeed");

  const auto early_trend = service.read_trend("trend");
  expect_true(early_trend.ok(), "trend should be readable");
  expect_true(early_trend.ok() && early_trend.value->size() == 2U, "trend should keep oldest-to-newest buckets as they are created");
  expect_true(early_trend.ok() && early_trend.value->at(0).bucket_start_ms == 0U, "first trend bucket should start at 0 ms");
  expect_true(early_trend.ok() && approx_equal(early_trend.value->at(0).volume_delta_units, 1.0), "bucket 0 should accumulate volume");
  expect_true(early_trend.ok() && early_trend.value->at(1).bucket_start_ms == 1000U, "second trend bucket should rotate at 1000 ms");
  expect_true(early_trend.ok() && approx_equal(early_trend.value->at(1).volume_delta_units, 2.0), "bucket 1000 should accumulate volume");

  expect_true(service.tick(4000U).ok(), "late trend tick should rotate and bound the ring buffer");
  const auto late_trend = service.read_trend("trend");
  expect_true(late_trend.ok() && late_trend.value->size() == 3U, "trend ring buffer should stay bounded");
  expect_true(late_trend.ok() && late_trend.value->at(0).bucket_start_ms == 2000U, "oldest bucket should drop first when buffer is full");
  expect_true(late_trend.ok() && late_trend.value->at(1).bucket_start_ms == 3000U, "trend ordering should remain deterministic");
  expect_true(late_trend.ok() && late_trend.value->at(2).bucket_start_ms == 4000U, "newest bucket should be last");

  if (failures != 0) {
    std::cerr << "test_flow_service_trend failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_service_trend passed\n";
  return 0;
}
