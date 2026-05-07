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
using controller::storage::make_raw_pulse_totalizer;
using controller::storage::make_volume_totalizer;

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

FlowDescriptor make_descriptor(std::string id, std::string pulse_input_id) {
  FlowDescriptor descriptor;
  descriptor.id = std::move(id);
  descriptor.name = descriptor.id;
  descriptor.pulse_input_id = std::move(pulse_input_id);
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = FlowRateMode::time_window;
  descriptor.time_window_ms = 60000U;
  descriptor.save_every_pulses = 10U;
  descriptor.trend_bucket_ms = 60000U;
  descriptor.trend_bucket_count = 10U;
  return descriptor;
}

}  // namespace

int main() {
  {
    MockPulseInputHal hal({PulseInputChannelConfig{"pulse.stored", 0U, 0.0, true}});
    expect_true(hal.initialize().ok(), "mock pulse HAL should initialize");

    InMemoryStorageBackend backend;
    StorageService storage{backend};
    SignalRegistry signals;
    FlowService service{hal, storage, signals};

    expect_true(storage.write_protected_totalizer(make_raw_pulse_totalizer("flow.stored.raw_pulse_lifetime", 45U, true)).success, "seed raw totalizer should write");
    expect_true(storage.write_protected_totalizer(make_volume_totalizer("flow.stored.lifetime_total", 4.5, true)).success, "seed volume totalizer should write");

    expect_true(service.register_flowmeter(make_descriptor("stored", "pulse.stored")).ok(), "stored flow should register");
    expect_true(service.initialize_from_storage(0U).ok(), "storage init should load protected totals");

    const auto snapshot = service.get_snapshot("stored");
    expect_true(snapshot.ok() && snapshot.value->raw_pulse_lifetime == 45U, "stored raw pulse lifetime should load from storage");
    expect_true(snapshot.ok() && approx_equal(snapshot.value->lifetime_total_units, 4.5), "stored lifetime volume should load from storage");
  }

  {
    MockPulseInputHal hal({PulseInputChannelConfig{"pulse.save", 0U, 0.0, true}});
    expect_true(hal.initialize().ok(), "mock pulse HAL should initialize for save policy");

    InMemoryStorageBackend backend;
    StorageService storage{backend};
    SignalRegistry signals;
    FlowService service{hal, storage, signals};

    expect_true(service.register_flowmeter(make_descriptor("save", "pulse.save")).ok(), "save flow should register");
    expect_true(service.initialize_from_storage(0U).ok(), "save flow should initialize");

    expect_true(hal.increment_mock_count("pulse.save", 5U).ok(), "first half of save threshold should increment");
    expect_true(service.tick(1000U).ok(), "first tick should succeed");
    const auto before_save = storage.read_protected_totalizer("flow.save.raw_pulse_lifetime");
    expect_true(!before_save.value.has_value(), "protected totals should not save before save_every_pulses threshold");

    expect_true(hal.increment_mock_count("pulse.save", 5U).ok(), "second half of save threshold should increment");
    expect_true(service.tick(2000U).ok(), "second tick should persist totals");
    const auto after_raw = storage.read_protected_totalizer("flow.save.raw_pulse_lifetime");
    const auto after_volume = storage.read_protected_totalizer("flow.save.lifetime_total");
    expect_true(after_raw.value.has_value() && after_raw.value->pulse_value == 10U, "raw protected total should save at threshold");
    expect_true(after_volume.value.has_value() && approx_equal(after_volume.value->volume_value, 1.0), "volume protected total should save at threshold");
  }

  {
    MockPulseInputHal hal1({PulseInputChannelConfig{"pulse.persist", 0U, 0.0, true}});
    expect_true(hal1.initialize().ok(), "mock pulse HAL should initialize for persistence");

    InMemoryStorageBackend backend;
    StorageService storage{backend};
    SignalRegistry signals1;
    FlowService service1{hal1, storage, signals1};

    expect_true(service1.register_flowmeter(make_descriptor("persist", "pulse.persist")).ok(), "persist flow should register");
    expect_true(service1.initialize_from_storage(0U).ok(), "persist flow should initialize");
    expect_true(hal1.increment_mock_count("pulse.persist", 10U).ok(), "persist pulses should increment");
    expect_true(service1.tick(1000U).ok(), "persist tick should save totals");

    expect_true(storage.factory_reset().success, "factory reset should succeed");

    MockPulseInputHal hal2({PulseInputChannelConfig{"pulse.persist", 0U, 0.0, true}});
    expect_true(hal2.initialize().ok(), "second pulse HAL should initialize");
    SignalRegistry signals2;
    FlowService service2{hal2, storage, signals2};
    expect_true(service2.register_flowmeter(make_descriptor("persist", "pulse.persist")).ok(), "persist flow should register after reset");
    expect_true(service2.initialize_from_storage(0U).ok(), "persist flow should load after factory reset");

    const auto persisted_snapshot = service2.get_snapshot("persist");
    expect_true(persisted_snapshot.ok() && persisted_snapshot.value->raw_pulse_lifetime == 10U, "protected raw total should survive factory reset");
    expect_true(persisted_snapshot.ok() && approx_equal(persisted_snapshot.value->lifetime_total_units, 1.0), "protected volume total should survive factory reset");
  }

  if (failures != 0) {
    std::cerr << "test_flow_service_storage failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_service_storage passed\n";
  return 0;
}
