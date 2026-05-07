#include "api/web_flow_adapter.hpp"

#include <algorithm>
#include <iomanip>
#include <sstream>
#include <utility>

namespace controller::api {

namespace {

std::string format_double(const double value, const int precision = 2) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(precision) << value;
  return stream.str();
}

std::string format_rate(const double value, const std::string& unit) {
  return format_double(value) + " " + unit + "/min";
}

std::string format_total(const double value, const std::string& unit) {
  return format_double(value) + " " + unit;
}

std::string format_ms(const ApiTimestampMs value) {
  return std::to_string(value) + " ms";
}

FlowBadgeViewModel make_badge(
    std::string key,
    std::string label,
    std::string tone,
    const bool active,
    std::string detail = {}) {
  return FlowBadgeViewModel{
      std::move(key),
      std::move(label),
      std::move(tone),
      active,
      std::move(detail),
  };
}

std::vector<FlowBadgeViewModel> build_badges(const FlowStatusDto& status) {
  std::vector<FlowBadgeViewModel> badges;
  badges.push_back(make_badge(
      "protected_lifetime",
      "Protected lifetime",
      status.descriptor_summary.protected_lifetime_totals ? "info" : "muted",
      status.descriptor_summary.protected_lifetime_totals,
      "Lifetime total is read-only in this stage."));
  badges.push_back(make_badge("batch_active", "Batch active", status.batch_active ? "ok" : "muted", status.batch_active));
  badges.push_back(make_badge("batch_done", "Batch done", status.batch_done ? "warn" : "muted", status.batch_done));
  badges.push_back(make_badge("no_flow", "No flow", status.no_flow ? "danger" : "muted", status.no_flow));
  badges.push_back(make_badge("high_flow", "High flow", status.high_flow ? "warn" : "muted", status.high_flow));
  badges.push_back(make_badge("enabled", status.enabled ? "Enabled" : "Disabled", status.enabled ? "ok" : "danger", status.enabled));
  return badges;
}

std::vector<FlowBadgeViewModel> build_list_badges(const FlowSummaryDto& summary) {
  std::vector<FlowBadgeViewModel> badges;
  if (summary.batch_active) {
    badges.push_back(make_badge("batch_active", "Batch active", "ok", true));
  }
  if (summary.batch_done) {
    badges.push_back(make_badge("batch_done", "Batch done", "warn", true));
  }
  if (summary.no_flow) {
    badges.push_back(make_badge("no_flow", "No flow", "danger", true));
  }
  if (summary.high_flow) {
    badges.push_back(make_badge("high_flow", "High flow", "warn", true));
  }
  if (!summary.enabled) {
    badges.push_back(make_badge("disabled", "Disabled", "danger", true));
  }
  if (badges.empty()) {
    badges.push_back(make_badge("healthy", "Watching", "muted", false));
  }
  return badges;
}

struct DerivedRuntimeState {
  std::string label;
  std::string tone;
  std::string detail;
};

DerivedRuntimeState derive_runtime_state(const FlowStatusDto& status) {
  if (!status.initialized) {
    return {"Not initialized", "danger", "Flow runtime exists but has not completed storage initialization yet."};
  }

  const bool has_pulses = status.raw_pulse_lifetime != "0";
  if (!has_pulses && status.batch_active) {
    return {"Batch armed", "info", "Batch is active and waiting for the first pulse from the bound fixture."};
  }

  if (!has_pulses) {
    return {"Waiting for pulses", "info", "Flow is configured, but the bound pulse input has not counted any pulses yet."};
  }

  if (status.current_rate > 0.0) {
    return {"Live flow", "ok", "Pulses are arriving and the runtime is calculating a live flow rate."};
  }

  if (status.no_flow) {
    return {"Configured but idle", "warn", "The flowmeter is configured, but no pulses arrived within the no-flow timeout."};
  }

  return {"Configured and idle", "info", "The flowmeter is configured and retained totals are present, but the current rate is idle."};
}

}  // namespace

WebFlowAdapter::WebFlowAdapter(FlowApiService& flow_api_service)
    : flow_api_service_(flow_api_service) {}

FlowViewResponse<WebFlowListViewModel> WebFlowAdapter::load_flow_list(
    const ApiTimestampMs now_ms,
    const std::optional<std::string> selected_flow_id) const {
  const auto result = flow_api_service_.list_flowmeters(now_ms);
  if (!result.ok()) {
    return make_list_error(result.status.code, result.status.message, now_ms);
  }

  FlowViewResponse<WebFlowListViewModel> response;
  response.success = true;
  response.code = result.value->empty() ? FlowUiResultCode::flow_ui_no_flowmeters : result.status.code;
  response.message = result.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_list_view_model(*result.value, selected_flow_id);
  return response;
}

FlowViewResponse<WebFlowDetailViewModel> WebFlowAdapter::load_flow_detail(
    std::optional<std::string> flow_id,
    const ApiTimestampMs now_ms,
    const std::optional<ApiHistoryLimit> history_limit) const {
  FlowUiResult<FlowStatusDto> status_result;
  if (!flow_id.has_value() || flow_id->empty()) {
    status_result = flow_api_service_.get_active_or_default_flowmeter_status(now_ms);
  } else {
    status_result = flow_api_service_.get_flowmeter_status(*flow_id, now_ms);
  }

  if (!status_result.ok()) {
    return make_detail_error(status_result.status.code, status_result.status.message, now_ms);
  }

  const auto trend_result = flow_api_service_.get_flowmeter_trend(status_result.value->id);
  if (!trend_result.ok()) {
    return make_detail_error(trend_result.status.code, trend_result.status.message, now_ms);
  }

  const auto history_result = flow_api_service_.get_flowmeter_history(status_result.value->id, history_limit);
  if (!history_result.ok()) {
    return make_detail_error(history_result.status.code, history_result.status.message, now_ms);
  }

  FlowViewResponse<WebFlowDetailViewModel> response;
  response.success = true;
  response.code = status_result.status.code;
  response.message = status_result.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_detail_view_model(*status_result.value, *trend_result.value, *history_result.value);
  return response;
}

FlowViewResponse<FlowTrendChartViewModel> WebFlowAdapter::load_flow_trend(
    const std::string& flow_id,
    const ApiTimestampMs now_ms) const {
  const auto trend = flow_api_service_.get_flowmeter_trend(flow_id);
  if (!trend.ok()) {
    return make_trend_error(trend.status.code, trend.status.message, now_ms);
  }

  FlowViewResponse<FlowTrendChartViewModel> response;
  response.success = true;
  response.code = trend.status.code;
  response.message = trend.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_trend_view_model(*trend.value);
  return response;
}

FlowViewResponse<std::vector<FlowHistoryItemViewModel>> WebFlowAdapter::load_flow_history(
    const std::string& flow_id,
    const ApiTimestampMs now_ms,
    const std::optional<ApiHistoryLimit> limit) const {
  const auto history = flow_api_service_.get_flowmeter_history(flow_id, limit);
  if (!history.ok()) {
    return make_history_error(history.status.code, history.status.message, now_ms);
  }

  FlowViewResponse<std::vector<FlowHistoryItemViewModel>> response;
  response.success = true;
  response.code = history.status.code;
  response.message = history.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_history_view_model(*history.value);
  return response;
}

WebFlowCommandResponse WebFlowAdapter::start_batch(
    const std::string& flow_id,
    const std::optional<double> target_override,
    const CommandContext& context) {
  return build_command_response(flow_api_service_.start_batch(flow_id, target_override, context), flow_id, context.now_ms);
}

WebFlowCommandResponse WebFlowAdapter::stop_batch(const std::string& flow_id, const CommandContext& context) {
  return build_command_response(flow_api_service_.stop_batch(flow_id, context), flow_id, context.now_ms);
}

WebFlowCommandResponse WebFlowAdapter::reset_batch_total(
    const std::string& flow_id,
    const CommandContext& context) {
  return build_command_response(flow_api_service_.reset_batch_total(flow_id, context), flow_id, context.now_ms);
}

WebFlowCommandResponse WebFlowAdapter::reset_trip_total(
    const std::string& flow_id,
    const CommandContext& context) {
  return build_command_response(flow_api_service_.reset_trip_total(flow_id, context), flow_id, context.now_ms);
}

WebFlowListViewModel WebFlowAdapter::build_list_view_model(
    const std::vector<FlowSummaryDto>& flows,
    const std::optional<std::string> selected_flow_id) {
  WebFlowListViewModel view_model;
  view_model.total_count = flows.size();
  view_model.has_flowmeters = !flows.empty();
  view_model.selected_flow_id = selected_flow_id;
  if (flows.empty()) {
    view_model.empty_state_message =
        "No flowmeters are registered. Safe default: bind a low-voltage pulse test input before exposing a live flow bench path.";
  }

  if (!view_model.selected_flow_id.has_value() && !flows.empty()) {
    view_model.selected_flow_id = flows.front().id;
  }

  for (const auto& flow : flows) {
    WebFlowListItemViewModel item;
    item.id = flow.id;
    item.name = flow.name;
    item.selected = view_model.selected_flow_id == std::optional<std::string>{flow.id};
    item.enabled = flow.enabled;
    item.current_rate_text = format_rate(flow.current_rate, flow.unit);
    item.lifetime_total_text = format_total(flow.lifetime_total, flow.unit);
    item.badges = build_list_badges(flow);

    if (flow.batch_active) {
      ++view_model.active_batch_count;
    }
    if (flow.no_flow || flow.high_flow) {
      ++view_model.attention_count;
    }

    view_model.items.push_back(std::move(item));
  }

  return view_model;
}

FlowTrendChartViewModel WebFlowAdapter::build_trend_view_model(const FlowTrendDto& trend) {
  FlowTrendChartViewModel view_model;
  view_model.flow_id = trend.flow_id;
  view_model.ordering = trend.ordering;
  view_model.bucket_ms = trend.bucket_ms;
  view_model.total_points = trend.total_points;
  view_model.has_data = !trend.points.empty();
  view_model.empty_message = trend.points.empty() ? "No trend data yet." : "";

  for (const auto& point : trend.points) {
    view_model.max_volume = std::max(view_model.max_volume, point.volume_delta_units);
    view_model.max_rate = std::max(view_model.max_rate, point.representative_rate_units_per_min);
  }

  for (const auto& point : trend.points) {
    view_model.points.push_back(FlowTrendChartPointViewModel{
        point.bucket_start_ms,
        point.volume_delta_units,
        point.representative_rate_units_per_min,
        view_model.max_volume > 0.0 ? point.volume_delta_units / view_model.max_volume : 0.0,
        view_model.max_rate > 0.0 ? point.representative_rate_units_per_min / view_model.max_rate : 0.0,
        format_ms(point.bucket_start_ms),
    });
  }

  return view_model;
}

std::vector<FlowHistoryItemViewModel> WebFlowAdapter::build_history_view_model(
    const std::vector<FlowHistoryEntryDto>& history) {
  std::vector<FlowHistoryItemViewModel> items;
  items.reserve(history.size());
  for (const auto& entry : history) {
    items.push_back(FlowHistoryItemViewModel{
        entry.sequence_number,
        entry.event_type,
        entry.timestamp_ms,
        entry.source,
        entry.reason,
        entry.value.has_value() ? format_double(*entry.value) : std::string{},
        entry.event_type + " at " + format_ms(entry.timestamp_ms),
        entry.source + ": " + entry.reason,
    });
  }
  return items;
}

WebFlowDetailViewModel WebFlowAdapter::build_detail_view_model(
    const FlowStatusDto& status,
    const FlowTrendDto& trend,
    const std::vector<FlowHistoryEntryDto>& history) {
  WebFlowDetailViewModel view_model;
  view_model.status = status;
  const auto runtime_state = derive_runtime_state(status);
  view_model.runtime_state_label = runtime_state.label;
  view_model.runtime_state_tone = runtime_state.tone;
  view_model.runtime_state_detail = runtime_state.detail;
  view_model.prominent_rate_value = format_double(status.current_rate);
  view_model.prominent_rate_unit = status.unit + "/min";
  view_model.lifetime_total_text = format_total(status.lifetime_total, status.unit);
  view_model.trip_total_text = format_total(status.trip_total, status.unit);
  view_model.batch_total_text = format_total(status.batch_total, status.unit);
  view_model.raw_pulse_lifetime_text = status.raw_pulse_lifetime + " pulses";
  view_model.last_pulse_age_text = format_ms(status.last_pulse_age_ms);
  view_model.badges = build_badges(status);
  view_model.trend = build_trend_view_model(trend);
  view_model.history = build_history_view_model(history);
  view_model.history_empty = view_model.history.empty();
  view_model.history_empty_message = view_model.history.empty() ? "No recent history." : std::string{};
  view_model.descriptor_read_only = true;
  view_model.descriptor_note =
      "Descriptor editing is postponed until a shared config-adapter layer exists. This summary is read-only.";
  view_model.batch_controls.can_start = status.enabled && !status.batch_active;
  view_model.batch_controls.can_stop = status.batch_active;
  view_model.batch_controls.can_reset_batch_total = status.initialized;
  view_model.batch_controls.can_reset_trip_total = status.initialized;
  view_model.batch_controls.start_reason = status.batch_active
                                               ? "Batch is already active."
                                               : "Start batch with descriptor default target or an override.";
  view_model.batch_controls.stop_reason =
      status.batch_active ? "Stop the active batch without clearing the total." : "Batch is not active.";
  view_model.batch_controls.batch_target_text =
      status.batch_target.has_value() ? format_total(*status.batch_target, status.unit) : "Descriptor default";

  view_model.descriptor_rows = {
      {"Pulse input", status.descriptor_summary.pulse_input_id, ""},
      {"K-factor", format_double(status.descriptor_summary.k_factor_pulses_per_unit), "pulses per unit"},
      {"Primary rate mode", status.descriptor_summary.primary_rate_mode, ""},
      {"Time window", format_ms(status.descriptor_summary.time_window_ms), ""},
      {"Average last N pulses", std::to_string(status.descriptor_summary.avg_last_n_pulses), ""},
      {"No-flow timeout",
       status.descriptor_summary.no_flow_timeout_ms.has_value() ? format_ms(*status.descriptor_summary.no_flow_timeout_ms)
                                                                : std::string{"disabled"},
       ""},
      {"High-flow threshold",
       status.descriptor_summary.high_flow_threshold.has_value() ? format_double(*status.descriptor_summary.high_flow_threshold)
                                                                 : std::string{"not configured"},
       status.unit + "/min"},
      {"Trend enabled", status.descriptor_summary.trend_enabled ? "Yes" : "No", ""},
      {"Trend bucket", format_ms(status.descriptor_summary.trend_bucket_ms), ""},
      {"Trend buckets", std::to_string(status.descriptor_summary.trend_bucket_count), ""},
      {"Protected lifetime totals",
       status.descriptor_summary.protected_lifetime_totals ? "Yes" : "No",
       "Lifetime total cannot be reset from this UI."},
  };

  return view_model;
}

FlowViewResponse<WebFlowListViewModel> WebFlowAdapter::make_list_error(
    const FlowUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms) {
  FlowViewResponse<WebFlowListViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  return response;
}

FlowViewResponse<WebFlowDetailViewModel> WebFlowAdapter::make_detail_error(
    const FlowUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms) {
  FlowViewResponse<WebFlowDetailViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  return response;
}

FlowViewResponse<FlowTrendChartViewModel> WebFlowAdapter::make_trend_error(
    const FlowUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms) {
  FlowViewResponse<FlowTrendChartViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  return response;
}

FlowViewResponse<std::vector<FlowHistoryItemViewModel>> WebFlowAdapter::make_history_error(
    const FlowUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms) {
  FlowViewResponse<std::vector<FlowHistoryItemViewModel>> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  return response;
}

WebFlowCommandResponse WebFlowAdapter::build_command_response(
    const FlowCommandResult& result,
    const std::optional<std::string> flow_id,
    const ApiTimestampMs now_ms) {
  WebFlowCommandResponse response;
  response.accepted = result.accepted;
  response.code = result.status.code;
  response.message = result.status.message;
  response.refresh_timestamp_ms = now_ms;

  const auto list = load_flow_list(now_ms, flow_id);
  if (list.success && list.value.has_value()) {
    response.list = *list.value;
  }

  const auto effective_flow_id = result.flow_id.has_value() ? result.flow_id : flow_id;
  if (effective_flow_id.has_value()) {
    const auto detail = load_flow_detail(effective_flow_id, now_ms);
    if (detail.success && detail.value.has_value()) {
      response.detail = *detail.value;
    }
  }

  return response;
}

}  // namespace controller::api
