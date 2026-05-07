#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>

namespace controller::flow {

using FlowTimestampMs = std::uint64_t;
using FlowUpdateCounter = std::uint64_t;
using FlowHistorySequenceNumber = std::uint64_t;

enum class FlowRateMode {
  time_window,
  pulse_frequency,
  avg_last_n_pulses,
};

enum class FlowHistoryEventType {
  initialized,
  pulse_source_reset_detected,
  batch_started,
  batch_stopped,
  batch_completed,
  trip_total_reset,
  batch_total_reset,
  protected_total_save,
  protected_total_reset_denied,
};

struct RuntimeFlowState {
  bool initialized{false};
  bool pulse_source_seen{false};
  FlowTimestampMs initialized_at_ms{0U};
  std::uint64_t last_hal_count{0U};
  FlowTimestampMs last_update_ms{0U};
  FlowTimestampMs last_pulse_seen_ms{0U};
  std::uint64_t raw_pulse_lifetime{0U};
  double lifetime_total_units{0.0};
  double trip_total_units{0.0};
  double batch_total_units{0.0};
  bool batch_active{false};
  std::optional<double> batch_target_units;
  bool batch_done{false};
  double current_rate_units_per_min{0.0};
  double time_window_rate_units_per_min{0.0};
  double pulse_frequency_rate_units_per_min{0.0};
  double avg_n_rate_units_per_min{0.0};
  bool no_flow{false};
  bool high_flow{false};
  FlowTimestampMs last_pulse_age_ms{0U};
  FlowUpdateCounter update_counter{0U};
  std::optional<std::string> last_reason;
};

struct FlowTrendBucket {
  FlowTimestampMs bucket_start_ms{0U};
  double volume_delta_units{0.0};
  double average_rate_units_per_min{0.0};
};

const char* to_string(FlowRateMode mode);
const char* to_string(FlowHistoryEventType event_type);

}  // namespace controller::flow
