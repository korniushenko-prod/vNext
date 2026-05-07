#include "mqtt/mqtt_service.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <iomanip>
#include <sstream>
#include <utility>

#include "actuators/actuator_types.hpp"
#include "alarms/alarm_types.hpp"
#include "api/api_result.hpp"
#include "api/flow_api_types.hpp"
#include "hal/hal_common.hpp"
#include "pid/pid_service_result.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::mqtt {

namespace {

using controller::actuators::PwmEffectiveState;
using controller::actuators::RelayEffectiveState;
using controller::api::CommandContext;
using controller::api::FlowCommandResult;
using controller::api::FlowStatusDto;
using controller::api::ProgramStatusDto;
using controller::pid::PidServiceMode;

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](const unsigned char ch) {
    return !std::isspace(ch);
  });
}

std::string trim_copy(const std::string& value) {
  std::size_t begin = 0U;
  std::size_t end = value.size();
  while (begin < end && std::isspace(static_cast<unsigned char>(value[begin])) != 0) {
    ++begin;
  }
  while (end > begin && std::isspace(static_cast<unsigned char>(value[end - 1U])) != 0) {
    --end;
  }
  return value.substr(begin, end - begin);
}

std::string lowercase_copy(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(), [](const unsigned char ch) {
    return static_cast<char>(std::tolower(ch));
  });
  return value;
}

bool parse_finite_double(const std::string& text, double& parsed_value) {
  const std::string trimmed = trim_copy(text);
  if (trimmed.empty()) {
    return false;
  }

  std::size_t index = 0U;
  try {
    parsed_value = std::stod(trimmed, &index);
  } catch (...) {
    return false;
  }

  return index == trimmed.size() && std::isfinite(parsed_value);
}

std::string format_bool(const bool value) {
  return value ? "true" : "false";
}

std::string format_double(const double value) {
  std::ostringstream stream;
  stream << std::setprecision(15) << value;
  return stream.str();
}

std::string format_uint64(const std::uint64_t value) {
  return std::to_string(value);
}

std::string relay_state_text(const controller::hal::RelayState state) {
  switch (state) {
    case controller::hal::RelayState::off:
      return "off";
    case controller::hal::RelayState::on:
      return "on";
  }

  return "unknown";
}

std::string alarm_severity_text(const std::optional<controller::alarms::AlarmSeverity>& severity) {
  return severity.has_value() ? controller::alarms::to_string(*severity) : "";
}

CommandContext make_command_context(const MqttTimestampMs now_ms, const std::string& topic) {
  CommandContext context;
  context.now_ms = now_ms;
  context.source = "mqtt";
  context.reason = topic;
  context.actor = std::string{"mqtt"};
  return context;
}

MqttCommandResult make_command_result(
    const bool success,
    const MqttResultCode code,
    std::string message,
    std::string topic,
    std::optional<std::string> payload = std::nullopt) {
  return MqttCommandResult{success, code, std::move(message), std::move(topic), std::move(payload)};
}

MqttResultCode map_sequence_result_code(const controller::api::CommandResultDto& result) {
  if (result.accepted) {
    return MqttResultCode::ok;
  }
  return result.code == controller::api::ApiErrorCode::api_invalid_argument ? MqttResultCode::mqtt_invalid_argument
                                                                            : MqttResultCode::mqtt_command_execution_failed;
}

MqttResultCode map_flow_result_code(const FlowCommandResult& result) {
  if (result.accepted) {
    return MqttResultCode::ok;
  }
  return result.status.code == controller::api::FlowUiResultCode::flow_ui_invalid_argument
             ? MqttResultCode::mqtt_invalid_argument
             : MqttResultCode::mqtt_command_execution_failed;
}

MqttResultCode map_pid_result_code(const controller::pid::PidServiceOperationResult& result) {
  if (result.ok()) {
    return MqttResultCode::ok;
  }
  return result.status.code == controller::pid::PidServiceErrorCode::pid_service_invalid_argument
             ? MqttResultCode::mqtt_invalid_argument
             : MqttResultCode::mqtt_command_execution_failed;
}

}  // namespace

MqttValidationResult validate_mqtt_descriptor(
    const MqttDescriptor& descriptor,
    const std::optional<std::string> existing_id) {
  MqttValidationResult result;
  result.status = MqttStatus::success();

  auto append_issue = [&](const MqttResultCode code, const std::string& field, const std::string& message) {
    result.issues.push_back(MqttValidationIssue{code, field, message});
    if (result.status.ok()) {
      result.status = MqttStatus::error(code, message);
    }
  };

  if (!has_text(descriptor.id)) {
    append_issue(MqttResultCode::mqtt_invalid_descriptor, "id", "MQTT descriptor id must not be empty.");
  }
  if (!has_text(descriptor.name)) {
    append_issue(MqttResultCode::mqtt_invalid_descriptor, "name", "MQTT descriptor name must not be empty.");
  }
  if (!has_text(descriptor.topic_prefix)) {
    append_issue(MqttResultCode::mqtt_invalid_descriptor, "topic_prefix", "MQTT topic_prefix must not be empty.");
  }
  if (descriptor.availability_topic.has_value() && !has_text(*descriptor.availability_topic)) {
    append_issue(
        MqttResultCode::mqtt_invalid_descriptor,
        "availability_topic",
        "MQTT availability_topic must not be blank when provided.");
  }
  if (descriptor.status_publish_interval_ms == 0U) {
    append_issue(
        MqttResultCode::mqtt_invalid_descriptor,
        "status_publish_interval_ms",
        "MQTT status_publish_interval_ms must be greater than zero.");
  }
  if (existing_id.has_value() && *existing_id == descriptor.id) {
    append_issue(
        MqttResultCode::mqtt_already_registered,
        "id",
        "MQTT descriptor id '" + descriptor.id + "' is already registered.");
  }

  return result;
}

MqttService::MqttService(const std::size_t history_capacity) : history_(history_capacity) {}

MqttValidationResult MqttService::validate_descriptor(
    const MqttDescriptor& descriptor,
    const std::optional<std::string> existing_id) const {
  return validate_mqtt_descriptor(descriptor, existing_id);
}

MqttOperationResult MqttService::register_bridge(const MqttDescriptor& descriptor) {
  if (descriptor_.has_value()) {
    return {MqttStatus::error(
        MqttResultCode::mqtt_already_registered,
        "MQTT bridge '" + descriptor_->id + "' is already registered.")};
  }

  const auto validation = validate_descriptor(descriptor, std::nullopt);
  if (!validation.ok()) {
    return {validation.status};
  }

  descriptor_ = descriptor;
  mapper_.emplace(descriptor.topic_prefix, descriptor.availability_topic);
  subscribed_topics_.clear();
  publish_dirty_ = true;
  last_connected_ = false;
  snapshot_ = MqttBridgeSnapshot{};
  snapshot_.id = descriptor.id;
  snapshot_.enabled = descriptor.enabled;
  snapshot_.connected = false;
  snapshot_.topic_prefix = mapper_->topic_prefix();
  snapshot_.last_reason = "mqtt bridge registered";

  return {MqttStatus::success("MQTT bridge registered.")};
}

bool MqttService::has_bridge() const {
  return descriptor_.has_value();
}

void MqttService::bind_backend(MqttClientBackend& backend) {
  backend_ = &backend;
}

void MqttService::bind_sequence_api(controller::api::SequenceApiService& sequence_api) {
  sequence_api_ = &sequence_api;
}

void MqttService::bind_flow_api(controller::api::FlowApiService& flow_api) {
  flow_api_ = &flow_api;
}

void MqttService::bind_pid_service(controller::pid::PidService& pid_service) {
  pid_service_ = &pid_service;
}

void MqttService::bind_alarm_service(controller::alarms::AlarmService& alarm_service) {
  alarm_service_ = &alarm_service;
}

void MqttService::bind_actuator_manager(controller::actuators::ActuatorManager& actuator_manager) {
  actuator_manager_ = &actuator_manager;
}

MqttOperationResult MqttService::set_enabled(const bool enabled, const MqttTimestampMs now_ms) {
  const auto descriptor_status = require_registered_descriptor();
  if (!descriptor_status.ok()) {
    return descriptor_status;
  }

  descriptor_->enabled = enabled;
  snapshot_.enabled = enabled;
  publish_dirty_ = true;

  if (!enabled && backend_ != nullptr && backend_->is_connected()) {
    const auto disconnected = disconnect(now_ms, "mqtt bridge disabled");
    if (!disconnected.ok()) {
      return disconnected;
    }
  }

  snapshot_.last_reason = enabled ? "mqtt bridge enabled" : "mqtt bridge disabled";
  return {MqttStatus::success(snapshot_.last_reason)};
}

MqttOperationResult MqttService::connect(const MqttTimestampMs now_ms) {
  const auto descriptor_status = require_registered_descriptor();
  if (!descriptor_status.ok()) {
    return descriptor_status;
  }
  const auto backend_status = require_backend();
  if (!backend_status.ok()) {
    return backend_status;
  }
  if (!descriptor_->enabled) {
    return {MqttStatus::error(MqttResultCode::mqtt_invalid_argument, "MQTT bridge is disabled.")};
  }

  const auto connect_result = backend_->connect();
  if (!connect_result.ok()) {
    snapshot_.connected = backend_->is_connected();
    snapshot_.last_reason = connect_result.status.message;
    return connect_result;
  }

  snapshot_.connected = backend_->is_connected();
  last_connected_ = snapshot_.connected;
  if (snapshot_.connected) {
    record_history(now_ms, MqttHistoryEventType::connected, {}, std::nullopt, true, "mqtt backend connected");
  }

  const auto subscription_result = ensure_command_subscriptions(now_ms);
  if (!subscription_result.ok()) {
    return subscription_result;
  }

  const auto availability_result = publish_availability(now_ms, "online");
  if (!availability_result.ok()) {
    return availability_result;
  }

  publish_dirty_ = true;
  snapshot_.last_reason = "mqtt bridge connected";
  return publish_status_snapshot(now_ms);
}

MqttOperationResult MqttService::disconnect(MqttTimestampMs now_ms, std::string reason) {
  const auto backend_status = require_backend();
  if (!backend_status.ok()) {
    return backend_status;
  }

  sync_connected_flag(now_ms);
  if (backend_->is_connected()) {
    const auto offline_result = publish_availability(now_ms, "offline");
    if (!offline_result.ok()) {
      snapshot_.last_reason = offline_result.status.message;
      (void)backend_->disconnect();
      snapshot_.connected = false;
      last_connected_ = false;
      record_history(now_ms, MqttHistoryEventType::disconnected, {}, std::nullopt, true, reason);
      return offline_result;
    }
  }

  const auto result = backend_->disconnect();
  snapshot_.connected = backend_->is_connected();
  last_connected_ = snapshot_.connected;
  subscribed_topics_.clear();
  if (!snapshot_.connected) {
    record_history(now_ms, MqttHistoryEventType::disconnected, {}, std::nullopt, true, reason);
  }
  snapshot_.last_reason = std::move(reason);
  return result;
}

MqttOperationResult MqttService::tick(const MqttTimestampMs now_ms) {
  const auto descriptor_status = require_registered_descriptor();
  if (!descriptor_status.ok()) {
    return descriptor_status;
  }
  const auto backend_status = require_backend();
  if (!backend_status.ok()) {
    return backend_status;
  }

  sync_connected_flag(now_ms);
  if (!descriptor_->enabled) {
    snapshot_.last_reason = "mqtt bridge disabled";
    return {MqttStatus::success(snapshot_.last_reason)};
  }
  if (!backend_->is_connected()) {
    snapshot_.last_reason = "mqtt backend is disconnected";
    return {MqttStatus::success(snapshot_.last_reason)};
  }

  const auto subscription_result = ensure_command_subscriptions(now_ms);
  if (!subscription_result.ok()) {
    return subscription_result;
  }

  const auto command_result = process_incoming(now_ms);
  if (!command_result.ok()) {
    return command_result;
  }

  const bool interval_elapsed =
      !snapshot_.last_publish_ms.has_value() ||
      now_ms >= *snapshot_.last_publish_ms + descriptor_->status_publish_interval_ms;
  if (publish_dirty_ || interval_elapsed) {
    return publish_status_snapshot(now_ms);
  }

  return {MqttStatus::success("MQTT tick complete.")};
}

MqttBridgeSnapshot MqttService::get_snapshot() const {
  return snapshot_;
}

std::vector<MqttHistoryEntry> MqttService::read_history() const {
  return history_.read();
}

void MqttService::clear_history() {
  history_.clear();
}

MqttOperationResult MqttService::require_registered_descriptor() const {
  if (!descriptor_.has_value() || !mapper_.has_value()) {
    return {MqttStatus::error(MqttResultCode::mqtt_invalid_descriptor, "MQTT bridge descriptor is not registered.")};
  }
  return {MqttStatus::success()};
}

MqttOperationResult MqttService::require_backend() const {
  if (backend_ == nullptr) {
    return {MqttStatus::error(MqttResultCode::mqtt_backend_not_bound, "MQTT backend is not bound.")};
  }
  return {MqttStatus::success()};
}

void MqttService::sync_connected_flag(const MqttTimestampMs now_ms) {
  const bool connected = backend_ != nullptr && backend_->is_connected();
  snapshot_.connected = connected;

  if (connected == last_connected_) {
    return;
  }

  if (connected) {
    record_history(now_ms, MqttHistoryEventType::connected, {}, std::nullopt, true, "mqtt backend connected");
  } else {
    subscribed_topics_.clear();
    record_history(now_ms, MqttHistoryEventType::disconnected, {}, std::nullopt, true, "mqtt backend disconnected");
  }

  last_connected_ = connected;
}

void MqttService::record_history(
    const MqttTimestampMs now_ms,
    const MqttHistoryEventType event_type,
    std::string topic,
    std::optional<std::string> payload,
    const bool success,
    std::string reason) {
  history_.push(MqttHistoryEntry{
      0U,
      now_ms,
      event_type,
      std::move(topic),
      std::move(payload),
      success,
      std::move(reason),
  });
}

MqttOperationResult MqttService::publish_message(
    const MqttTimestampMs now_ms,
    const std::string& topic,
    const std::string& payload,
    const bool retain,
    std::string reason) {
  const auto backend_status = require_backend();
  if (!backend_status.ok()) {
    return backend_status;
  }
  if (!backend_->is_connected()) {
    record_history(now_ms, MqttHistoryEventType::publish_failed, topic, payload, false, "mqtt backend is disconnected");
    return {MqttStatus::error(MqttResultCode::mqtt_not_connected, "MQTT backend is not connected.")};
  }

  const auto result = backend_->publish(topic, payload, retain);
  if (!result.ok()) {
    record_history(now_ms, MqttHistoryEventType::publish_failed, topic, payload, false, result.status.message);
    snapshot_.last_reason = result.status.message;
    return result;
  }

  ++snapshot_.publish_counter;
  record_history(now_ms, MqttHistoryEventType::published, topic, payload, true, std::move(reason));
  return result;
}

MqttOperationResult MqttService::publish_availability(const MqttTimestampMs now_ms, const std::string& payload) {
  const auto result = publish_message(now_ms, mapper_->availability_topic(), payload, true, "availability");
  if (result.ok()) {
    snapshot_.last_reason = "availability " + payload;
  }
  return result;
}

MqttOperationResult MqttService::publish_command_result(const MqttTimestampMs now_ms, const MqttCommandResult& result) {
  const auto code_result = publish_message(
      now_ms,
      mapper_->cmd_result_code(),
      to_string(result.code),
      false,
      "command_result_code");
  if (!code_result.ok()) {
    return code_result;
  }

  const auto message_result = publish_message(
      now_ms,
      mapper_->cmd_result_message(),
      result.message,
      false,
      "command_result_message");
  if (!message_result.ok()) {
    return message_result;
  }

  const auto topic_result = publish_message(
      now_ms,
      mapper_->cmd_result_topic(),
      result.topic,
      false,
      "command_result_topic");
  if (!topic_result.ok()) {
    return topic_result;
  }

  return publish_message(
      now_ms,
      mapper_->cmd_result_success(),
      format_bool(result.success),
      false,
      "command_result_success");
}

MqttOperationResult MqttService::publish_status_snapshot(const MqttTimestampMs now_ms) {
  const auto descriptor_status = require_registered_descriptor();
  if (!descriptor_status.ok()) {
    return descriptor_status;
  }
  if (!backend_->is_connected()) {
    return {MqttStatus::error(MqttResultCode::mqtt_not_connected, "MQTT backend is not connected.")};
  }

  const bool retain = descriptor_->retain_status;

  if (descriptor_->publish_sequence_status) {
    if (sequence_api_ == nullptr) {
      return {MqttStatus::error(
          MqttResultCode::mqtt_invalid_argument,
          "SequenceApiService must be bound when publish_sequence_status is enabled.")};
    }

    const auto sequence_status = sequence_api_->get_active_program_status(now_ms);
    if (!sequence_status.ok()) {
      return {MqttStatus::error(
          MqttResultCode::mqtt_command_execution_failed,
          "Failed to read sequence status: " + sequence_status.status.message)};
    }

    const ProgramStatusDto& status = *sequence_status.value;
    auto result = publish_message(
        now_ms,
        mapper_->sequence_active_program_id(),
        status.active_program_id.value_or(""),
        retain,
        "sequence_active_program_id");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->sequence_lifecycle(),
        controller::sequence::to_string(status.lifecycle),
        retain,
        "sequence_lifecycle");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->sequence_current_state(),
        status.current_state_id.value_or(""),
        retain,
        "sequence_current_state");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->sequence_lockout(),
        format_bool(status.lockout),
        retain,
        "sequence_lockout");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->sequence_last_reason(),
        status.last_reason,
        retain,
        "sequence_last_reason");
    if (!result.ok()) {
      return result;
    }
  }

  if (descriptor_->publish_alarm_status) {
    if (alarm_service_ == nullptr) {
      return {MqttStatus::error(
          MqttResultCode::mqtt_invalid_argument,
          "AlarmService must be bound when publish_alarm_status is enabled.")};
    }

    const auto aggregate = alarm_service_->get_aggregate_status();
    auto result = publish_message(
        now_ms,
        mapper_->alarm_any_active(),
        format_bool(aggregate.any_active),
        retain,
        "alarm_any_active");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->alarm_active_count(),
        format_uint64(aggregate.active_count),
        retain,
        "alarm_active_count");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->alarm_highest_severity(),
        alarm_severity_text(aggregate.highest_severity),
        retain,
        "alarm_highest_severity");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->alarm_trip_active(),
        format_bool(aggregate.trip_active),
        retain,
        "alarm_trip_active");
    if (!result.ok()) {
      return result;
    }
    result = publish_message(
        now_ms,
        mapper_->alarm_safety_active(),
        format_bool(aggregate.safety_active),
        retain,
        "alarm_safety_active");
    if (!result.ok()) {
      return result;
    }
  }

  if (descriptor_->publish_actuator_status) {
    if (actuator_manager_ == nullptr) {
      return {MqttStatus::error(
          MqttResultCode::mqtt_invalid_argument,
          "ActuatorManager must be bound when publish_actuator_status is enabled.")};
    }

    for (const auto& snapshot : actuator_manager_->list_snapshots()) {
      auto result = publish_message(
          now_ms,
          mapper_->actuator_kind(snapshot.target_id),
          controller::actuators::to_string(snapshot.kind),
          retain,
          "actuator_kind");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->actuator_role(snapshot.target_id),
          controller::actuators::to_string(snapshot.role),
          retain,
          "actuator_role");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->actuator_owner(snapshot.target_id),
          snapshot.owner,
          retain,
          "actuator_owner");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->actuator_reason(snapshot.target_id),
          snapshot.reason,
          retain,
          "actuator_reason");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->actuator_safe_fallback(snapshot.target_id),
          format_bool(snapshot.safe_fallback),
          retain,
          "actuator_safe_fallback");
      if (!result.ok()) {
        return result;
      }

      if (const auto* relay_state = std::get_if<RelayEffectiveState>(&snapshot.effective)) {
        result = publish_message(
            now_ms,
            mapper_->actuator_relay_state(snapshot.target_id),
            relay_state_text(relay_state->state),
            retain,
            "actuator_relay_state");
      } else if (const auto* pwm_state = std::get_if<PwmEffectiveState>(&snapshot.effective)) {
        result = publish_message(
            now_ms,
            mapper_->actuator_pwm_enabled(snapshot.target_id),
            format_bool(pwm_state->enabled),
            retain,
            "actuator_pwm_enabled");
        if (!result.ok()) {
          return result;
        }
        result = publish_message(
            now_ms,
            mapper_->actuator_pwm_duty_percent(snapshot.target_id),
            format_double(pwm_state->duty_percent),
            retain,
            "actuator_pwm_duty_percent");
      }

      if (!result.ok()) {
        return result;
      }
    }
  }

  if (descriptor_->publish_flow_status) {
    if (flow_api_ == nullptr) {
      return {MqttStatus::error(
          MqttResultCode::mqtt_invalid_argument,
          "FlowApiService must be bound when publish_flow_status is enabled.")};
    }

    const auto flows = flow_api_->list_flowmeters(now_ms);
    if (!flows.status.ok()) {
      return {MqttStatus::error(
          MqttResultCode::mqtt_command_execution_failed,
          "Failed to list flow status: " + flows.status.message)};
    }

    for (const auto& flow_summary : *flows.value) {
      const auto flow_status = flow_api_->get_flowmeter_status(flow_summary.id, now_ms);
      if (!flow_status.ok()) {
        return {MqttStatus::error(
            MqttResultCode::mqtt_command_execution_failed,
            "Failed to read flow status for '" + flow_summary.id + "': " + flow_status.status.message)};
      }

      const FlowStatusDto& status = *flow_status.value;
      auto result = publish_message(now_ms, mapper_->flow_rate(status.id), format_double(status.current_rate), retain, "flow_rate");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->flow_lifetime_total(status.id),
          format_double(status.lifetime_total),
          retain,
          "flow_lifetime_total");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->flow_trip_total(status.id),
          format_double(status.trip_total),
          retain,
          "flow_trip_total");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->flow_batch_total(status.id),
          format_double(status.batch_total),
          retain,
          "flow_batch_total");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->flow_batch_active(status.id),
          format_bool(status.batch_active),
          retain,
          "flow_batch_active");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->flow_batch_done(status.id),
          format_bool(status.batch_done),
          retain,
          "flow_batch_done");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(now_ms, mapper_->flow_no_flow(status.id), format_bool(status.no_flow), retain, "flow_no_flow");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->flow_high_flow(status.id),
          format_bool(status.high_flow),
          retain,
          "flow_high_flow");
      if (!result.ok()) {
        return result;
      }
    }
  }

  if (descriptor_->publish_pid_status) {
    if (pid_service_ == nullptr) {
      return {MqttStatus::error(
          MqttResultCode::mqtt_invalid_argument,
          "PidService must be bound when publish_pid_status is enabled.")};
    }

    for (const auto& snapshot : pid_service_->list_snapshots()) {
      auto result = publish_message(
          now_ms,
          mapper_->pid_requested_mode(snapshot.id),
          controller::pid::to_string(snapshot.requested_mode),
          retain,
          "pid_requested_mode");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->pid_effective_mode(snapshot.id),
          controller::pid::to_string(snapshot.effective_mode),
          retain,
          "pid_effective_mode");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(now_ms, mapper_->pid_fault(snapshot.id), format_bool(snapshot.fault), retain, "pid_fault");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(now_ms, mapper_->pid_fault_reason(snapshot.id), snapshot.fault_reason, retain, "pid_fault_reason");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->pid_pv(snapshot.id),
          snapshot.pv.has_value() ? format_double(*snapshot.pv) : "",
          retain,
          "pid_pv");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->pid_sp(snapshot.id),
          snapshot.sp.has_value() ? format_double(*snapshot.sp) : "",
          retain,
          "pid_sp");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(now_ms, mapper_->pid_output(snapshot.id), format_double(snapshot.output), retain, "pid_output");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->pid_saturated_high(snapshot.id),
          format_bool(snapshot.saturated_high),
          retain,
          "pid_saturated_high");
      if (!result.ok()) {
        return result;
      }
      result = publish_message(
          now_ms,
          mapper_->pid_saturated_low(snapshot.id),
          format_bool(snapshot.saturated_low),
          retain,
          "pid_saturated_low");
      if (!result.ok()) {
        return result;
      }
    }
  }

  publish_dirty_ = false;
  snapshot_.last_publish_ms = now_ms;
  snapshot_.last_reason = "status snapshot published";
  return {MqttStatus::success(snapshot_.last_reason)};
}

MqttOperationResult MqttService::ensure_command_subscriptions(const MqttTimestampMs now_ms) {
  const auto backend_status = require_backend();
  if (!backend_status.ok()) {
    return backend_status;
  }
  if (!backend_->is_connected()) {
    return {MqttStatus::error(MqttResultCode::mqtt_not_connected, "MQTT backend is not connected.")};
  }

  const auto topics = mapper_->command_topics(list_flow_ids(now_ms), list_pid_ids());
  for (const auto& topic : topics) {
    if (subscribed_topics_.count(topic) != 0U) {
      continue;
    }

    const auto result = backend_->subscribe(topic);
    if (!result.ok()) {
      record_history(now_ms, MqttHistoryEventType::command_rejected, topic, std::nullopt, false, result.status.message);
      snapshot_.last_reason = result.status.message;
      return result;
    }

    subscribed_topics_.insert(topic);
    record_history(now_ms, MqttHistoryEventType::subscribed, topic, std::nullopt, true, "subscribed");
  }

  return {MqttStatus::success("MQTT command subscriptions are synchronized.")};
}

MqttOperationResult MqttService::process_incoming(const MqttTimestampMs now_ms) {
  const auto messages = backend_->read_incoming();
  for (const auto& message : messages) {
    ++snapshot_.command_counter;
    snapshot_.last_command_topic = message.topic;
    const auto result = handle_command_message(message, now_ms);
    snapshot_.last_command_result_code = result.code;

    const auto publish_result = publish_command_result(now_ms, result);
    if (!publish_result.ok()) {
      return publish_result;
    }

    if (publish_dirty_) {
      const auto status_result = publish_status_snapshot(now_ms);
      if (!status_result.ok()) {
        return status_result;
      }
    }
  }

  return {MqttStatus::success("MQTT incoming messages processed.")};
}

MqttCommandResult MqttService::handle_command_message(const MqttIncomingMessage& message, const MqttTimestampMs now_ms) {
  record_history(
      now_ms,
      MqttHistoryEventType::command_received,
      message.topic,
      message.payload,
      true,
      "command received");

  const auto parsed = mapper_->parse_command_topic(message.topic);
  if (!parsed.ok()) {
    const auto result = make_command_result(
        false,
        parsed.status.code,
        parsed.status.message,
        message.topic,
        message.payload);
    record_history(
        now_ms,
        MqttHistoryEventType::command_rejected,
        message.topic,
        message.payload,
        false,
        parsed.status.message);
    snapshot_.last_reason = parsed.status.message;
    return result;
  }

  const auto& command = *parsed.value;

  auto reject_not_bound = [&](const std::string& service_name) {
    const std::string reason = service_name + " is not bound.";
    record_history(now_ms, MqttHistoryEventType::command_rejected, message.topic, message.payload, false, reason);
    snapshot_.last_reason = reason;
    return make_command_result(false, MqttResultCode::mqtt_invalid_argument, reason, message.topic, message.payload);
  };

  switch (command.kind) {
    case MqttTopicMapper::CommandKind::sequence_program_start: {
      if (sequence_api_ == nullptr) {
        return reject_not_bound("SequenceApiService");
      }

      const std::string program_id = trim_copy(message.payload);
      if (program_id.empty()) {
        const std::string reason = "Program start payload must contain a program id.";
        record_history(now_ms, MqttHistoryEventType::command_parse_error, message.topic, message.payload, false, reason);
        snapshot_.last_reason = reason;
        return make_command_result(false, MqttResultCode::mqtt_command_parse_error, reason, message.topic, message.payload);
      }

      const auto sequence_result = sequence_api_->start_program(program_id, make_command_context(now_ms, message.topic));
      const auto code = map_sequence_result_code(sequence_result);
      record_history(
          now_ms,
          sequence_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          sequence_result.accepted,
          sequence_result.message);
      publish_dirty_ = sequence_result.accepted;
      snapshot_.last_reason = sequence_result.message;
      return make_command_result(sequence_result.accepted, code, sequence_result.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::sequence_program_stop: {
      if (sequence_api_ == nullptr) {
        return reject_not_bound("SequenceApiService");
      }

      const auto sequence_result = sequence_api_->request_normal_stop(make_command_context(now_ms, message.topic));
      const auto code = map_sequence_result_code(sequence_result);
      record_history(
          now_ms,
          sequence_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          sequence_result.accepted,
          sequence_result.message);
      publish_dirty_ = sequence_result.accepted;
      snapshot_.last_reason = sequence_result.message;
      return make_command_result(sequence_result.accepted, code, sequence_result.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::sequence_program_trip: {
      if (sequence_api_ == nullptr) {
        return reject_not_bound("SequenceApiService");
      }

      const auto sequence_result = sequence_api_->request_trip_stop(make_command_context(now_ms, message.topic));
      const auto code = map_sequence_result_code(sequence_result);
      record_history(
          now_ms,
          sequence_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          sequence_result.accepted,
          sequence_result.message);
      publish_dirty_ = sequence_result.accepted;
      snapshot_.last_reason = sequence_result.message;
      return make_command_result(sequence_result.accepted, code, sequence_result.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::sequence_program_reset: {
      if (sequence_api_ == nullptr) {
        return reject_not_bound("SequenceApiService");
      }

      const auto sequence_result = sequence_api_->reset_active_program(make_command_context(now_ms, message.topic));
      const auto code = map_sequence_result_code(sequence_result);
      record_history(
          now_ms,
          sequence_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          sequence_result.accepted,
          sequence_result.message);
      publish_dirty_ = sequence_result.accepted;
      snapshot_.last_reason = sequence_result.message;
      return make_command_result(sequence_result.accepted, code, sequence_result.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::flow_batch_start: {
      if (flow_api_ == nullptr) {
        return reject_not_bound("FlowApiService");
      }

      std::optional<double> target_override;
      const std::string payload = trim_copy(message.payload);
      if (!payload.empty()) {
        double parsed_value = 0.0;
        if (!parse_finite_double(payload, parsed_value)) {
          const std::string reason = "Flow batch start payload must be a finite number when provided.";
          record_history(now_ms, MqttHistoryEventType::command_parse_error, message.topic, message.payload, false, reason);
          snapshot_.last_reason = reason;
          return make_command_result(
              false,
              MqttResultCode::mqtt_command_parse_error,
              reason,
              message.topic,
              message.payload);
        }
        target_override = parsed_value;
      }

      const auto flow_result =
          flow_api_->start_batch(command.entity_id, target_override, make_command_context(now_ms, message.topic));
      const auto code = map_flow_result_code(flow_result);
      record_history(
          now_ms,
          flow_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          flow_result.accepted,
          flow_result.status.message);
      publish_dirty_ = flow_result.accepted;
      snapshot_.last_reason = flow_result.status.message;
      return make_command_result(flow_result.accepted, code, flow_result.status.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::flow_batch_stop: {
      if (flow_api_ == nullptr) {
        return reject_not_bound("FlowApiService");
      }

      const auto flow_result = flow_api_->stop_batch(command.entity_id, make_command_context(now_ms, message.topic));
      const auto code = map_flow_result_code(flow_result);
      record_history(
          now_ms,
          flow_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          flow_result.accepted,
          flow_result.status.message);
      publish_dirty_ = flow_result.accepted;
      snapshot_.last_reason = flow_result.status.message;
      return make_command_result(flow_result.accepted, code, flow_result.status.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::flow_batch_reset: {
      if (flow_api_ == nullptr) {
        return reject_not_bound("FlowApiService");
      }

      const auto flow_result =
          flow_api_->reset_batch_total(command.entity_id, make_command_context(now_ms, message.topic));
      const auto code = map_flow_result_code(flow_result);
      record_history(
          now_ms,
          flow_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          flow_result.accepted,
          flow_result.status.message);
      publish_dirty_ = flow_result.accepted;
      snapshot_.last_reason = flow_result.status.message;
      return make_command_result(flow_result.accepted, code, flow_result.status.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::flow_trip_reset: {
      if (flow_api_ == nullptr) {
        return reject_not_bound("FlowApiService");
      }

      const auto flow_result =
          flow_api_->reset_trip_total(command.entity_id, make_command_context(now_ms, message.topic));
      const auto code = map_flow_result_code(flow_result);
      record_history(
          now_ms,
          flow_result.accepted ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          flow_result.accepted,
          flow_result.status.message);
      publish_dirty_ = flow_result.accepted;
      snapshot_.last_reason = flow_result.status.message;
      return make_command_result(flow_result.accepted, code, flow_result.status.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::pid_mode: {
      if (pid_service_ == nullptr) {
        return reject_not_bound("PidService");
      }

      const std::string mode_text = lowercase_copy(trim_copy(message.payload));
      PidServiceMode mode = PidServiceMode::disabled;
      if (mode_text == "manual") {
        mode = PidServiceMode::manual;
      } else if (mode_text == "auto") {
        mode = PidServiceMode::auto_mode;
      } else if (mode_text == "hold") {
        mode = PidServiceMode::hold;
      } else if (mode_text == "disabled") {
        mode = PidServiceMode::disabled;
      } else {
        const std::string reason = "PID mode payload must be manual, auto, hold or disabled.";
        record_history(now_ms, MqttHistoryEventType::command_parse_error, message.topic, message.payload, false, reason);
        snapshot_.last_reason = reason;
        return make_command_result(false, MqttResultCode::mqtt_command_parse_error, reason, message.topic, message.payload);
      }

      const auto pid_result = pid_service_->set_requested_mode(command.entity_id, mode, now_ms);
      const auto code = map_pid_result_code(pid_result);
      record_history(
          now_ms,
          pid_result.ok() ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          pid_result.ok(),
          pid_result.status.message);
      publish_dirty_ = pid_result.ok();
      snapshot_.last_reason = pid_result.status.message;
      return make_command_result(pid_result.ok(), code, pid_result.status.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::pid_setpoint: {
      if (pid_service_ == nullptr) {
        return reject_not_bound("PidService");
      }

      double value = 0.0;
      if (!parse_finite_double(message.payload, value)) {
        const std::string reason = "PID setpoint payload must be a finite number.";
        record_history(now_ms, MqttHistoryEventType::command_parse_error, message.topic, message.payload, false, reason);
        snapshot_.last_reason = reason;
        return make_command_result(false, MqttResultCode::mqtt_command_parse_error, reason, message.topic, message.payload);
      }

      const auto pid_result = pid_service_->set_constant_setpoint(command.entity_id, value, now_ms);
      const auto code = map_pid_result_code(pid_result);
      record_history(
          now_ms,
          pid_result.ok() ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          pid_result.ok(),
          pid_result.status.message);
      publish_dirty_ = pid_result.ok();
      snapshot_.last_reason = pid_result.status.message;
      return make_command_result(pid_result.ok(), code, pid_result.status.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::pid_manual_output: {
      if (pid_service_ == nullptr) {
        return reject_not_bound("PidService");
      }

      double value = 0.0;
      if (!parse_finite_double(message.payload, value)) {
        const std::string reason = "PID manual_output payload must be a finite number.";
        record_history(now_ms, MqttHistoryEventType::command_parse_error, message.topic, message.payload, false, reason);
        snapshot_.last_reason = reason;
        return make_command_result(false, MqttResultCode::mqtt_command_parse_error, reason, message.topic, message.payload);
      }

      const auto pid_result = pid_service_->set_manual_output(command.entity_id, value, now_ms);
      const auto code = map_pid_result_code(pid_result);
      record_history(
          now_ms,
          pid_result.ok() ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          pid_result.ok(),
          pid_result.status.message);
      publish_dirty_ = pid_result.ok();
      snapshot_.last_reason = pid_result.status.message;
      return make_command_result(pid_result.ok(), code, pid_result.status.message, message.topic, message.payload);
    }
    case MqttTopicMapper::CommandKind::pid_integral_reset: {
      if (pid_service_ == nullptr) {
        return reject_not_bound("PidService");
      }

      const auto pid_result = pid_service_->reset_integral(command.entity_id, now_ms);
      const auto code = map_pid_result_code(pid_result);
      record_history(
          now_ms,
          pid_result.ok() ? MqttHistoryEventType::command_executed : MqttHistoryEventType::command_rejected,
          message.topic,
          message.payload,
          pid_result.ok(),
          pid_result.status.message);
      publish_dirty_ = pid_result.ok();
      snapshot_.last_reason = pid_result.status.message;
      return make_command_result(pid_result.ok(), code, pid_result.status.message, message.topic, message.payload);
    }
  }

  const std::string reason = "Unhandled MQTT command topic '" + message.topic + "'.";
  record_history(now_ms, MqttHistoryEventType::command_rejected, message.topic, message.payload, false, reason);
  snapshot_.last_reason = reason;
  return make_command_result(false, MqttResultCode::mqtt_unknown_command_topic, reason, message.topic, message.payload);
}

std::vector<std::string> MqttService::list_flow_ids(const MqttTimestampMs now_ms) const {
  if (flow_api_ == nullptr) {
    return {};
  }

  const auto result = flow_api_->list_flowmeters(now_ms);
  if (!result.ok()) {
    return {};
  }

  std::vector<std::string> ids;
  ids.reserve(result.value->size());
  for (const auto& summary : *result.value) {
    ids.push_back(summary.id);
  }
  return ids;
}

std::vector<std::string> MqttService::list_pid_ids() const {
  if (pid_service_ == nullptr) {
    return {};
  }

  std::vector<std::string> ids;
  const auto descriptors = pid_service_->list_descriptors();
  ids.reserve(descriptors.size());
  for (const auto& descriptor : descriptors) {
    ids.push_back(descriptor.id);
  }
  return ids;
}

}  // namespace controller::mqtt
