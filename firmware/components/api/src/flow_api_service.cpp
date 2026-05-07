#include "api/flow_api_service.hpp"

#include <algorithm>
#include <cstddef>
#include <cmath>
#include <utility>

namespace controller::api {

namespace {

bool has_text(const std::string& value) {
  return !value.empty();
}

bool is_positive_finite(const double value) {
  return std::isfinite(value) && value > 0.0;
}

std::string raw_pulse_text(const std::uint64_t value) {
  return std::to_string(value);
}

FlowHistoryEntryDto to_history_dto(const controller::flow::FlowHistoryEntry& entry) {
  return FlowHistoryEntryDto{
      entry.sequence_number,
      entry.flow_id,
      controller::flow::to_string(entry.event_type),
      entry.timestamp_ms,
      entry.source,
      entry.reason,
      entry.value,
  };
}

}  // namespace

const char* to_string(const FlowUiResultCode code) {
  switch (code) {
    case FlowUiResultCode::flow_ui_ok:
      return "FLOW_UI_OK";
    case FlowUiResultCode::flow_ui_no_flowmeters:
      return "FLOW_UI_NO_FLOWMETERS";
    case FlowUiResultCode::flow_ui_flow_not_found:
      return "FLOW_UI_FLOW_NOT_FOUND";
    case FlowUiResultCode::flow_ui_batch_start_denied:
      return "FLOW_UI_BATCH_START_DENIED";
    case FlowUiResultCode::flow_ui_batch_stop_denied:
      return "FLOW_UI_BATCH_STOP_DENIED";
    case FlowUiResultCode::flow_ui_reset_denied:
      return "FLOW_UI_RESET_DENIED";
    case FlowUiResultCode::flow_ui_data_unavailable:
      return "FLOW_UI_DATA_UNAVAILABLE";
    case FlowUiResultCode::flow_ui_invalid_argument:
      return "FLOW_UI_INVALID_ARGUMENT";
    case FlowUiResultCode::flow_ui_api_error:
      return "FLOW_UI_API_ERROR";
  }

  return "FLOW_UI_UNKNOWN";
}

FlowApiService::FlowApiService(controller::flow::FlowService& flow_service)
    : flow_service_(flow_service) {}

FlowUiResult<std::vector<FlowSummaryDto>> FlowApiService::list_flowmeters(const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);

  FlowUiResult<std::vector<FlowSummaryDto>> result;
  const auto descriptors = flow_service_.list_descriptors();
  const auto snapshots = flow_service_.list_snapshots();
  if (descriptors.size() != snapshots.size()) {
    result.status = FlowUiStatus::error(
        FlowUiResultCode::flow_ui_data_unavailable,
        "Flow descriptor list and snapshot list sizes do not match.");
    return result;
  }

  std::vector<FlowSummaryDto> summaries;
  summaries.reserve(descriptors.size());
  for (std::size_t index = 0; index < descriptors.size(); ++index) {
    summaries.push_back(build_summary_dto(descriptors[index], snapshots[index]));
  }

  result.status = FlowUiStatus::success(
      summaries.empty()
          ? "No flowmeters registered. Safe default: the flow bench remains unavailable until a pulse input is bound and a flowmeter is registered."
          : "Flowmeter list refreshed.");
  result.value = std::move(summaries);
  return result;
}

FlowUiResult<FlowStatusDto> FlowApiService::get_flowmeter_status(
    const std::string& flow_id,
    const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);

  FlowUiResult<FlowStatusDto> result;
  const auto id_status = validate_flow_id(flow_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  const auto descriptor = flow_service_.get_descriptor(flow_id);
  if (!descriptor.ok()) {
    result.status = map_flow_query_status(descriptor.status, FlowUiResultCode::flow_ui_flow_not_found);
    return result;
  }

  const auto snapshot = flow_service_.get_snapshot(flow_id);
  if (!snapshot.ok()) {
    result.status = map_flow_query_status(snapshot.status, FlowUiResultCode::flow_ui_data_unavailable);
    return result;
  }

  result.status = FlowUiStatus::success("Flowmeter detail refreshed.");
  result.value = build_status_dto(*descriptor.value, *snapshot.value);
  return result;
}

FlowUiResult<FlowStatusDto> FlowApiService::get_active_or_default_flowmeter_status(const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);

  FlowUiResult<FlowStatusDto> result;
  const auto snapshots = flow_service_.list_snapshots();
  if (snapshots.empty()) {
    result.status = FlowUiStatus::error(
        FlowUiResultCode::flow_ui_no_flowmeters,
        "No flowmeters are registered. Safe default: no live flow runtime is exposed until a pulse source is bound/configured.");
    return result;
  }

  return get_flowmeter_status(snapshots.front().id, now_ms);
}

FlowUiResult<FlowTrendDto> FlowApiService::get_flowmeter_trend(const std::string& flow_id) const {
  FlowUiResult<FlowTrendDto> result;
  const auto id_status = validate_flow_id(flow_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  const auto descriptor = flow_service_.get_descriptor(flow_id);
  if (!descriptor.ok()) {
    result.status = map_flow_query_status(descriptor.status, FlowUiResultCode::flow_ui_flow_not_found);
    return result;
  }

  const auto trend = flow_service_.read_trend(flow_id);
  if (!trend.ok()) {
    result.status = map_flow_query_status(trend.status, FlowUiResultCode::flow_ui_data_unavailable);
    return result;
  }

  result.status = FlowUiStatus::success("Flow trend refreshed.");
  result.value = build_trend_dto(*descriptor.value, *trend.value);
  return result;
}

FlowUiResult<std::vector<FlowHistoryEntryDto>> FlowApiService::get_flowmeter_history(
    const std::string& flow_id,
    const std::optional<ApiHistoryLimit> limit) const {
  FlowUiResult<std::vector<FlowHistoryEntryDto>> result;
  const auto id_status = validate_flow_id(flow_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  std::size_t effective_limit = 0U;
  const auto limit_status = validate_history_limit(limit, effective_limit);
  if (!limit_status.ok()) {
    result.status = limit_status;
    return result;
  }

  const auto history = flow_service_.read_history(std::optional<std::string>{flow_id});
  if (!history.ok()) {
    result.status = map_flow_query_status(history.status, FlowUiResultCode::flow_ui_data_unavailable);
    return result;
  }

  std::vector<FlowHistoryEntryDto> entries;
  entries.reserve(history.value->size());
  for (const auto& entry : *history.value) {
    entries.push_back(to_history_dto(entry));
  }

  if (entries.size() > effective_limit) {
    entries.erase(entries.begin(), entries.end() - static_cast<std::ptrdiff_t>(effective_limit));
  }

  result.status = FlowUiStatus::success("Flow history refreshed in oldest-to-newest order.");
  result.value = std::move(entries);
  return result;
}

FlowCommandResult FlowApiService::start_batch(
    const std::string& flow_id,
    const std::optional<double> target_override,
    const CommandContext& context) {
  const auto id_status = validate_flow_id(flow_id);
  if (!id_status.ok()) {
    return FlowCommandResult{false, id_status, flow_id, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return FlowCommandResult{false, context_status, flow_id, std::nullopt};
  }

  const auto target_status = validate_target_override(target_override);
  if (!target_status.ok()) {
    return FlowCommandResult{false, target_status, flow_id, try_get_status(flow_id, context.now_ms)};
  }

  const auto operation =
      flow_service_.start_batch(flow_id, context.now_ms, target_override, context.source, context.reason);
  if (!operation.ok()) {
    return FlowCommandResult{
        false,
        map_flow_command_status(operation.status, FlowUiResultCode::flow_ui_batch_start_denied),
        flow_id,
        try_get_status(flow_id, context.now_ms)};
  }

  return FlowCommandResult{
      true,
      FlowUiStatus::success("Batch start accepted for flow '" + flow_id + "'."),
      flow_id,
      try_get_status(flow_id, context.now_ms)};
}

FlowCommandResult FlowApiService::stop_batch(const std::string& flow_id, const CommandContext& context) {
  const auto id_status = validate_flow_id(flow_id);
  if (!id_status.ok()) {
    return FlowCommandResult{false, id_status, flow_id, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return FlowCommandResult{false, context_status, flow_id, std::nullopt};
  }

  const auto operation =
      flow_service_.stop_batch(flow_id, context.now_ms, context.source, context.reason);
  if (!operation.ok()) {
    return FlowCommandResult{
        false,
        map_flow_command_status(operation.status, FlowUiResultCode::flow_ui_batch_stop_denied),
        flow_id,
        try_get_status(flow_id, context.now_ms)};
  }

  return FlowCommandResult{
      true,
      FlowUiStatus::success("Batch stop accepted for flow '" + flow_id + "'."),
      flow_id,
      try_get_status(flow_id, context.now_ms)};
}

FlowCommandResult FlowApiService::reset_batch_total(const std::string& flow_id, const CommandContext& context) {
  const auto id_status = validate_flow_id(flow_id);
  if (!id_status.ok()) {
    return FlowCommandResult{false, id_status, flow_id, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return FlowCommandResult{false, context_status, flow_id, std::nullopt};
  }

  const auto operation =
      flow_service_.reset_batch_total(flow_id, context.now_ms, context.source, context.reason);
  if (!operation.ok()) {
    return FlowCommandResult{
        false,
        map_flow_command_status(operation.status, FlowUiResultCode::flow_ui_reset_denied),
        flow_id,
        try_get_status(flow_id, context.now_ms)};
  }

  return FlowCommandResult{
      true,
      FlowUiStatus::success("Batch total reset accepted for flow '" + flow_id + "'."),
      flow_id,
      try_get_status(flow_id, context.now_ms)};
}

FlowCommandResult FlowApiService::reset_trip_total(const std::string& flow_id, const CommandContext& context) {
  const auto id_status = validate_flow_id(flow_id);
  if (!id_status.ok()) {
    return FlowCommandResult{false, id_status, flow_id, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return FlowCommandResult{false, context_status, flow_id, std::nullopt};
  }

  const auto operation =
      flow_service_.reset_trip_total(flow_id, context.now_ms, context.source, context.reason);
  if (!operation.ok()) {
    return FlowCommandResult{
        false,
        map_flow_command_status(operation.status, FlowUiResultCode::flow_ui_reset_denied),
        flow_id,
        try_get_status(flow_id, context.now_ms)};
  }

  return FlowCommandResult{
      true,
      FlowUiStatus::success("Trip total reset accepted for flow '" + flow_id + "'."),
      flow_id,
      try_get_status(flow_id, context.now_ms)};
}

FlowUiStatus FlowApiService::validate_flow_id(const std::string& flow_id) const {
  if (!has_text(flow_id)) {
    return FlowUiStatus::error(
        FlowUiResultCode::flow_ui_invalid_argument,
        "flow_id must not be empty.");
  }
  return FlowUiStatus::success();
}

FlowUiStatus FlowApiService::validate_command_context(const CommandContext& context) const {
  if (!has_text(context.source)) {
    return FlowUiStatus::error(
        FlowUiResultCode::flow_ui_invalid_argument,
        "CommandContext.source must not be empty.");
  }
  if (!has_text(context.reason)) {
    return FlowUiStatus::error(
        FlowUiResultCode::flow_ui_invalid_argument,
        "CommandContext.reason must not be empty.");
  }
  return FlowUiStatus::success();
}

FlowUiStatus FlowApiService::validate_history_limit(
    const std::optional<ApiHistoryLimit>& limit,
    std::size_t& effective_limit) const {
  if (!limit.has_value()) {
    effective_limit = static_cast<std::size_t>(kDefaultHistoryLimit);
    return FlowUiStatus::success();
  }
  if (*limit < 0) {
    return FlowUiStatus::error(
        FlowUiResultCode::flow_ui_invalid_argument,
        "history limit must be zero or greater.");
  }

  effective_limit = static_cast<std::size_t>(*limit);
  return FlowUiStatus::success();
}

FlowUiStatus FlowApiService::validate_target_override(const std::optional<double>& target_override) const {
  if (target_override.has_value() && !is_positive_finite(*target_override)) {
    return FlowUiStatus::error(
        FlowUiResultCode::flow_ui_invalid_argument,
        "target_override must be finite and greater than zero.");
  }
  return FlowUiStatus::success();
}

FlowUiStatus FlowApiService::map_flow_query_status(
    const controller::flow::FlowStatus& status,
    const FlowUiResultCode fallback_code) const {
  using controller::flow::FlowErrorCode;

  switch (status.code) {
    case FlowErrorCode::ok:
      return FlowUiStatus::success();
    case FlowErrorCode::flow_not_found:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_flow_not_found, status.message);
    case FlowErrorCode::flow_invalid_argument:
    case FlowErrorCode::flow_invalid_descriptor:
    case FlowErrorCode::flow_invalid_k_factor:
    case FlowErrorCode::flow_invalid_mode_parameters:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_invalid_argument, status.message);
    case FlowErrorCode::flow_storage_read_failed:
    case FlowErrorCode::flow_storage_write_failed:
    case FlowErrorCode::flow_signal_publish_failed:
    case FlowErrorCode::flow_pulse_source_error:
    case FlowErrorCode::flow_not_initialized:
    case FlowErrorCode::flow_trend_unavailable:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_data_unavailable, status.message);
    case FlowErrorCode::flow_batch_already_active:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_batch_start_denied, status.message);
    case FlowErrorCode::flow_batch_not_active:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_batch_stop_denied, status.message);
    case FlowErrorCode::flow_already_registered:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_api_error, status.message);
  }

  return FlowUiStatus::error(fallback_code, status.message);
}

FlowUiStatus FlowApiService::map_flow_command_status(
    const controller::flow::FlowStatus& status,
    const FlowUiResultCode denied_code) const {
  using controller::flow::FlowErrorCode;

  switch (status.code) {
    case FlowErrorCode::ok:
      return FlowUiStatus::success();
    case FlowErrorCode::flow_not_found:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_flow_not_found, status.message);
    case FlowErrorCode::flow_invalid_argument:
    case FlowErrorCode::flow_invalid_descriptor:
    case FlowErrorCode::flow_invalid_k_factor:
    case FlowErrorCode::flow_invalid_mode_parameters:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_invalid_argument, status.message);
    case FlowErrorCode::flow_storage_read_failed:
    case FlowErrorCode::flow_storage_write_failed:
    case FlowErrorCode::flow_signal_publish_failed:
    case FlowErrorCode::flow_pulse_source_error:
    case FlowErrorCode::flow_not_initialized:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_data_unavailable, status.message);
    case FlowErrorCode::flow_batch_already_active:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_batch_start_denied, status.message);
    case FlowErrorCode::flow_batch_not_active:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_batch_stop_denied, status.message);
    case FlowErrorCode::flow_trend_unavailable:
    case FlowErrorCode::flow_already_registered:
      return FlowUiStatus::error(FlowUiResultCode::flow_ui_api_error, status.message);
  }

  return FlowUiStatus::error(denied_code, status.message);
}

FlowSummaryDto FlowApiService::build_summary_dto(
    const controller::flow::FlowDescriptor& descriptor,
    const controller::flow::FlowSnapshot& snapshot) const {
  FlowSummaryDto dto;
  dto.id = descriptor.id;
  dto.name = descriptor.name;
  dto.enabled = descriptor.enabled;
  dto.unit = descriptor.unit;
  dto.current_rate = snapshot.current_rate_units_per_min;
  dto.lifetime_total = snapshot.lifetime_total_units;
  dto.batch_active = snapshot.batch_active;
  dto.batch_done = snapshot.batch_done;
  dto.no_flow = snapshot.no_flow;
  dto.high_flow = snapshot.high_flow;
  return dto;
}

FlowStatusDto FlowApiService::build_status_dto(
    const controller::flow::FlowDescriptor& descriptor,
    const controller::flow::FlowSnapshot& snapshot) const {
  FlowStatusDto dto;
  dto.id = descriptor.id;
  dto.name = descriptor.name;
  dto.enabled = descriptor.enabled;
  dto.unit = descriptor.unit;
  dto.initialized = snapshot.initialized;
  dto.pulse_source_seen = snapshot.pulse_source_seen;
  dto.raw_pulse_lifetime = raw_pulse_text(snapshot.raw_pulse_lifetime);
  dto.lifetime_total = snapshot.lifetime_total_units;
  dto.trip_total = snapshot.trip_total_units;
  dto.batch_total = snapshot.batch_total_units;
  dto.batch_active = snapshot.batch_active;
  dto.batch_done = snapshot.batch_done;
  dto.batch_target = snapshot.batch_target_units;
  dto.current_rate = snapshot.current_rate_units_per_min;
  dto.rate_time_window = snapshot.time_window_rate_units_per_min;
  dto.rate_pulse_frequency = snapshot.pulse_frequency_rate_units_per_min;
  dto.rate_avg_n = snapshot.avg_n_rate_units_per_min;
  dto.no_flow = snapshot.no_flow;
  dto.high_flow = snapshot.high_flow;
  dto.last_pulse_age_ms = snapshot.last_pulse_age_ms;
  dto.last_reason = snapshot.last_reason;
  dto.descriptor_summary = FlowDescriptorSummaryDto{
      descriptor.pulse_input_id,
      descriptor.k_factor_pulses_per_unit,
      controller::flow::to_string(descriptor.primary_rate_mode),
      descriptor.time_window_ms,
      descriptor.avg_last_n_pulses,
      descriptor.no_flow_timeout_ms,
      descriptor.high_flow_threshold,
      descriptor.trend_enabled,
      descriptor.trend_bucket_ms,
      descriptor.trend_bucket_count,
      descriptor.protected_lifetime_totals,
  };
  return dto;
}

FlowTrendDto FlowApiService::build_trend_dto(
    const controller::flow::FlowDescriptor& descriptor,
    const std::vector<controller::flow::FlowTrendBucket>& buckets) const {
  FlowTrendDto dto;
  dto.flow_id = descriptor.id;
  dto.ordering = "oldest_to_newest";
  dto.bucket_ms = descriptor.trend_bucket_ms;
  dto.total_points = buckets.size();
  dto.points.reserve(buckets.size());
  for (const auto& bucket : buckets) {
    dto.points.push_back(TrendPointDto{
        bucket.bucket_start_ms,
        bucket.volume_delta_units,
        bucket.average_rate_units_per_min,
    });
  }
  return dto;
}

std::optional<FlowStatusDto> FlowApiService::try_get_status(
    const std::string& flow_id,
    const ApiTimestampMs now_ms) const {
  const auto result = get_flowmeter_status(flow_id, now_ms);
  if (!result.ok()) {
    return std::nullopt;
  }
  return result.value;
}

}  // namespace controller::api
