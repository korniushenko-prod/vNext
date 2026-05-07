#pragma once

#include <cstddef>
#include <deque>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "flow/flow_descriptor.hpp"
#include "flow/flow_history.hpp"
#include "flow/flow_result.hpp"
#include "flow/flow_snapshot.hpp"
#include "hal/pulse_input_hal.hpp"
#include "signals/signal_registry.hpp"
#include "storage/storage_service.hpp"

namespace controller::flow {

class FlowService {
 public:
  FlowService(
      controller::hal::PulseInputHal& pulse_input_hal,
      controller::storage::StorageService& storage_service,
      controller::signals::SignalRegistry& signal_registry,
      std::size_t history_capacity = 128U);

  FlowValidationResult validate_descriptor(
      const FlowDescriptor& descriptor,
      std::optional<std::string> existing_flow_id = std::nullopt) const;

  FlowOperationResult register_flowmeter(const FlowDescriptor& descriptor);
  bool has_flowmeter(const std::string& id) const;
  FlowResult<FlowDescriptor> get_descriptor(const std::string& id) const;
  std::vector<FlowDescriptor> list_descriptors() const;

  FlowOperationResult initialize_from_storage(FlowTimestampMs now_ms);
  FlowOperationResult tick(FlowTimestampMs now_ms);

  FlowResult<FlowSnapshot> get_snapshot(const std::string& id) const;
  std::vector<FlowSnapshot> list_snapshots() const;

  FlowResult<std::vector<FlowHistoryEntry>> read_history(std::optional<std::string> id = std::nullopt) const;
  FlowResult<std::vector<FlowTrendBucket>> read_trend(const std::string& id) const;

  FlowOperationResult start_batch(
      const std::string& id,
      FlowTimestampMs now_ms,
      std::optional<double> target_override_units,
      std::string source,
      std::string reason);
  FlowOperationResult stop_batch(
      const std::string& id,
      FlowTimestampMs now_ms,
      std::string source,
      std::string reason);
  FlowOperationResult reset_trip_total(
      const std::string& id,
      FlowTimestampMs now_ms,
      std::string source,
      std::string reason);
  FlowOperationResult reset_batch_total(
      const std::string& id,
      FlowTimestampMs now_ms,
      std::string source,
      std::string reason);

 private:
  struct FlowRecord {
    struct WindowSample {
      FlowTimestampMs timestamp_ms{0U};
      std::uint64_t pulses{0U};
    };

    struct TrendBucketState {
      FlowTrendBucket bucket;
      double rate_sum_units_per_min{0.0};
      std::uint64_t rate_sample_count{0U};
    };

    FlowDescriptor descriptor;
    RuntimeFlowState runtime;
    std::deque<WindowSample> time_window_samples;
    std::deque<FlowTimestampMs> recent_pulse_timestamps;
    std::deque<TrendBucketState> trend_buckets;
    std::uint64_t last_saved_raw_pulse_lifetime{0U};
    double last_saved_lifetime_total_units{0.0};
    FlowTimestampMs last_saved_at_ms{0U};
    std::uint64_t raw_totalizer_revision{0U};
    std::uint64_t volume_totalizer_revision{0U};
  };

  FlowRecord* find_record(const std::string& id);
  const FlowRecord* find_record(const std::string& id) const;

  FlowStatus ensure_signals_registered(const FlowDescriptor& descriptor);
  FlowStatus publish_signals(FlowRecord& record, FlowTimestampMs now_ms);
  FlowStatus load_totals_from_storage(FlowRecord& record, FlowTimestampMs now_ms);
  FlowStatus maybe_persist_totals(FlowRecord& record, FlowTimestampMs now_ms, std::uint64_t delta_pulses);
  FlowStatus update_flow_record(FlowRecord& record, FlowTimestampMs now_ms);

  FlowSnapshot build_snapshot(const FlowRecord& record) const;
  void record_history(
      const std::string& flow_id,
      FlowHistoryEventType event_type,
      FlowTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      std::optional<double> value = std::nullopt);

  controller::hal::PulseInputHal& pulse_input_hal_;
  controller::storage::StorageService& storage_service_;
  controller::signals::SignalRegistry& signal_registry_;
  FlowHistoryBuffer history_;
  std::vector<std::string> flow_order_;
  std::unordered_map<std::string, FlowRecord> flows_by_id_;
};

}  // namespace controller::flow
