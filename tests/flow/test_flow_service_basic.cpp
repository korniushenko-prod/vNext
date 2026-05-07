#include <cmath>
#include <iostream>
#include <optional>
#include <string>

#include "flow/flow_service.hpp"
#include "hal/pulse_input_hal.hpp"
#include "signals/signal_registry.hpp"
#include "storage/storage_service.hpp"

using controller::flow::FlowDescriptor;
using controller::flow::FlowErrorCode;
using controller::flow::FlowHistoryEventType;
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

FlowDescriptor make_descriptor() {
  FlowDescriptor descriptor;
  descriptor.id = "main";
  descriptor.name = "Main flow";
  descriptor.pulse_input_id = "pulse.main";
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = FlowRateMode::time_window;
  descriptor.time_window_ms = 60000U;
  descriptor.avg_last_n_pulses = 3U;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_bucket_ms = 60000U;
  descriptor.trend_bucket_count = 10U;
  return descriptor;
}

}  // namespace

int main() {
  MockPulseInputHal hal({PulseInputChannelConfig{"pulse.main", 0U, 0.0, true}});
  expect_true(hal.initialize().ok(), "mock pulse HAL should initialize");

  InMemoryStorageBackend backend;
  StorageService storage{backend};
  SignalRegistry signals;
  FlowService service{hal, storage, signals};

  const auto descriptor = make_descriptor();
  expect_true(service.register_flowmeter(descriptor).ok(), "valid flow descriptor should register");

  const auto duplicate = service.register_flowmeter(descriptor);
  expect_true(
      !duplicate.ok() && duplicate.status.code == FlowErrorCode::flow_already_registered,
      "duplicate flow id should be rejected");

  expect_true(service.initialize_from_storage(0U).ok(), "initialize_from_storage should succeed on empty storage");
  const auto initial_snapshot = service.get_snapshot("main");
  expect_true(initial_snapshot.ok(), "snapshot should exist after initialization");
  expect_true(initial_snapshot.ok() && initial_snapshot.value->raw_pulse_lifetime == 0U, "raw pulse lifetime should start at zero");
  expect_true(initial_snapshot.ok() && approx_equal(initial_snapshot.value->lifetime_total_units, 0.0), "lifetime total should start at zero");

  expect_true(service.start_batch("main", 0U, std::nullopt, "test", "start").ok(), "batch should start");
  expect_true(hal.increment_mock_count("pulse.main", 20U).ok(), "pulse count increment should succeed");
  expect_true(service.tick(1000U).ok(), "tick should process pulse delta");

  const auto after_pulses = service.get_snapshot("main");
  expect_true(after_pulses.ok() && after_pulses.value->raw_pulse_lifetime == 20U, "raw pulse lifetime should accumulate delta pulses");
  expect_true(after_pulses.ok() && approx_equal(after_pulses.value->lifetime_total_units, 2.0), "lifetime total should convert pulses to units");
  expect_true(after_pulses.ok() && approx_equal(after_pulses.value->trip_total_units, 2.0), "trip total should follow pulse volume");
  expect_true(after_pulses.ok() && approx_equal(after_pulses.value->batch_total_units, 2.0), "batch total should increase while batch is active");

  expect_true(hal.reset_count("pulse.main").ok(), "mock pulse counter reset should succeed");
  expect_true(hal.increment_mock_count("pulse.main", 3U).ok(), "pulse count after reset should increment");
  expect_true(service.tick(2000U).ok(), "tick should handle source counter reset");

  const auto after_reset = service.get_snapshot("main");
  expect_true(after_reset.ok() && after_reset.value->raw_pulse_lifetime == 23U, "counter reset should continue counting from current HAL count");
  expect_true(after_reset.ok() && approx_equal(after_reset.value->lifetime_total_units, 2.3), "lifetime total should continue after counter reset");

  const auto history = service.read_history(std::optional<std::string>{"main"});
  bool saw_reset_event = false;
  if (history.ok()) {
    for (const auto& entry : *history.value) {
      if (entry.event_type == FlowHistoryEventType::pulse_source_reset_detected) {
        saw_reset_event = true;
      }
    }
  }
  expect_true(history.ok(), "flow history should be readable");
  expect_true(saw_reset_event, "pulse source reset should be recorded in history");

  if (failures != 0) {
    std::cerr << "test_flow_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_service_basic passed\n";
  return 0;
}
