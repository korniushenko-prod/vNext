#include "mqtt/mqtt_topic_mapper.hpp"

#include <sstream>
#include <utility>
#include <vector>

namespace controller::mqtt {

namespace {

std::vector<std::string> split_topic(const std::string& value) {
  std::vector<std::string> parts;
  std::stringstream stream(value);
  std::string part;
  while (std::getline(stream, part, '/')) {
    parts.push_back(part);
  }
  return parts;
}

bool starts_with_prefix(const std::string& topic, const std::string& prefix) {
  return topic == prefix || (topic.size() > prefix.size() && topic.compare(0U, prefix.size(), prefix) == 0 &&
                             topic[prefix.size()] == '/');
}

}  // namespace

MqttTopicMapper::MqttTopicMapper(std::string topic_prefix, std::optional<std::string> availability_topic)
    : topic_prefix_(normalize_topic(topic_prefix)),
      availability_topic_(
          availability_topic.has_value() ? std::optional<std::string>{normalize_topic(*availability_topic)} : std::nullopt) {}

std::string MqttTopicMapper::normalize_topic(const std::string& topic) {
  std::size_t begin = 0U;
  std::size_t end = topic.size();

  while (begin < end && topic[begin] == '/') {
    ++begin;
  }
  while (end > begin && topic[end - 1U] == '/') {
    --end;
  }

  return topic.substr(begin, end - begin);
}

const std::string& MqttTopicMapper::topic_prefix() const {
  return topic_prefix_;
}

std::string MqttTopicMapper::availability_topic() const {
  if (availability_topic_.has_value()) {
    return *availability_topic_;
  }
  return join("availability");
}

std::string MqttTopicMapper::sequence_active_program_id() const { return join("sequence/active_program_id"); }
std::string MqttTopicMapper::sequence_lifecycle() const { return join("sequence/lifecycle"); }
std::string MqttTopicMapper::sequence_current_state() const { return join("sequence/current_state"); }
std::string MqttTopicMapper::sequence_lockout() const { return join("sequence/lockout"); }
std::string MqttTopicMapper::sequence_last_reason() const { return join("sequence/last_reason"); }
std::string MqttTopicMapper::alarm_any_active() const { return join("alarm/any_active"); }
std::string MqttTopicMapper::alarm_active_count() const { return join("alarm/active_count"); }
std::string MqttTopicMapper::alarm_highest_severity() const { return join("alarm/highest_severity"); }
std::string MqttTopicMapper::alarm_trip_active() const { return join("alarm/trip_active"); }
std::string MqttTopicMapper::alarm_safety_active() const { return join("alarm/safety_active"); }
std::string MqttTopicMapper::actuator_kind(const std::string& actuator_id) const { return join("actuator/" + actuator_id + "/kind"); }
std::string MqttTopicMapper::actuator_role(const std::string& actuator_id) const { return join("actuator/" + actuator_id + "/role"); }
std::string MqttTopicMapper::actuator_owner(const std::string& actuator_id) const { return join("actuator/" + actuator_id + "/owner"); }
std::string MqttTopicMapper::actuator_reason(const std::string& actuator_id) const { return join("actuator/" + actuator_id + "/reason"); }
std::string MqttTopicMapper::actuator_safe_fallback(const std::string& actuator_id) const {
  return join("actuator/" + actuator_id + "/safe_fallback");
}
std::string MqttTopicMapper::actuator_relay_state(const std::string& actuator_id) const {
  return join("actuator/" + actuator_id + "/relay_state");
}
std::string MqttTopicMapper::actuator_pwm_enabled(const std::string& actuator_id) const {
  return join("actuator/" + actuator_id + "/pwm_enabled");
}
std::string MqttTopicMapper::actuator_pwm_duty_percent(const std::string& actuator_id) const {
  return join("actuator/" + actuator_id + "/pwm_duty_percent");
}
std::string MqttTopicMapper::flow_rate(const std::string& flow_id) const { return join("flow/" + flow_id + "/rate"); }
std::string MqttTopicMapper::flow_lifetime_total(const std::string& flow_id) const {
  return join("flow/" + flow_id + "/lifetime_total");
}
std::string MqttTopicMapper::flow_trip_total(const std::string& flow_id) const { return join("flow/" + flow_id + "/trip_total"); }
std::string MqttTopicMapper::flow_batch_total(const std::string& flow_id) const { return join("flow/" + flow_id + "/batch_total"); }
std::string MqttTopicMapper::flow_batch_active(const std::string& flow_id) const { return join("flow/" + flow_id + "/batch_active"); }
std::string MqttTopicMapper::flow_batch_done(const std::string& flow_id) const { return join("flow/" + flow_id + "/batch_done"); }
std::string MqttTopicMapper::flow_no_flow(const std::string& flow_id) const { return join("flow/" + flow_id + "/no_flow"); }
std::string MqttTopicMapper::flow_high_flow(const std::string& flow_id) const { return join("flow/" + flow_id + "/high_flow"); }
std::string MqttTopicMapper::pid_requested_mode(const std::string& pid_id) const {
  return join("pid/" + pid_id + "/requested_mode");
}
std::string MqttTopicMapper::pid_effective_mode(const std::string& pid_id) const {
  return join("pid/" + pid_id + "/effective_mode");
}
std::string MqttTopicMapper::pid_fault(const std::string& pid_id) const { return join("pid/" + pid_id + "/fault"); }
std::string MqttTopicMapper::pid_fault_reason(const std::string& pid_id) const {
  return join("pid/" + pid_id + "/fault_reason");
}
std::string MqttTopicMapper::pid_pv(const std::string& pid_id) const { return join("pid/" + pid_id + "/pv"); }
std::string MqttTopicMapper::pid_sp(const std::string& pid_id) const { return join("pid/" + pid_id + "/sp"); }
std::string MqttTopicMapper::pid_output(const std::string& pid_id) const { return join("pid/" + pid_id + "/output"); }
std::string MqttTopicMapper::pid_saturated_high(const std::string& pid_id) const {
  return join("pid/" + pid_id + "/saturated_high");
}
std::string MqttTopicMapper::pid_saturated_low(const std::string& pid_id) const {
  return join("pid/" + pid_id + "/saturated_low");
}
std::string MqttTopicMapper::cmd_program_start() const { return join("cmd/program/start"); }
std::string MqttTopicMapper::cmd_program_stop() const { return join("cmd/program/stop"); }
std::string MqttTopicMapper::cmd_program_trip() const { return join("cmd/program/trip"); }
std::string MqttTopicMapper::cmd_program_reset() const { return join("cmd/program/reset"); }
std::string MqttTopicMapper::cmd_flow_batch_start(const std::string& flow_id) const {
  return join("cmd/flow/" + flow_id + "/batch/start");
}
std::string MqttTopicMapper::cmd_flow_batch_stop(const std::string& flow_id) const {
  return join("cmd/flow/" + flow_id + "/batch/stop");
}
std::string MqttTopicMapper::cmd_flow_batch_reset(const std::string& flow_id) const {
  return join("cmd/flow/" + flow_id + "/batch/reset");
}
std::string MqttTopicMapper::cmd_flow_trip_reset(const std::string& flow_id) const {
  return join("cmd/flow/" + flow_id + "/trip/reset");
}
std::string MqttTopicMapper::cmd_pid_mode(const std::string& pid_id) const { return join("cmd/pid/" + pid_id + "/mode"); }
std::string MqttTopicMapper::cmd_pid_setpoint(const std::string& pid_id) const {
  return join("cmd/pid/" + pid_id + "/setpoint");
}
std::string MqttTopicMapper::cmd_pid_manual_output(const std::string& pid_id) const {
  return join("cmd/pid/" + pid_id + "/manual_output");
}
std::string MqttTopicMapper::cmd_pid_integral_reset(const std::string& pid_id) const {
  return join("cmd/pid/" + pid_id + "/integral/reset");
}
std::string MqttTopicMapper::cmd_result_code() const { return join("cmd/result/code"); }
std::string MqttTopicMapper::cmd_result_message() const { return join("cmd/result/message"); }
std::string MqttTopicMapper::cmd_result_topic() const { return join("cmd/result/topic"); }
std::string MqttTopicMapper::cmd_result_success() const { return join("cmd/result/success"); }

std::vector<std::string> MqttTopicMapper::command_topics(
    const std::vector<std::string>& flow_ids,
    const std::vector<std::string>& pid_ids) const {
  std::vector<std::string> topics{
      cmd_program_start(),
      cmd_program_stop(),
      cmd_program_trip(),
      cmd_program_reset(),
  };

  for (const auto& flow_id : flow_ids) {
    topics.push_back(cmd_flow_batch_start(flow_id));
    topics.push_back(cmd_flow_batch_stop(flow_id));
    topics.push_back(cmd_flow_batch_reset(flow_id));
    topics.push_back(cmd_flow_trip_reset(flow_id));
  }

  for (const auto& pid_id : pid_ids) {
    topics.push_back(cmd_pid_mode(pid_id));
    topics.push_back(cmd_pid_setpoint(pid_id));
    topics.push_back(cmd_pid_manual_output(pid_id));
    topics.push_back(cmd_pid_integral_reset(pid_id));
  }

  return topics;
}

MqttResult<MqttTopicMapper::ParsedCommandTopic> MqttTopicMapper::parse_command_topic(const std::string& topic) const {
  MqttResult<ParsedCommandTopic> result;

  const std::string normalized = normalize_topic(topic);
  if (!starts_with_prefix(normalized, topic_prefix_)) {
    result.status = MqttStatus::error(
        MqttResultCode::mqtt_unknown_command_topic,
        "Topic '" + topic + "' is outside MQTT prefix '" + topic_prefix_ + "'.");
    return result;
  }

  const std::string relative =
      normalized.size() == topic_prefix_.size() ? std::string{} : normalized.substr(topic_prefix_.size() + 1U);
  if (relative == "cmd/program/start") {
    result.status = MqttStatus::success();
    result.value = ParsedCommandTopic{CommandKind::sequence_program_start, {}, topic};
    return result;
  }
  if (relative == "cmd/program/stop") {
    result.status = MqttStatus::success();
    result.value = ParsedCommandTopic{CommandKind::sequence_program_stop, {}, topic};
    return result;
  }
  if (relative == "cmd/program/trip") {
    result.status = MqttStatus::success();
    result.value = ParsedCommandTopic{CommandKind::sequence_program_trip, {}, topic};
    return result;
  }
  if (relative == "cmd/program/reset") {
    result.status = MqttStatus::success();
    result.value = ParsedCommandTopic{CommandKind::sequence_program_reset, {}, topic};
    return result;
  }

  const auto parts = split_topic(relative);
  if (parts.size() == 5U && parts[0] == "cmd" && parts[1] == "flow" && !parts[2].empty()) {
    if (parts[3] == "batch" && parts[4] == "start") {
      result.status = MqttStatus::success();
      result.value = ParsedCommandTopic{CommandKind::flow_batch_start, parts[2], topic};
      return result;
    }
    if (parts[3] == "batch" && parts[4] == "stop") {
      result.status = MqttStatus::success();
      result.value = ParsedCommandTopic{CommandKind::flow_batch_stop, parts[2], topic};
      return result;
    }
    if (parts[3] == "batch" && parts[4] == "reset") {
      result.status = MqttStatus::success();
      result.value = ParsedCommandTopic{CommandKind::flow_batch_reset, parts[2], topic};
      return result;
    }
    if (parts[3] == "trip" && parts[4] == "reset") {
      result.status = MqttStatus::success();
      result.value = ParsedCommandTopic{CommandKind::flow_trip_reset, parts[2], topic};
      return result;
    }
  }

  if (parts.size() == 4U && parts[0] == "cmd" && parts[1] == "pid" && !parts[2].empty()) {
    if (parts[3] == "mode") {
      result.status = MqttStatus::success();
      result.value = ParsedCommandTopic{CommandKind::pid_mode, parts[2], topic};
      return result;
    }
    if (parts[3] == "setpoint") {
      result.status = MqttStatus::success();
      result.value = ParsedCommandTopic{CommandKind::pid_setpoint, parts[2], topic};
      return result;
    }
    if (parts[3] == "manual_output") {
      result.status = MqttStatus::success();
      result.value = ParsedCommandTopic{CommandKind::pid_manual_output, parts[2], topic};
      return result;
    }
  }

  if (parts.size() == 5U && parts[0] == "cmd" && parts[1] == "pid" && !parts[2].empty() && parts[3] == "integral" &&
      parts[4] == "reset") {
    result.status = MqttStatus::success();
    result.value = ParsedCommandTopic{CommandKind::pid_integral_reset, parts[2], topic};
    return result;
  }

  result.status = MqttStatus::error(
      MqttResultCode::mqtt_unknown_command_topic,
      "Unknown MQTT command topic '" + topic + "'.");
  return result;
}

std::string MqttTopicMapper::join(const std::string& suffix) const {
  return topic_prefix_ + "/" + suffix;
}

}  // namespace controller::mqtt
