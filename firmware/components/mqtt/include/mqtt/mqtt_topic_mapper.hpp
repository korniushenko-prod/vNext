#pragma once

#include <optional>
#include <string>
#include <vector>

#include "mqtt/mqtt_result.hpp"

namespace controller::mqtt {

class MqttTopicMapper {
 public:
  enum class CommandKind {
    sequence_program_start,
    sequence_program_stop,
    sequence_program_trip,
    sequence_program_reset,
    flow_batch_start,
    flow_batch_stop,
    flow_batch_reset,
    flow_trip_reset,
    pid_mode,
    pid_setpoint,
    pid_manual_output,
    pid_integral_reset,
  };

  struct ParsedCommandTopic {
    CommandKind kind{CommandKind::sequence_program_start};
    std::string entity_id;
    std::string original_topic;
  };

  explicit MqttTopicMapper(std::string topic_prefix, std::optional<std::string> availability_topic = std::nullopt);

  static std::string normalize_topic(const std::string& topic);

  const std::string& topic_prefix() const;
  std::string availability_topic() const;

  std::string sequence_active_program_id() const;
  std::string sequence_lifecycle() const;
  std::string sequence_current_state() const;
  std::string sequence_lockout() const;
  std::string sequence_last_reason() const;

  std::string alarm_any_active() const;
  std::string alarm_active_count() const;
  std::string alarm_highest_severity() const;
  std::string alarm_trip_active() const;
  std::string alarm_safety_active() const;

  std::string actuator_kind(const std::string& actuator_id) const;
  std::string actuator_role(const std::string& actuator_id) const;
  std::string actuator_owner(const std::string& actuator_id) const;
  std::string actuator_reason(const std::string& actuator_id) const;
  std::string actuator_safe_fallback(const std::string& actuator_id) const;
  std::string actuator_relay_state(const std::string& actuator_id) const;
  std::string actuator_pwm_enabled(const std::string& actuator_id) const;
  std::string actuator_pwm_duty_percent(const std::string& actuator_id) const;

  std::string flow_rate(const std::string& flow_id) const;
  std::string flow_lifetime_total(const std::string& flow_id) const;
  std::string flow_trip_total(const std::string& flow_id) const;
  std::string flow_batch_total(const std::string& flow_id) const;
  std::string flow_batch_active(const std::string& flow_id) const;
  std::string flow_batch_done(const std::string& flow_id) const;
  std::string flow_no_flow(const std::string& flow_id) const;
  std::string flow_high_flow(const std::string& flow_id) const;

  std::string pid_requested_mode(const std::string& pid_id) const;
  std::string pid_effective_mode(const std::string& pid_id) const;
  std::string pid_fault(const std::string& pid_id) const;
  std::string pid_fault_reason(const std::string& pid_id) const;
  std::string pid_pv(const std::string& pid_id) const;
  std::string pid_sp(const std::string& pid_id) const;
  std::string pid_output(const std::string& pid_id) const;
  std::string pid_saturated_high(const std::string& pid_id) const;
  std::string pid_saturated_low(const std::string& pid_id) const;

  std::string cmd_program_start() const;
  std::string cmd_program_stop() const;
  std::string cmd_program_trip() const;
  std::string cmd_program_reset() const;
  std::string cmd_flow_batch_start(const std::string& flow_id) const;
  std::string cmd_flow_batch_stop(const std::string& flow_id) const;
  std::string cmd_flow_batch_reset(const std::string& flow_id) const;
  std::string cmd_flow_trip_reset(const std::string& flow_id) const;
  std::string cmd_pid_mode(const std::string& pid_id) const;
  std::string cmd_pid_setpoint(const std::string& pid_id) const;
  std::string cmd_pid_manual_output(const std::string& pid_id) const;
  std::string cmd_pid_integral_reset(const std::string& pid_id) const;

  std::string cmd_result_code() const;
  std::string cmd_result_message() const;
  std::string cmd_result_topic() const;
  std::string cmd_result_success() const;

  std::vector<std::string> command_topics(
      const std::vector<std::string>& flow_ids,
      const std::vector<std::string>& pid_ids) const;
  MqttResult<ParsedCommandTopic> parse_command_topic(const std::string& topic) const;

 private:
  std::string join(const std::string& suffix) const;

  std::string topic_prefix_;
  std::optional<std::string> availability_topic_;
};

}  // namespace controller::mqtt
