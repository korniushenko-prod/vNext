#include "web/web_route_service.hpp"

#include <cstdlib>
#include <memory>
#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "cJSON.h"
#include "esp_log.h"
#include "web/web_asset_registry.hpp"

namespace controller::web {

namespace {

constexpr char kLogTag[] = "stage28_web";
constexpr std::size_t kHttpServerTaskStackBytes = 12288U;

using controller::api::ApiTimestampMs;
using controller::api::CommandContext;
using controller::api::DashboardAlarmEntry;
using controller::api::DashboardCommandResponse;
using controller::api::DashboardDataResponse;
using controller::api::DashboardProgramOption;
using controller::api::DashboardTransitionCandidate;
using controller::api::FlowBadgeViewModel;
using controller::api::FlowHistoryItemViewModel;
using controller::api::FlowTrendChartPointViewModel;
using controller::api::FlowTrendChartViewModel;
using controller::api::FlowViewResponse;
using controller::api::RulesViewResponse;
using controller::api::RuleValidationIssueDto;
using controller::api::TraceLineViewModel;
using controller::api::WebFlowCommandResponse;
using controller::api::WebFlowDetailViewModel;
using controller::api::WebFlowListItemViewModel;
using controller::api::WebFlowListViewModel;
using controller::api::WebRuleDetailViewModel;
using controller::api::WebRulesListViewModel;

template <typename T>
using CJsonPtr = std::unique_ptr<T, decltype(&cJSON_Delete)>;

std::string strip_query(const char* uri) {
  const std::string value = uri == nullptr ? std::string{} : std::string{uri};
  const auto query_index = value.find('?');
  return query_index == std::string::npos ? value : value.substr(0, query_index);
}

std::vector<std::string_view> split_path_segments(const std::string& uri) {
  std::vector<std::string_view> parts;
  const std::string_view view{uri};
  std::size_t index = 0U;
  while (index < view.size() && view[index] == '/') {
    ++index;
  }
  while (index < view.size()) {
    const auto next = view.find('/', index);
    if (next == std::string_view::npos) {
      parts.push_back(view.substr(index));
      break;
    }
    parts.push_back(view.substr(index, next - index));
    index = next + 1U;
  }
  return parts;
}

const char* http_status_text(const int status) {
  switch (status) {
    case 200:
      return "200 OK";
    case 400:
      return "400 Bad Request";
    case 404:
      return "404 Not Found";
    case 500:
    default:
      return "500 Internal Server Error";
  }
}

void add_string(cJSON* object, const char* key, const std::string& value) {
  cJSON_AddStringToObject(object, key, value.c_str());
}

void add_optional_string(cJSON* object, const char* key, const std::optional<std::string>& value) {
  if (value.has_value()) {
    cJSON_AddStringToObject(object, key, value->c_str());
  } else {
    cJSON_AddNullToObject(object, key);
  }
}

void add_optional_bool(cJSON* object, const char* key, const std::optional<bool>& value) {
  if (value.has_value()) {
    cJSON_AddBoolToObject(object, key, *value);
  } else {
    cJSON_AddNullToObject(object, key);
  }
}

void add_optional_double(cJSON* object, const char* key, const std::optional<double>& value) {
  if (value.has_value()) {
    cJSON_AddNumberToObject(object, key, *value);
  } else {
    cJSON_AddNullToObject(object, key);
  }
}

void add_optional_u64(cJSON* object, const char* key, const std::optional<std::uint64_t>& value) {
  if (value.has_value()) {
    cJSON_AddNumberToObject(object, key, static_cast<double>(*value));
  } else {
    cJSON_AddNullToObject(object, key);
  }
}

WebResult make_json_result(cJSON* root, const int http_status = 200) {
  WebResult result;
  result.http_status = http_status;
  char* rendered = cJSON_PrintUnformatted(root);
  result.body = rendered != nullptr ? std::string{rendered} : std::string{"{}"};
  if (rendered != nullptr) {
    cJSON_free(rendered);
  }
  return result;
}

WebResult make_error_result(const int http_status, const char* code, const std::string& message) {
  CJsonPtr<cJSON> root(cJSON_CreateObject(), cJSON_Delete);
  cJSON_AddBoolToObject(root.get(), "success", false);
  cJSON_AddStringToObject(root.get(), "code", code);
  cJSON_AddStringToObject(root.get(), "message", message.c_str());
  cJSON_AddNumberToObject(root.get(), "refresh_timestamp_ms", 0);
  return make_json_result(root.get(), http_status);
}

std::optional<std::string> read_request_body(httpd_req_t* req, std::string& error_message) {
  std::string body;
  body.resize(req->content_len > 0 ? static_cast<std::size_t>(req->content_len) : 0U);
  int received_total = 0;
  while (received_total < req->content_len) {
    const int received = httpd_req_recv(
        req,
        body.data() + received_total,
        static_cast<std::size_t>(req->content_len - received_total));
    if (received <= 0) {
      error_message = "Failed to read request body.";
      return std::nullopt;
    }
    received_total += received;
  }
  return body;
}

std::optional<double> parse_optional_number(const cJSON* parent, const char* key) {
  if (parent == nullptr) {
    return std::nullopt;
  }
  const cJSON* item = cJSON_GetObjectItemCaseSensitive(parent, key);
  if (item == nullptr || cJSON_IsNull(item)) {
    return std::nullopt;
  }
  return cJSON_IsNumber(item) ? std::optional<double>{item->valuedouble} : std::nullopt;
}

std::string parse_optional_string(const cJSON* parent, const char* key, std::string fallback = {}) {
  if (parent == nullptr) {
    return fallback;
  }
  const cJSON* item = cJSON_GetObjectItemCaseSensitive(parent, key);
  if (cJSON_IsString(item) && item->valuestring != nullptr) {
    return item->valuestring;
  }
  return fallback;
}

CommandContext parse_command_context(
    const cJSON* root,
    const ApiTimestampMs fallback_now_ms,
    const std::string& fallback_source,
    const std::string& fallback_reason) {
  CommandContext context;
  context.now_ms = fallback_now_ms;
  context.source = fallback_source;
  context.reason = fallback_reason;
  context.actor = std::string{"mechanic"};

  const cJSON* context_json = root == nullptr ? nullptr : cJSON_GetObjectItemCaseSensitive(root, "context");
  if (context_json != nullptr) {
    const cJSON* now_ms = cJSON_GetObjectItemCaseSensitive(context_json, "now_ms");
    if (cJSON_IsNumber(now_ms) && now_ms->valuedouble >= 0.0) {
      context.now_ms = static_cast<ApiTimestampMs>(now_ms->valuedouble);
    }
    const auto source = parse_optional_string(context_json, "source", context.source);
    const auto reason = parse_optional_string(context_json, "reason", context.reason);
    const auto actor = parse_optional_string(context_json, "actor", context.actor.value_or("mechanic"));
    context.source = source.empty() ? fallback_source : source;
    context.reason = reason.empty() ? fallback_reason : reason;
    context.actor = actor;
  }

  return context;
}

void add_flow_badges(cJSON* object, const std::vector<FlowBadgeViewModel>& badges) {
  cJSON* array = cJSON_AddArrayToObject(object, "badges");
  for (const auto& badge : badges) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "key", badge.key);
    add_string(item, "label", badge.label);
    add_string(item, "tone", badge.tone);
    cJSON_AddBoolToObject(item, "active", badge.active);
    add_string(item, "detail", badge.detail);
    cJSON_AddItemToArray(array, item);
  }
}

void add_rule_validation_issues(cJSON* object, const std::vector<RuleValidationIssueDto>& issues) {
  cJSON* array = cJSON_AddArrayToObject(object, "validation_issues");
  for (const auto& issue : issues) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "path", issue.path);
    add_string(item, "code", issue.code);
    add_string(item, "message", issue.message);
    cJSON_AddItemToArray(array, item);
  }
}

cJSON* serialize_dashboard_data_response(const DashboardDataResponse& response) {
  cJSON* root = cJSON_CreateObject();
  cJSON_AddBoolToObject(root, "success", response.success);
  cJSON_AddStringToObject(root, "code", controller::api::to_string(response.code));
  add_string(root, "message", response.message);
  cJSON_AddNumberToObject(root, "refresh_timestamp_ms", static_cast<double>(response.refresh_timestamp_ms));

  cJSON* warnings = cJSON_AddArrayToObject(root, "warnings");
  for (const auto& warning : response.warnings) {
    cJSON_AddItemToArray(warnings, cJSON_CreateString(warning.c_str()));
  }

  cJSON* dashboard = cJSON_AddObjectToObject(root, "dashboard");
  cJSON* registered_programs = cJSON_AddArrayToObject(dashboard, "registered_programs");
  for (const DashboardProgramOption& option : response.dashboard.registered_programs) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "id", option.id);
    add_string(item, "name", option.name);
    add_string(item, "type", option.type);
    cJSON_AddBoolToObject(item, "enabled", option.enabled);
    cJSON_AddBoolToObject(item, "is_active", option.is_active);
    add_string(item, "lifecycle", option.lifecycle);
    add_optional_string(item, "current_state_id", option.current_state_id);
    add_optional_string(item, "current_state_name", option.current_state_name);
    cJSON_AddBoolToObject(item, "lockout", option.lockout);
    cJSON_AddBoolToObject(item, "can_start", option.can_start);
    add_string(item, "start_reason", option.start_reason);
    cJSON_AddItemToArray(registered_programs, item);
  }

  add_optional_string(dashboard, "selected_program_id", response.dashboard.selected_program_id);
  add_optional_string(dashboard, "active_program_id", response.dashboard.active_program_id);
  add_string(dashboard, "active_program_name", response.dashboard.active_program_name);
  add_string(dashboard, "lifecycle", response.dashboard.lifecycle);
  add_optional_string(dashboard, "current_state_id", response.dashboard.current_state_id);
  add_optional_string(dashboard, "current_state_name", response.dashboard.current_state_name);
  add_string(dashboard, "current_state_type", response.dashboard.current_state_type);
  cJSON_AddNumberToObject(dashboard, "state_elapsed_ms", static_cast<double>(response.dashboard.state_elapsed_ms));
  add_optional_string(dashboard, "next_transition_target_state_id", response.dashboard.next_transition_target_state_id);
  add_optional_string(dashboard, "next_transition_target_state_name", response.dashboard.next_transition_target_state_name);
  add_string(dashboard, "next_transition_reason", response.dashboard.next_transition_reason);
  cJSON_AddBoolToObject(dashboard, "pending_normal_stop", response.dashboard.pending_normal_stop);
  cJSON_AddBoolToObject(dashboard, "pending_trip", response.dashboard.pending_trip);
  cJSON_AddBoolToObject(dashboard, "lockout", response.dashboard.lockout);
  cJSON_AddBoolToObject(dashboard, "can_start", response.dashboard.can_start);
  cJSON_AddBoolToObject(dashboard, "can_stop", response.dashboard.can_stop);
  cJSON_AddBoolToObject(dashboard, "can_trip", response.dashboard.can_trip);
  cJSON_AddBoolToObject(dashboard, "can_reset", response.dashboard.can_reset);
  add_string(dashboard, "start_reason", response.dashboard.start_reason);
  add_string(dashboard, "stop_reason", response.dashboard.stop_reason);
  add_string(dashboard, "trip_reason", response.dashboard.trip_reason);
  add_string(dashboard, "reset_reason", response.dashboard.reset_reason);
  add_string(dashboard, "last_reason", response.dashboard.last_reason);

  const auto add_transition_array = [&](const char* key, const std::vector<DashboardTransitionCandidate>& items) {
    cJSON* array = cJSON_AddArrayToObject(dashboard, key);
    for (const auto& candidate : items) {
      cJSON* item = cJSON_CreateObject();
      add_string(item, "transition_id", candidate.transition_id);
      add_string(item, "target_state_id", candidate.target_state_id);
      add_optional_string(item, "target_state_name", candidate.target_state_name);
      cJSON_AddBoolToObject(item, "eligible", candidate.eligible);
      add_string(item, "reason", candidate.reason);
      cJSON_AddBoolToObject(item, "min_time_satisfied", candidate.min_time_satisfied);
      add_optional_bool(item, "condition_effective_result", candidate.condition_effective_result);
      cJSON_AddItemToArray(array, item);
    }
  };
  add_transition_array("transition_candidates", response.dashboard.transition_candidates);
  add_transition_array("blocked_transitions", response.dashboard.blocked_transitions);

  cJSON_AddBoolToObject(dashboard, "alarms_any_active", response.dashboard.alarms_any_active);
  cJSON_AddNumberToObject(dashboard, "alarms_active_count", static_cast<double>(response.dashboard.alarms_active_count));
  add_string(dashboard, "alarms_highest_severity", response.dashboard.alarms_highest_severity);
  cJSON_AddBoolToObject(dashboard, "alarms_trip_active", response.dashboard.alarms_trip_active);
  cJSON_AddBoolToObject(dashboard, "alarms_safety_active", response.dashboard.alarms_safety_active);

  cJSON* alarm_entries = cJSON_AddArrayToObject(dashboard, "active_alarm_entries");
  for (const DashboardAlarmEntry& entry : response.dashboard.active_alarm_entries) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "id", entry.id);
    add_string(item, "severity", entry.severity);
    cJSON_AddBoolToObject(item, "active", entry.active);
    cJSON_AddItemToArray(alarm_entries, item);
  }

  cJSON* actuator_summaries = cJSON_AddArrayToObject(dashboard, "actuator_summaries");
  for (const auto& summary : response.dashboard.actuator_summaries) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "id", summary.id);
    add_string(item, "kind", summary.kind);
    add_string(item, "role", summary.role);
    cJSON_AddBoolToObject(item, "is_on", summary.is_on);
    cJSON_AddBoolToObject(item, "safe_fallback", summary.safe_fallback);
    add_string(item, "owner", summary.owner);
    add_string(item, "reason", summary.reason);
    add_string(item, "priority", summary.priority);
    add_string(item, "state_text", summary.state_text);
    add_string(item, "emphasis", summary.emphasis);
    add_optional_bool(item, "relay_on", summary.relay_on);
    add_optional_bool(item, "pwm_enabled", summary.pwm_enabled);
    add_optional_double(item, "pwm_duty_percent", summary.pwm_duty_percent);
    cJSON_AddItemToArray(actuator_summaries, item);
  }

  cJSON* recent_history = cJSON_AddArrayToObject(dashboard, "recent_history");
  for (const auto& entry : response.dashboard.recent_history) {
    cJSON* item = cJSON_CreateObject();
    cJSON_AddNumberToObject(item, "timestamp_ms", static_cast<double>(entry.timestamp_ms));
    add_string(item, "event_type", entry.event_type);
    add_optional_string(item, "from_state", entry.from_state);
    add_optional_string(item, "to_state", entry.to_state);
    add_string(item, "reason", entry.reason);
    add_string(item, "source", entry.source);
    cJSON_AddItemToArray(recent_history, item);
  }

  return root;
}

cJSON* serialize_dashboard_command_response(const DashboardCommandResponse& response) {
  cJSON* root = cJSON_CreateObject();
  cJSON_AddBoolToObject(root, "accepted", response.accepted);
  cJSON_AddStringToObject(root, "code", controller::api::to_string(response.code));
  add_string(root, "message", response.message);
  cJSON_AddBoolToObject(root, "refresh_recommended", response.refresh_recommended);
  if (response.updated_dashboard.has_value()) {
    cJSON_AddItemToObject(root, "updated_dashboard", serialize_dashboard_data_response(*response.updated_dashboard));
  } else {
    cJSON_AddNullToObject(root, "updated_dashboard");
  }
  return root;
}

cJSON* serialize_flow_list_model(const WebFlowListViewModel& model) {
  cJSON* root = cJSON_CreateObject();
  cJSON* items = cJSON_AddArrayToObject(root, "items");
  for (const WebFlowListItemViewModel& item_view : model.items) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "id", item_view.id);
    add_string(item, "name", item_view.name);
    cJSON_AddBoolToObject(item, "selected", item_view.selected);
    cJSON_AddBoolToObject(item, "enabled", item_view.enabled);
    add_string(item, "current_rate_text", item_view.current_rate_text);
    add_string(item, "lifetime_total_text", item_view.lifetime_total_text);
    add_flow_badges(item, item_view.badges);
    cJSON_AddItemToArray(items, item);
  }
  cJSON_AddNumberToObject(root, "total_count", static_cast<double>(model.total_count));
  cJSON_AddNumberToObject(root, "active_batch_count", static_cast<double>(model.active_batch_count));
  cJSON_AddNumberToObject(root, "attention_count", static_cast<double>(model.attention_count));
  cJSON_AddBoolToObject(root, "has_flowmeters", model.has_flowmeters);
  add_optional_string(root, "selected_flow_id", model.selected_flow_id);
  add_string(root, "empty_state_message", model.empty_state_message);
  return root;
}

cJSON* serialize_flow_status_model(const WebFlowDetailViewModel& model) {
  cJSON* root = cJSON_CreateObject();
  add_string(root, "runtime_state_label", model.runtime_state_label);
  add_string(root, "runtime_state_tone", model.runtime_state_tone);
  add_string(root, "runtime_state_detail", model.runtime_state_detail);
  cJSON* status = cJSON_AddObjectToObject(root, "status");
  add_string(status, "id", model.status.id);
  add_string(status, "name", model.status.name);
  cJSON_AddBoolToObject(status, "enabled", model.status.enabled);
  add_string(status, "unit", model.status.unit);
  cJSON_AddBoolToObject(status, "initialized", model.status.initialized);
  cJSON_AddBoolToObject(status, "pulse_source_seen", model.status.pulse_source_seen);
  add_string(status, "raw_pulse_lifetime", model.status.raw_pulse_lifetime);
  cJSON_AddNumberToObject(status, "lifetime_total", model.status.lifetime_total);
  cJSON_AddNumberToObject(status, "trip_total", model.status.trip_total);
  cJSON_AddNumberToObject(status, "batch_total", model.status.batch_total);
  cJSON_AddBoolToObject(status, "batch_active", model.status.batch_active);
  cJSON_AddBoolToObject(status, "batch_done", model.status.batch_done);
  add_optional_double(status, "batch_target", model.status.batch_target);
  cJSON_AddNumberToObject(status, "current_rate", model.status.current_rate);
  cJSON_AddNumberToObject(status, "rate_time_window", model.status.rate_time_window);
  cJSON_AddNumberToObject(status, "rate_pulse_frequency", model.status.rate_pulse_frequency);
  cJSON_AddNumberToObject(status, "rate_avg_n", model.status.rate_avg_n);
  cJSON_AddBoolToObject(status, "no_flow", model.status.no_flow);
  cJSON_AddBoolToObject(status, "high_flow", model.status.high_flow);
  cJSON_AddNumberToObject(status, "last_pulse_age_ms", static_cast<double>(model.status.last_pulse_age_ms));
  add_optional_string(status, "last_reason", model.status.last_reason);

  cJSON* descriptor = cJSON_AddObjectToObject(status, "descriptor_summary");
  add_string(descriptor, "pulse_input_id", model.status.descriptor_summary.pulse_input_id);
  cJSON_AddNumberToObject(
      descriptor,
      "k_factor_pulses_per_unit",
      model.status.descriptor_summary.k_factor_pulses_per_unit);
  add_string(descriptor, "primary_rate_mode", model.status.descriptor_summary.primary_rate_mode);
  cJSON_AddNumberToObject(descriptor, "time_window_ms", static_cast<double>(model.status.descriptor_summary.time_window_ms));
  cJSON_AddNumberToObject(
      descriptor,
      "avg_last_n_pulses",
      static_cast<double>(model.status.descriptor_summary.avg_last_n_pulses));
  add_optional_u64(descriptor, "no_flow_timeout_ms", model.status.descriptor_summary.no_flow_timeout_ms);
  add_optional_double(descriptor, "high_flow_threshold", model.status.descriptor_summary.high_flow_threshold);
  cJSON_AddBoolToObject(descriptor, "trend_enabled", model.status.descriptor_summary.trend_enabled);
  cJSON_AddNumberToObject(
      descriptor,
      "trend_bucket_ms",
      static_cast<double>(model.status.descriptor_summary.trend_bucket_ms));
  cJSON_AddNumberToObject(
      descriptor,
      "trend_bucket_count",
      static_cast<double>(model.status.descriptor_summary.trend_bucket_count));
  cJSON_AddBoolToObject(
      descriptor,
      "protected_lifetime_totals",
      model.status.descriptor_summary.protected_lifetime_totals);
  return root;
}

cJSON* serialize_flow_trend_model(const FlowTrendChartViewModel& model) {
  cJSON* root = cJSON_CreateObject();
  add_string(root, "flow_id", model.flow_id);
  add_string(root, "ordering", model.ordering);
  cJSON_AddNumberToObject(root, "bucket_ms", static_cast<double>(model.bucket_ms));
  cJSON_AddNumberToObject(root, "total_points", static_cast<double>(model.total_points));
  cJSON_AddBoolToObject(root, "has_data", model.has_data);
  add_string(root, "empty_message", model.empty_message);
  cJSON_AddNumberToObject(root, "max_volume", model.max_volume);
  cJSON_AddNumberToObject(root, "max_rate", model.max_rate);
  cJSON* points = cJSON_AddArrayToObject(root, "points");
  for (const FlowTrendChartPointViewModel& point : model.points) {
    cJSON* item = cJSON_CreateObject();
    cJSON_AddNumberToObject(item, "bucket_start_ms", static_cast<double>(point.bucket_start_ms));
    cJSON_AddNumberToObject(item, "volume_delta_units", point.volume_delta_units);
    cJSON_AddNumberToObject(
        item,
        "representative_rate_units_per_min",
        point.representative_rate_units_per_min);
    cJSON_AddNumberToObject(item, "volume_ratio", point.volume_ratio);
    cJSON_AddNumberToObject(item, "rate_ratio", point.rate_ratio);
    add_string(item, "bucket_label", point.bucket_label);
    cJSON_AddItemToArray(points, item);
  }
  return root;
}

cJSON* serialize_flow_history_items(const std::vector<FlowHistoryItemViewModel>& items) {
  cJSON* array = cJSON_CreateArray();
  for (const auto& entry : items) {
    cJSON* item = cJSON_CreateObject();
    cJSON_AddNumberToObject(item, "sequence_number", static_cast<double>(entry.sequence_number));
    add_string(item, "event_type", entry.event_type);
    cJSON_AddNumberToObject(item, "timestamp_ms", static_cast<double>(entry.timestamp_ms));
    add_string(item, "source", entry.source);
    add_string(item, "reason", entry.reason);
    add_string(item, "value_text", entry.value_text);
    add_string(item, "headline", entry.headline);
    add_string(item, "supporting_text", entry.supporting_text);
    cJSON_AddItemToArray(array, item);
  }
  return array;
}

template <typename T>
cJSON* serialize_flow_view_response(const FlowViewResponse<T>& response, cJSON* (*value_serializer)(const T&)) {
  cJSON* root = cJSON_CreateObject();
  cJSON_AddBoolToObject(root, "success", response.success);
  cJSON_AddStringToObject(root, "code", controller::api::to_string(response.code));
  add_string(root, "message", response.message);
  cJSON_AddNumberToObject(root, "refresh_timestamp_ms", static_cast<double>(response.refresh_timestamp_ms));
  if (response.value.has_value()) {
    cJSON_AddItemToObject(root, "value", value_serializer(*response.value));
  } else {
    cJSON_AddNullToObject(root, "value");
  }
  return root;
}

cJSON* serialize_flow_command_response(const WebFlowCommandResponse& response) {
  cJSON* root = cJSON_CreateObject();
  cJSON_AddBoolToObject(root, "accepted", response.accepted);
  cJSON_AddStringToObject(root, "code", controller::api::to_string(response.code));
  add_string(root, "message", response.message);
  cJSON_AddNumberToObject(root, "refresh_timestamp_ms", static_cast<double>(response.refresh_timestamp_ms));
  if (response.list.has_value()) {
    cJSON_AddItemToObject(root, "list", serialize_flow_list_model(*response.list));
  } else {
    cJSON_AddNullToObject(root, "list");
  }
  if (response.detail.has_value()) {
    cJSON_AddItemToObject(root, "detail", serialize_flow_status_model(*response.detail));
  } else {
    cJSON_AddNullToObject(root, "detail");
  }
  return root;
}

cJSON* serialize_rules_list_model(const WebRulesListViewModel& model) {
  cJSON* root = cJSON_CreateObject();
  cJSON_AddNumberToObject(root, "total_count", static_cast<double>(model.total_count));
  cJSON_AddNumberToObject(root, "active_count", static_cast<double>(model.active_count));
  cJSON_AddNumberToObject(root, "disabled_count", static_cast<double>(model.disabled_count));
  cJSON_AddNumberToObject(root, "error_count", static_cast<double>(model.error_count));
  cJSON* cards = cJSON_AddArrayToObject(root, "cards");
  for (const auto& card : model.cards) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "id", card.id);
    add_string(item, "name", card.name);
    cJSON_AddBoolToObject(item, "enabled", card.enabled);
    cJSON_AddBoolToObject(item, "active", card.active);
    add_string(item, "status", card.status);
    cJSON_AddNumberToObject(item, "activation_count", static_cast<double>(card.activation_count));
    cJSON_AddNumberToObject(item, "last_transition_ms", static_cast<double>(card.last_transition_ms));
    add_string(item, "last_reason", card.last_reason);
    add_optional_string(item, "last_error", card.last_error);
    add_string(item, "if_summary", card.if_summary);
    add_string(item, "then_summary", card.then_summary);
    add_optional_string(item, "else_summary", card.else_summary);
    cJSON_AddItemToArray(cards, item);
  }
  return root;
}

cJSON* serialize_rules_detail_model(const WebRuleDetailViewModel& model) {
  cJSON* root = cJSON_CreateObject();
  cJSON* metadata = cJSON_AddObjectToObject(root, "metadata");
  add_string(metadata, "id", model.metadata.id);
  add_string(metadata, "name", model.metadata.name);
  cJSON_AddBoolToObject(metadata, "enabled", model.metadata.enabled);
  add_string(metadata, "description", model.metadata.description);
  cJSON* current_status = cJSON_AddObjectToObject(root, "current_status");
  cJSON_AddBoolToObject(current_status, "enabled", model.current_status.enabled);
  cJSON_AddBoolToObject(current_status, "active", model.current_status.active);
  add_string(current_status, "status", model.current_status.status);
  cJSON_AddNumberToObject(current_status, "activation_count", static_cast<double>(model.current_status.activation_count));
  cJSON_AddNumberToObject(current_status, "last_transition_ms", static_cast<double>(model.current_status.last_transition_ms));
  add_string(current_status, "last_reason", model.current_status.last_reason);
  add_optional_string(current_status, "last_error", model.current_status.last_error);

  add_string(root, "if_summary", model.if_summary);
  add_string(root, "then_summary", model.then_summary);
  add_optional_string(root, "else_summary", model.else_summary);

  cJSON* trace_lines = cJSON_AddArrayToObject(root, "trace_lines");
  for (const TraceLineViewModel& line : model.trace_lines) {
    cJSON* item = cJSON_CreateObject();
    add_string(item, "node_id", line.node_id);
    add_string(item, "node_kind", line.node_kind);
    cJSON_AddBoolToObject(item, "raw_result", line.raw_result);
    cJSON_AddBoolToObject(item, "effective_result", line.effective_result);
    add_string(item, "error_code", line.error_code);
    add_string(item, "reason", line.reason);
    add_string(item, "signal_path", line.signal_path);
    add_string(item, "value_summary", line.value_summary);
    cJSON_AddItemToArray(trace_lines, item);
  }

  add_rule_validation_issues(root, model.validation_issues);
  return root;
}

template <typename T>
cJSON* serialize_rules_view_response(const RulesViewResponse<T>& response, cJSON* (*value_serializer)(const T&)) {
  cJSON* root = cJSON_CreateObject();
  cJSON_AddBoolToObject(root, "success", response.success);
  cJSON_AddStringToObject(root, "code", controller::api::to_string(response.code));
  add_string(root, "message", response.message);
  cJSON_AddNumberToObject(root, "refresh_timestamp_ms", static_cast<double>(response.refresh_timestamp_ms));
  if (response.value.has_value()) {
    cJSON_AddItemToObject(root, "value", value_serializer(*response.value));
  } else {
    cJSON_AddNullToObject(root, "value");
  }
  return root;
}

}  // namespace

WebRouteService::WebRouteService(WebServerConfig config, WebRouteDependencies dependencies)
    : config_(config),
      dependencies_(std::move(dependencies)) {}

bool WebRouteService::start(std::string& error_message) {
  if (!config_.enabled) {
    error_message = "Web server disabled.";
    return false;
  }
  if (dependencies_.dashboard_adapter == nullptr || dependencies_.flow_adapter == nullptr ||
      dependencies_.rules_adapter == nullptr || !dependencies_.now_ms_fn) {
    error_message = "Web route dependencies are incomplete.";
    return false;
  }

  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = config_.port;
  config.stack_size = kHttpServerTaskStackBytes;
  config.max_uri_handlers = 24;
  config.uri_match_fn = httpd_uri_match_wildcard;
  if (httpd_start(&server_, &config) != ESP_OK) {
    error_message = "httpd_start failed.";
    server_ = nullptr;
    return false;
  }

  const httpd_uri_t routes[] = {
      {"/", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/index.html", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/dashboard.css", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/dashboard.js", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/flow", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/flow.css", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/flow.js", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/rules", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/rules.css", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/rules.js", HTTP_GET, &WebRouteService::handle_asset, this},
      {"/api/dashboard/data", HTTP_GET, &WebRouteService::handle_dashboard_data, this},
      {"/api/dashboard/start", HTTP_POST, &WebRouteService::handle_dashboard_start, this},
      {"/api/dashboard/stop", HTTP_POST, &WebRouteService::handle_dashboard_stop, this},
      {"/api/dashboard/trip", HTTP_POST, &WebRouteService::handle_dashboard_trip, this},
      {"/api/dashboard/reset", HTTP_POST, &WebRouteService::handle_dashboard_reset, this},
      {"/api/flow/*", HTTP_GET, &WebRouteService::handle_flow_route, this},
      {"/api/flow/*", HTTP_POST, &WebRouteService::handle_flow_route, this},
      {"/api/rules/list", HTTP_GET, &WebRouteService::handle_rules_route, this},
      {"/api/rules/*", HTTP_GET, &WebRouteService::handle_rules_route, this},
  };

  for (const auto& route : routes) {
    if (httpd_register_uri_handler(server_, &route) != ESP_OK) {
      error_message = std::string{"Failed to register route "} + route.uri;
      stop();
      return false;
    }
  }

  ESP_LOGI(
      kLogTag,
      "HTTP server started on port %u with %u byte stack (%s, rules read-only)",
      static_cast<unsigned>(config_.port),
      static_cast<unsigned>(config.stack_size),
      config_.bench_mode ? "BENCH MODE" : "normal safe mode");
  return true;
}

void WebRouteService::stop() {
  if (server_ != nullptr) {
    httpd_stop(server_);
    server_ = nullptr;
  }
}

bool WebRouteService::started() const {
  return server_ != nullptr;
}

esp_err_t WebRouteService::handle_asset(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_asset(req);
}

esp_err_t WebRouteService::handle_dashboard_data(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_dashboard_data(req);
}

esp_err_t WebRouteService::handle_dashboard_start(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_dashboard_start(req);
}

esp_err_t WebRouteService::handle_dashboard_stop(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_dashboard_stop(req);
}

esp_err_t WebRouteService::handle_dashboard_trip(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_dashboard_trip(req);
}

esp_err_t WebRouteService::handle_dashboard_reset(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_dashboard_reset(req);
}

esp_err_t WebRouteService::handle_flow_route(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_flow_route(req);
}

esp_err_t WebRouteService::handle_rules_route(httpd_req_t* req) {
  const auto* self = static_cast<WebRouteService*>(req->user_ctx);
  return self->serve_rules_route(req);
}

esp_err_t WebRouteService::serve_asset(httpd_req_t* req) const {
  const auto asset = WebAssetRegistry::find(strip_query(req->uri));
  if (!asset.has_value()) {
    return send_result(req, make_error_result(404, "WEB_NOT_FOUND", "Asset route not found."));
  }

  httpd_resp_set_status(req, http_status_text(200));
  httpd_resp_set_type(req, asset->content_type);
  return httpd_resp_send(req, asset->data, static_cast<ssize_t>(asset->size));
}

esp_err_t WebRouteService::serve_dashboard_data(httpd_req_t* req) const {
  const auto response = dependencies_.dashboard_adapter->get_dashboard_data(dependencies_.now_ms_fn());
  CJsonPtr<cJSON> root(serialize_dashboard_data_response(response), cJSON_Delete);
  return send_result(req, make_json_result(root.get()));
}

esp_err_t WebRouteService::serve_dashboard_start(httpd_req_t* req) const {
  std::string error_message;
  const auto body = read_request_body(req, error_message);
  if (!body.has_value()) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", error_message));
  }
  CJsonPtr<cJSON> json(cJSON_Parse(body->c_str()), cJSON_Delete);
  if (!json) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", "Invalid JSON body."));
  }
  const auto program_id = parse_optional_string(json.get(), "program_id");
  if (program_id.empty()) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", "program_id is required."));
  }
  const auto context =
      parse_command_context(json.get(), dependencies_.now_ms_fn(), "web_dashboard", "dashboard start");
  const auto response = dependencies_.dashboard_adapter->post_start(program_id, context);
  CJsonPtr<cJSON> root(serialize_dashboard_command_response(response), cJSON_Delete);
  return send_result(req, make_json_result(root.get()));
}

esp_err_t WebRouteService::serve_dashboard_stop(httpd_req_t* req) const {
  std::string error_message;
  const auto body = read_request_body(req, error_message);
  if (!body.has_value()) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", error_message));
  }
  CJsonPtr<cJSON> json(cJSON_Parse(body->c_str()), cJSON_Delete);
  if (!json) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", "Invalid JSON body."));
  }
  const auto context =
      parse_command_context(json.get(), dependencies_.now_ms_fn(), "web_dashboard", "dashboard normal stop");
  const auto response = dependencies_.dashboard_adapter->post_stop(context);
  CJsonPtr<cJSON> root(serialize_dashboard_command_response(response), cJSON_Delete);
  return send_result(req, make_json_result(root.get()));
}

esp_err_t WebRouteService::serve_dashboard_trip(httpd_req_t* req) const {
  std::string error_message;
  const auto body = read_request_body(req, error_message);
  if (!body.has_value()) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", error_message));
  }
  CJsonPtr<cJSON> json(cJSON_Parse(body->c_str()), cJSON_Delete);
  if (!json) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", "Invalid JSON body."));
  }
  const auto context =
      parse_command_context(json.get(), dependencies_.now_ms_fn(), "web_dashboard", "dashboard trip");
  const auto response = dependencies_.dashboard_adapter->post_trip(context);
  CJsonPtr<cJSON> root(serialize_dashboard_command_response(response), cJSON_Delete);
  return send_result(req, make_json_result(root.get()));
}

esp_err_t WebRouteService::serve_dashboard_reset(httpd_req_t* req) const {
  std::string error_message;
  const auto body = read_request_body(req, error_message);
  if (!body.has_value()) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", error_message));
  }
  CJsonPtr<cJSON> json(cJSON_Parse(body->c_str()), cJSON_Delete);
  if (!json) {
    return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", "Invalid JSON body."));
  }
  const auto context =
      parse_command_context(json.get(), dependencies_.now_ms_fn(), "web_dashboard", "dashboard reset");
  const auto response = dependencies_.dashboard_adapter->post_reset(context);
  CJsonPtr<cJSON> root(serialize_dashboard_command_response(response), cJSON_Delete);
  return send_result(req, make_json_result(root.get()));
}

esp_err_t WebRouteService::serve_flow_route(httpd_req_t* req) const {
  const std::string uri = strip_query(req->uri);
  if (uri == "/api/flow/list" && req->method == HTTP_GET) {
    const auto response = dependencies_.flow_adapter->load_flow_list(dependencies_.now_ms_fn());
    CJsonPtr<cJSON> root(serialize_flow_view_response(response, &serialize_flow_list_model), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }

  const auto segments = split_path_segments(uri);
  if (segments.size() < 4U || segments[0] != "api" || segments[1] != "flow") {
    return send_result(req, make_error_result(404, "WEB_NOT_FOUND", "Flow route not found."));
  }
  const std::string flow_id{segments[2]};
  const std::string action{segments[3]};

  if (req->method == HTTP_GET && action == "status" && segments.size() == 4U) {
    const auto response = dependencies_.flow_adapter->load_flow_detail(flow_id, dependencies_.now_ms_fn());
    CJsonPtr<cJSON> root(serialize_flow_view_response(response, &serialize_flow_status_model), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }
  if (req->method == HTTP_GET && action == "trend" && segments.size() == 4U) {
    const auto response = dependencies_.flow_adapter->load_flow_trend(flow_id, dependencies_.now_ms_fn());
    CJsonPtr<cJSON> root(serialize_flow_view_response(response, &serialize_flow_trend_model), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }
  if (req->method == HTTP_GET && action == "history" && segments.size() == 4U) {
    const auto response = dependencies_.flow_adapter->load_flow_history(flow_id, dependencies_.now_ms_fn());
    CJsonPtr<cJSON> root(serialize_flow_view_response(response, &serialize_flow_history_items), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }

  if (req->method == HTTP_POST && action == "batch" && segments.size() == 5U) {
    std::string error_message;
    const auto body = read_request_body(req, error_message);
    if (!body.has_value()) {
      return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", error_message));
    }
    CJsonPtr<cJSON> json(cJSON_Parse(body->c_str()), cJSON_Delete);
    if (!json) {
      return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", "Invalid JSON body."));
    }
    const auto context = parse_command_context(
        json.get(),
        dependencies_.now_ms_fn(),
        "web_flow",
        std::string{"flow batch "} + std::string{segments[4]});
    WebFlowCommandResponse response;
    if (segments[4] == "start") {
      response = dependencies_.flow_adapter->start_batch(
          flow_id,
          parse_optional_number(json.get(), "target_override"),
          context);
    } else if (segments[4] == "stop") {
      response = dependencies_.flow_adapter->stop_batch(flow_id, context);
    } else if (segments[4] == "reset") {
      response = dependencies_.flow_adapter->reset_batch_total(flow_id, context);
    } else {
      return send_result(req, make_error_result(404, "WEB_NOT_FOUND", "Flow batch route not found."));
    }
    CJsonPtr<cJSON> root(serialize_flow_command_response(response), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }

  if (req->method == HTTP_POST && action == "trip-total" && segments.size() == 5U && segments[4] == "reset") {
    std::string error_message;
    const auto body = read_request_body(req, error_message);
    if (!body.has_value()) {
      return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", error_message));
    }
    CJsonPtr<cJSON> json(cJSON_Parse(body->c_str()), cJSON_Delete);
    if (!json) {
      return send_result(req, make_error_result(400, "WEB_BAD_REQUEST", "Invalid JSON body."));
    }
    const auto context =
        parse_command_context(json.get(), dependencies_.now_ms_fn(), "web_flow", "flow trip total reset");
    const auto response = dependencies_.flow_adapter->reset_trip_total(flow_id, context);
    CJsonPtr<cJSON> root(serialize_flow_command_response(response), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }

  return send_result(req, make_error_result(404, "WEB_NOT_FOUND", "Flow route not found."));
}

esp_err_t WebRouteService::serve_rules_route(httpd_req_t* req) const {
  const std::string uri = strip_query(req->uri);
  if (uri == "/api/rules/list") {
    const auto response = dependencies_.rules_adapter->load_rule_list(dependencies_.now_ms_fn());
    CJsonPtr<cJSON> root(serialize_rules_view_response(response, &serialize_rules_list_model), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }

  const auto segments = split_path_segments(uri);
  if (segments.size() == 3U && segments[0] == "api" && segments[1] == "rules") {
    const auto response =
        dependencies_.rules_adapter->load_rule_detail(std::string{segments[2]}, dependencies_.now_ms_fn());
    CJsonPtr<cJSON> root(serialize_rules_view_response(response, &serialize_rules_detail_model), cJSON_Delete);
    return send_result(req, make_json_result(root.get()));
  }

  return send_result(req, make_error_result(404, "WEB_NOT_FOUND", "Rules route not found."));
}

esp_err_t WebRouteService::send_result(httpd_req_t* req, const WebResult& result) const {
  httpd_resp_set_status(req, http_status_text(result.http_status));
  httpd_resp_set_type(req, result.content_type);
  return httpd_resp_send(req, result.body.c_str(), static_cast<ssize_t>(result.body.size()));
}

}  // namespace controller::web
