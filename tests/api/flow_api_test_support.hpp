#pragma once

#include <cmath>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/flow_api_service.hpp"
#include "flow/flow_service.hpp"
#include "hal/pulse_input_hal.hpp"
#include "signals/signal_registry.hpp"
#include "storage/storage_service.hpp"

namespace flow_api_test {

inline int failures = 0;

inline void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

inline bool approx_equal(const double lhs, const double rhs, const double epsilon = 1e-9) {
  return std::fabs(lhs - rhs) <= epsilon;
}

struct FlowApiTestContext {
  controller::hal::MockPulseInputHal hal;
  controller::storage::InMemoryStorageBackend backend;
  controller::storage::StorageService storage;
  controller::signals::SignalRegistry signals;
  controller::flow::FlowService flow_service;
  controller::api::FlowApiService api_service;

  explicit FlowApiTestContext(
      std::vector<controller::hal::PulseInputChannelConfig> channels = {},
      const std::size_t history_capacity = 16U)
      : hal(std::move(channels)),
        storage(backend),
        flow_service(hal, storage, signals, history_capacity),
        api_service(flow_service) {}

  bool initialize() {
    return hal.initialize().ok();
  }
};

inline controller::flow::FlowDescriptor make_descriptor(
    std::string id,
    std::string name,
    std::string pulse_input_id) {
  controller::flow::FlowDescriptor descriptor;
  descriptor.id = std::move(id);
  descriptor.name = std::move(name);
  descriptor.pulse_input_id = std::move(pulse_input_id);
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = controller::flow::FlowRateMode::time_window;
  descriptor.time_window_ms = 60000U;
  descriptor.avg_last_n_pulses = 3U;
  descriptor.no_flow_timeout_ms = 1000U;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_enabled = true;
  descriptor.trend_bucket_ms = 1000U;
  descriptor.trend_bucket_count = 8U;
  descriptor.protected_lifetime_totals = true;
  return descriptor;
}

inline controller::api::CommandContext make_command_context(
    const controller::api::ApiTimestampMs now_ms,
    std::string source = "flow_ui_test",
    std::string reason = "operator request") {
  controller::api::CommandContext context;
  context.now_ms = now_ms;
  context.source = std::move(source);
  context.reason = std::move(reason);
  context.actor = std::string{"tester"};
  return context;
}

}  // namespace flow_api_test
