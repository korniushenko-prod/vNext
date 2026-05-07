#include <iostream>
#include <string>
#include <vector>

#include "flow/flow_service.hpp"
#include "hal/pulse_input_hal.hpp"
#include "signals/signal_registry.hpp"
#include "storage/storage_service.hpp"

using controller::flow::FlowDescriptor;
using controller::flow::FlowErrorCode;
using controller::flow::FlowRateMode;
using controller::flow::FlowService;
using controller::hal::MockPulseInputHal;
using controller::hal::PulseInputChannelConfig;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalRegistry;
using controller::signals::SignalType;
using controller::signals::SignalValue;
using controller::storage::ByteBuffer;
using controller::storage::InMemoryStorageBackend;
using controller::storage::StorageBackend;
using controller::storage::StorageService;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

SignalDescriptor string_descriptor(std::string path) {
  return SignalDescriptor{
      std::move(path),
      "Conflicting string",
      "test",
      SignalType::string,
      "",
      "test",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
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
  descriptor.trend_bucket_ms = 1000U;
  descriptor.trend_bucket_count = 3U;
  return descriptor;
}

class FailingWriteBackend final : public StorageBackend {
 public:
  std::optional<ByteBuffer> read_record(const std::string&) const override {
    return std::nullopt;
  }

  bool write_record(const std::string& key, const ByteBuffer&) override {
    return key.rfind("totalizer:", 0U) != 0U;
  }

  bool erase_record(const std::string&) override {
    return true;
  }

  bool record_exists(const std::string&) const override {
    return false;
  }

  std::vector<std::string> list_record_keys() const override {
    return {};
  }
};

}  // namespace

int main() {
  {
    MockPulseInputHal hal({PulseInputChannelConfig{"pulse.valid", 0U, 0.0, true}});
    expect_true(hal.initialize().ok(), "mock pulse HAL should initialize");
    InMemoryStorageBackend backend;
    StorageService storage{backend};
    SignalRegistry signals;
    FlowService service{hal, storage, signals};

    auto invalid = make_descriptor("invalid", "");
    const auto invalid_register = service.register_flowmeter(invalid);
    expect_true(
        !invalid_register.ok() && invalid_register.status.code == FlowErrorCode::flow_invalid_descriptor,
        "invalid descriptor should be rejected");

    const auto missing_snapshot = service.get_snapshot("missing");
    expect_true(
        !missing_snapshot.ok() && missing_snapshot.status.code == FlowErrorCode::flow_not_found,
        "unknown flow id should return FLOW_NOT_FOUND");
  }

  {
    MockPulseInputHal hal({PulseInputChannelConfig{"pulse.corrupt", 0U, 0.0, true}});
    expect_true(hal.initialize().ok(), "mock pulse HAL should initialize for corrupt storage");
    InMemoryStorageBackend backend;
    backend.inject_record("totalizer:flow.corrupt.raw_pulse_lifetime", ByteBuffer{1U, 2U, 3U});
    StorageService storage{backend};
    SignalRegistry signals;
    FlowService service{hal, storage, signals};

    expect_true(service.register_flowmeter(make_descriptor("corrupt", "pulse.corrupt")).ok(), "corrupt flow should register");
    const auto init_result = service.initialize_from_storage(0U);
    expect_true(
        !init_result.ok() && init_result.status.code == FlowErrorCode::flow_storage_read_failed,
        "storage read failure should surface during initialization");
  }

  {
    MockPulseInputHal hal({PulseInputChannelConfig{"pulse.writefail", 0U, 0.0, true}});
    expect_true(hal.initialize().ok(), "mock pulse HAL should initialize for write failure");
    FailingWriteBackend backend;
    StorageService storage{backend};
    SignalRegistry signals;
    FlowService service{hal, storage, signals};

    expect_true(service.register_flowmeter(make_descriptor("writefail", "pulse.writefail")).ok(), "writefail flow should register");
    expect_true(service.initialize_from_storage(0U).ok(), "writefail flow should initialize");
    expect_true(hal.increment_mock_count("pulse.writefail", 10U).ok(), "writefail pulses should increment");
    const auto tick_result = service.tick(1000U);
    expect_true(
        !tick_result.ok() && tick_result.status.code == FlowErrorCode::flow_storage_write_failed,
        "storage write failure should surface on tick");
  }

  {
    MockPulseInputHal hal({PulseInputChannelConfig{"pulse.signalerr", 0U, 0.0, true}});
    expect_true(hal.initialize().ok(), "mock pulse HAL should initialize for signal conflict");
    InMemoryStorageBackend backend;
    StorageService storage{backend};
    SignalRegistry signals;
    expect_true(
        signals.register_signal(string_descriptor("flow.signalerr.lifetime_total"), SignalValue{std::string{"bad"}}, 0U).ok(),
        "conflicting signal should register");
    FlowService service{hal, storage, signals};

    expect_true(service.register_flowmeter(make_descriptor("signalerr", "pulse.signalerr")).ok(), "signalerr flow should register");
    const auto init_result = service.initialize_from_storage(0U);
    expect_true(
        !init_result.ok() && init_result.status.code == FlowErrorCode::flow_signal_publish_failed,
        "signal publication failure should surface during initialization");
  }

  {
    MockPulseInputHal hal({PulseInputChannelConfig{"pulse.batcherr", 0U, 0.0, true}});
    expect_true(hal.initialize().ok(), "mock pulse HAL should initialize for batch misuse");
    InMemoryStorageBackend backend;
    StorageService storage{backend};
    SignalRegistry signals;
    FlowService service{hal, storage, signals};

    expect_true(service.register_flowmeter(make_descriptor("batcherr", "pulse.batcherr")).ok(), "batcherr flow should register");
    expect_true(service.initialize_from_storage(0U).ok(), "batcherr flow should initialize");
    const auto stop_result = service.stop_batch("batcherr", 0U, "test", "stop idle");
    expect_true(
        !stop_result.ok() && stop_result.status.code == FlowErrorCode::flow_batch_not_active,
        "stopping an inactive batch should surface FLOW_BATCH_NOT_ACTIVE");
  }

  if (failures != 0) {
    std::cerr << "test_flow_service_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_service_errors passed\n";
  return 0;
}
