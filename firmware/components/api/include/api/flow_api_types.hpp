#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/api_types.hpp"
#include "flow/flow_types.hpp"

namespace controller::api {

enum class FlowUiResultCode {
  flow_ui_ok,
  flow_ui_no_flowmeters,
  flow_ui_flow_not_found,
  flow_ui_batch_start_denied,
  flow_ui_batch_stop_denied,
  flow_ui_reset_denied,
  flow_ui_data_unavailable,
  flow_ui_invalid_argument,
  flow_ui_api_error,
};

const char* to_string(FlowUiResultCode code);

struct FlowUiStatus {
  FlowUiResultCode code{FlowUiResultCode::flow_ui_ok};
  std::string message;

  bool ok() const {
    return code == FlowUiResultCode::flow_ui_ok;
  }

  static FlowUiStatus success(std::string detail = {}) {
    return FlowUiStatus{FlowUiResultCode::flow_ui_ok, std::move(detail)};
  }

  static FlowUiStatus error(FlowUiResultCode error_code, std::string detail) {
    return FlowUiStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct FlowUiResult {
  FlowUiStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct FlowDescriptorSummaryDto {
  std::string pulse_input_id;
  double k_factor_pulses_per_unit{0.0};
  std::string primary_rate_mode;
  controller::flow::FlowTimestampMs time_window_ms{0U};
  std::size_t avg_last_n_pulses{0U};
  std::optional<controller::flow::FlowTimestampMs> no_flow_timeout_ms;
  std::optional<double> high_flow_threshold;
  bool trend_enabled{false};
  controller::flow::FlowTimestampMs trend_bucket_ms{0U};
  std::size_t trend_bucket_count{0U};
  bool protected_lifetime_totals{true};
};

struct FlowSummaryDto {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string unit;
  double current_rate{0.0};
  double lifetime_total{0.0};
  bool batch_active{false};
  bool batch_done{false};
  bool no_flow{false};
  bool high_flow{false};
  bool selected{false};
};

struct FlowStatusDto {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string unit;
  bool initialized{false};
  bool pulse_source_seen{false};
  std::string raw_pulse_lifetime;
  double lifetime_total{0.0};
  double trip_total{0.0};
  double batch_total{0.0};
  bool batch_active{false};
  bool batch_done{false};
  std::optional<double> batch_target;
  double current_rate{0.0};
  double rate_time_window{0.0};
  double rate_pulse_frequency{0.0};
  double rate_avg_n{0.0};
  bool no_flow{false};
  bool high_flow{false};
  controller::flow::FlowTimestampMs last_pulse_age_ms{0U};
  std::optional<std::string> last_reason;
  FlowDescriptorSummaryDto descriptor_summary;
};

struct TrendPointDto {
  controller::flow::FlowTimestampMs bucket_start_ms{0U};
  double volume_delta_units{0.0};
  double representative_rate_units_per_min{0.0};
};

struct FlowTrendDto {
  std::string flow_id;
  std::vector<TrendPointDto> points;
  std::string ordering;
  controller::flow::FlowTimestampMs bucket_ms{0U};
  std::size_t total_points{0U};
};

struct FlowHistoryEntryDto {
  controller::flow::FlowHistorySequenceNumber sequence_number{0U};
  std::string flow_id;
  std::string event_type;
  controller::flow::FlowTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
  std::optional<double> value;
};

struct FlowCommandResult {
  bool accepted{false};
  FlowUiStatus status{};
  std::optional<std::string> flow_id;
  std::optional<FlowStatusDto> detail;
};

}  // namespace controller::api
