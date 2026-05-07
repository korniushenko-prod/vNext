#pragma once

#include <cstdint>
#include <optional>
#include <string>

#include "mqtt/mqtt_result.hpp"

namespace controller::mqtt {

using MqttTimestampMs = std::uint64_t;
using MqttHistorySequenceNumber = std::uint64_t;

enum class MqttHistoryEventType {
  connected,
  disconnected,
  published,
  publish_failed,
  subscribed,
  command_received,
  command_executed,
  command_rejected,
  command_parse_error,
};

inline const char* to_string(const MqttHistoryEventType event_type) {
  switch (event_type) {
    case MqttHistoryEventType::connected:
      return "connected";
    case MqttHistoryEventType::disconnected:
      return "disconnected";
    case MqttHistoryEventType::published:
      return "published";
    case MqttHistoryEventType::publish_failed:
      return "publish_failed";
    case MqttHistoryEventType::subscribed:
      return "subscribed";
    case MqttHistoryEventType::command_received:
      return "command_received";
    case MqttHistoryEventType::command_executed:
      return "command_executed";
    case MqttHistoryEventType::command_rejected:
      return "command_rejected";
    case MqttHistoryEventType::command_parse_error:
      return "command_parse_error";
  }

  return "unknown";
}

struct MqttPublishedMessage {
  std::string topic;
  std::string payload;
  bool retain{false};
};

struct MqttIncomingMessage {
  std::string topic;
  std::string payload;
};

struct MqttHistoryEntry {
  MqttHistorySequenceNumber sequence_number{0U};
  MqttTimestampMs timestamp_ms{0U};
  MqttHistoryEventType event_type{MqttHistoryEventType::connected};
  std::string topic;
  std::optional<std::string> payload;
  bool success{true};
  std::string reason;
};

struct MqttCommandResult {
  bool success{false};
  MqttResultCode code{MqttResultCode::ok};
  std::string message;
  std::string topic;
  std::optional<std::string> payload;
};

struct MqttBridgeSnapshot {
  std::string id;
  bool enabled{false};
  bool connected{false};
  std::string topic_prefix;
  std::optional<MqttTimestampMs> last_publish_ms;
  std::optional<std::string> last_command_topic;
  std::optional<MqttResultCode> last_command_result_code;
  std::uint64_t publish_counter{0U};
  std::uint64_t command_counter{0U};
  std::string last_reason;
};

}  // namespace controller::mqtt
