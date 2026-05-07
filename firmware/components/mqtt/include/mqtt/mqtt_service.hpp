#pragma once

#include <cstddef>
#include <optional>
#include <set>
#include <string>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "api/flow_api_service.hpp"
#include "api/sequence_api_service.hpp"
#include "mqtt/mqtt_client_backend.hpp"
#include "mqtt/mqtt_descriptor.hpp"
#include "mqtt/mqtt_history.hpp"
#include "mqtt/mqtt_topic_mapper.hpp"
#include "pid/pid_service.hpp"

namespace controller::mqtt {

class MqttService {
 public:
  explicit MqttService(std::size_t history_capacity = 128U);

  MqttValidationResult validate_descriptor(
      const MqttDescriptor& descriptor,
      std::optional<std::string> existing_id = std::nullopt) const;
  MqttOperationResult register_bridge(const MqttDescriptor& descriptor);
  bool has_bridge() const;

  void bind_backend(MqttClientBackend& backend);
  void bind_sequence_api(controller::api::SequenceApiService& sequence_api);
  void bind_flow_api(controller::api::FlowApiService& flow_api);
  void bind_pid_service(controller::pid::PidService& pid_service);
  void bind_alarm_service(controller::alarms::AlarmService& alarm_service);
  void bind_actuator_manager(controller::actuators::ActuatorManager& actuator_manager);

  MqttOperationResult set_enabled(bool enabled, MqttTimestampMs now_ms);
  MqttOperationResult connect(MqttTimestampMs now_ms);
  MqttOperationResult disconnect(MqttTimestampMs now_ms, std::string reason = "mqtt_disconnect");
  MqttOperationResult tick(MqttTimestampMs now_ms);

  MqttBridgeSnapshot get_snapshot() const;
  std::vector<MqttHistoryEntry> read_history() const;
  void clear_history();

 private:
  MqttOperationResult require_registered_descriptor() const;
  MqttOperationResult require_backend() const;
  void sync_connected_flag(MqttTimestampMs now_ms);
  void record_history(
      MqttTimestampMs now_ms,
      MqttHistoryEventType event_type,
      std::string topic,
      std::optional<std::string> payload,
      bool success,
      std::string reason);

  MqttOperationResult publish_message(
      MqttTimestampMs now_ms,
      const std::string& topic,
      const std::string& payload,
      bool retain,
      std::string reason);
  MqttOperationResult publish_availability(MqttTimestampMs now_ms, const std::string& payload);
  MqttOperationResult publish_command_result(MqttTimestampMs now_ms, const MqttCommandResult& result);
  MqttOperationResult publish_status_snapshot(MqttTimestampMs now_ms);
  MqttOperationResult ensure_command_subscriptions(MqttTimestampMs now_ms);
  MqttOperationResult process_incoming(MqttTimestampMs now_ms);
  MqttCommandResult handle_command_message(const MqttIncomingMessage& message, MqttTimestampMs now_ms);

  std::vector<std::string> list_flow_ids(MqttTimestampMs now_ms) const;
  std::vector<std::string> list_pid_ids() const;

  MqttClientBackend* backend_{nullptr};
  controller::api::SequenceApiService* sequence_api_{nullptr};
  controller::api::FlowApiService* flow_api_{nullptr};
  controller::pid::PidService* pid_service_{nullptr};
  controller::alarms::AlarmService* alarm_service_{nullptr};
  controller::actuators::ActuatorManager* actuator_manager_{nullptr};

  std::optional<MqttDescriptor> descriptor_;
  std::optional<MqttTopicMapper> mapper_;
  MqttHistoryBuffer history_;
  std::set<std::string> subscribed_topics_;
  bool publish_dirty_{false};
  bool last_connected_{false};
  MqttBridgeSnapshot snapshot_{};
};

}  // namespace controller::mqtt
