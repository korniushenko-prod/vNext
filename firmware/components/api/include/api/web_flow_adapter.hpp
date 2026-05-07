#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "api/flow_api_service.hpp"

namespace controller::api {

struct FlowBadgeViewModel {
  std::string key;
  std::string label;
  std::string tone;
  bool active{false};
  std::string detail;
};

struct WebFlowListItemViewModel {
  std::string id;
  std::string name;
  bool selected{false};
  bool enabled{true};
  std::string current_rate_text;
  std::string lifetime_total_text;
  std::vector<FlowBadgeViewModel> badges;
};

struct WebFlowListViewModel {
  std::vector<WebFlowListItemViewModel> items;
  std::size_t total_count{0U};
  std::size_t active_batch_count{0U};
  std::size_t attention_count{0U};
  bool has_flowmeters{false};
  std::optional<std::string> selected_flow_id;
  std::string empty_state_message;
};

struct FlowTrendChartPointViewModel {
  ApiTimestampMs bucket_start_ms{0U};
  double volume_delta_units{0.0};
  double representative_rate_units_per_min{0.0};
  double volume_ratio{0.0};
  double rate_ratio{0.0};
  std::string bucket_label;
};

struct FlowTrendChartViewModel {
  std::string flow_id;
  std::string ordering;
  ApiTimestampMs bucket_ms{0U};
  std::size_t total_points{0U};
  bool has_data{false};
  std::string empty_message;
  double max_volume{0.0};
  double max_rate{0.0};
  std::vector<FlowTrendChartPointViewModel> points;
};

struct FlowHistoryItemViewModel {
  std::uint64_t sequence_number{0U};
  std::string event_type;
  ApiTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
  std::string value_text;
  std::string headline;
  std::string supporting_text;
};

struct FlowDescriptorRowViewModel {
  std::string label;
  std::string value;
  std::string note;
};

struct FlowBatchControlViewModel {
  bool can_start{false};
  bool can_stop{false};
  bool can_reset_batch_total{false};
  bool can_reset_trip_total{false};
  std::string start_reason;
  std::string stop_reason;
  std::string batch_target_text;
};

struct WebFlowDetailViewModel {
  FlowStatusDto status;
  std::string runtime_state_label;
  std::string runtime_state_tone;
  std::string runtime_state_detail;
  std::string prominent_rate_value;
  std::string prominent_rate_unit;
  std::string lifetime_total_text;
  std::string trip_total_text;
  std::string batch_total_text;
  std::string raw_pulse_lifetime_text;
  std::string last_pulse_age_text;
  std::vector<FlowBadgeViewModel> badges;
  FlowTrendChartViewModel trend;
  std::vector<FlowHistoryItemViewModel> history;
  bool history_empty{true};
  std::string history_empty_message;
  std::vector<FlowDescriptorRowViewModel> descriptor_rows;
  bool descriptor_read_only{true};
  std::string descriptor_note;
  FlowBatchControlViewModel batch_controls;
};

template <typename T>
struct FlowViewResponse {
  bool success{false};
  FlowUiResultCode code{FlowUiResultCode::flow_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<T> value;
};

struct WebFlowCommandResponse {
  bool accepted{false};
  FlowUiResultCode code{FlowUiResultCode::flow_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<WebFlowListViewModel> list;
  std::optional<WebFlowDetailViewModel> detail;
};

class WebFlowAdapter {
 public:
  explicit WebFlowAdapter(FlowApiService& flow_api_service);

  FlowViewResponse<WebFlowListViewModel> load_flow_list(
      ApiTimestampMs now_ms,
      std::optional<std::string> selected_flow_id = std::nullopt) const;
  FlowViewResponse<WebFlowDetailViewModel> load_flow_detail(
      std::optional<std::string> flow_id,
      ApiTimestampMs now_ms,
      std::optional<ApiHistoryLimit> history_limit = std::nullopt) const;
  FlowViewResponse<FlowTrendChartViewModel> load_flow_trend(const std::string& flow_id, ApiTimestampMs now_ms) const;
  FlowViewResponse<std::vector<FlowHistoryItemViewModel>> load_flow_history(
      const std::string& flow_id,
      ApiTimestampMs now_ms,
      std::optional<ApiHistoryLimit> limit = std::nullopt) const;

  WebFlowCommandResponse start_batch(
      const std::string& flow_id,
      std::optional<double> target_override,
      const CommandContext& context);
  WebFlowCommandResponse stop_batch(const std::string& flow_id, const CommandContext& context);
  WebFlowCommandResponse reset_batch_total(const std::string& flow_id, const CommandContext& context);
  WebFlowCommandResponse reset_trip_total(const std::string& flow_id, const CommandContext& context);

  static WebFlowListViewModel build_list_view_model(
      const std::vector<FlowSummaryDto>& flows,
      std::optional<std::string> selected_flow_id = std::nullopt);
  static FlowTrendChartViewModel build_trend_view_model(const FlowTrendDto& trend);
  static std::vector<FlowHistoryItemViewModel> build_history_view_model(
      const std::vector<FlowHistoryEntryDto>& history);
  static WebFlowDetailViewModel build_detail_view_model(
      const FlowStatusDto& status,
      const FlowTrendDto& trend,
      const std::vector<FlowHistoryEntryDto>& history);

 private:
  static FlowViewResponse<WebFlowListViewModel> make_list_error(
      FlowUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms);
  static FlowViewResponse<WebFlowDetailViewModel> make_detail_error(
      FlowUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms);
  static FlowViewResponse<FlowTrendChartViewModel> make_trend_error(
      FlowUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms);
  static FlowViewResponse<std::vector<FlowHistoryItemViewModel>> make_history_error(
      FlowUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms);

  WebFlowCommandResponse build_command_response(
      const FlowCommandResult& result,
      std::optional<std::string> flow_id,
      ApiTimestampMs now_ms);

  FlowApiService& flow_api_service_;
};

}  // namespace controller::api
