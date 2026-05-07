#pragma once

#include <optional>
#include <string>
#include <vector>

#include "api/flow_api_types.hpp"
#include "flow/flow_service.hpp"

namespace controller::api {

class FlowApiService {
 public:
  explicit FlowApiService(controller::flow::FlowService& flow_service);

  FlowUiResult<std::vector<FlowSummaryDto>> list_flowmeters(ApiTimestampMs now_ms) const;
  FlowUiResult<FlowStatusDto> get_flowmeter_status(const std::string& flow_id, ApiTimestampMs now_ms) const;
  FlowUiResult<FlowStatusDto> get_active_or_default_flowmeter_status(ApiTimestampMs now_ms) const;
  FlowUiResult<FlowTrendDto> get_flowmeter_trend(const std::string& flow_id) const;
  FlowUiResult<std::vector<FlowHistoryEntryDto>> get_flowmeter_history(
      const std::string& flow_id,
      std::optional<ApiHistoryLimit> limit = std::nullopt) const;

  FlowCommandResult start_batch(
      const std::string& flow_id,
      std::optional<double> target_override,
      const CommandContext& context);
  FlowCommandResult stop_batch(const std::string& flow_id, const CommandContext& context);
  FlowCommandResult reset_batch_total(const std::string& flow_id, const CommandContext& context);
  FlowCommandResult reset_trip_total(const std::string& flow_id, const CommandContext& context);

 private:
  FlowUiStatus validate_flow_id(const std::string& flow_id) const;
  FlowUiStatus validate_command_context(const CommandContext& context) const;
  FlowUiStatus validate_history_limit(
      const std::optional<ApiHistoryLimit>& limit,
      std::size_t& effective_limit) const;
  FlowUiStatus validate_target_override(const std::optional<double>& target_override) const;

  FlowUiStatus map_flow_query_status(
      const controller::flow::FlowStatus& status,
      FlowUiResultCode fallback_code) const;
  FlowUiStatus map_flow_command_status(
      const controller::flow::FlowStatus& status,
      FlowUiResultCode denied_code) const;

  FlowSummaryDto build_summary_dto(
      const controller::flow::FlowDescriptor& descriptor,
      const controller::flow::FlowSnapshot& snapshot) const;
  FlowStatusDto build_status_dto(
      const controller::flow::FlowDescriptor& descriptor,
      const controller::flow::FlowSnapshot& snapshot) const;
  FlowTrendDto build_trend_dto(
      const controller::flow::FlowDescriptor& descriptor,
      const std::vector<controller::flow::FlowTrendBucket>& buckets) const;

  std::optional<FlowStatusDto> try_get_status(const std::string& flow_id, ApiTimestampMs now_ms) const;

  controller::flow::FlowService& flow_service_;
};

}  // namespace controller::api
