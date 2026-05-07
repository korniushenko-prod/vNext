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

}  // namespace

int main() {
  MockPulseInputHal hal({PulseInputChannelConfig{"pulse.batch", 0U, 0.0, true}});
  expect_true(hal.initialize().ok(), "mock pulse HAL should initialize");

  InMemoryStorageBackend backend;
  StorageService storage{backend};
  SignalRegistry signals;
  FlowService service{hal, storage, signals};

  FlowDescriptor descriptor;
  descriptor.id = "batch";
  descriptor.name = "Batch flow";
  descriptor.pulse_input_id = "pulse.batch";
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = FlowRateMode::time_window;
  descriptor.time_window_ms = 60000U;
  descriptor.batch_target_default = 2.0;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_bucket_ms = 60000U;
  descriptor.trend_bucket_count = 10U;

  expect_true(service.register_flowmeter(descriptor).ok(), "flow should register");
  expect_true(service.initialize_from_storage(0U).ok(), "storage init should succeed");

  expect_true(service.start_batch("batch", 0U, std::nullopt, "test", "default target").ok(), "batch should start with default target");
  const auto duplicate_start = service.start_batch("batch", 1U, std::nullopt, "test", "duplicate");
  expect_true(
      !duplicate_start.ok() && duplicate_start.status.code == FlowErrorCode::flow_batch_already_active,
      "start_batch while active should be rejected");

  expect_true(hal.increment_mock_count("pulse.batch", 10U).ok(), "batch pulses part 1 should increment");
  expect_true(service.tick(1000U).ok(), "tick for batch part 1 should succeed");
  const auto part1 = service.get_snapshot("batch");
  expect_true(part1.ok() && part1.value->batch_active, "batch should still be active below target");
  expect_true(part1.ok() && approx_equal(part1.value->batch_total_units, 1.0), "batch total should reset to zero at start and accumulate");

  expect_true(hal.increment_mock_count("pulse.batch", 10U).ok(), "batch pulses part 2 should increment");
  expect_true(service.tick(2000U).ok(), "tick for batch completion should succeed");
  const auto completed = service.get_snapshot("batch");
  expect_true(completed.ok() && !completed.value->batch_active, "batch should deactivate on completion");
  expect_true(completed.ok() && completed.value->batch_done, "batch should mark done at target");
  expect_true(completed.ok() && approx_equal(completed.value->batch_total_units, 2.0), "batch total should stop at the completed amount");

  expect_true(service.start_batch("batch", 3000U, 5.0, "test", "override target").ok(), "batch restart with override target should succeed");
  expect_true(hal.increment_mock_count("pulse.batch", 5U).ok(), "batch pulses before stop should increment");
  expect_true(service.tick(3500U).ok(), "tick before stop should succeed");
  expect_true(service.stop_batch("batch", 3600U, "test", "manual stop").ok(), "stop_batch should deactivate batch");
  const auto stopped = service.get_snapshot("batch");
  expect_true(stopped.ok() && !stopped.value->batch_active, "stopped batch should be inactive");
  expect_true(stopped.ok() && approx_equal(stopped.value->batch_total_units, 0.5), "stop_batch should not clear batch total");

  expect_true(service.reset_trip_total("batch", 3700U, "test", "trip reset").ok(), "reset_trip_total should succeed");
  expect_true(service.reset_batch_total("batch", 3800U, "test", "batch reset").ok(), "reset_batch_total should succeed");
  const auto reset_snapshot = service.get_snapshot("batch");
  expect_true(reset_snapshot.ok() && approx_equal(reset_snapshot.value->trip_total_units, 0.0), "trip total reset should clear trip total only");
  expect_true(reset_snapshot.ok() && approx_equal(reset_snapshot.value->batch_total_units, 0.0), "batch total reset should clear batch total");
  expect_true(reset_snapshot.ok() && !reset_snapshot.value->batch_done, "batch total reset should clear batch_done");

  const auto history = service.read_history(std::optional<std::string>{"batch"});
  bool saw_completed = false;
  if (history.ok()) {
    for (const auto& entry : *history.value) {
      if (entry.event_type == FlowHistoryEventType::batch_completed) {
        saw_completed = true;
      }
    }
  }
  expect_true(history.ok(), "history should be readable");
  expect_true(saw_completed, "batch completion should be recorded in history");

  if (failures != 0) {
    std::cerr << "test_flow_service_batch failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_service_batch passed\n";
  return 0;
}
