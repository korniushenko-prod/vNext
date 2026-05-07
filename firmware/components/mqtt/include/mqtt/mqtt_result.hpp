#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::mqtt {

enum class MqttResultCode {
  ok,
  mqtt_already_registered,
  mqtt_invalid_descriptor,
  mqtt_backend_not_bound,
  mqtt_not_connected,
  mqtt_publish_failed,
  mqtt_subscribe_failed,
  mqtt_unknown_command_topic,
  mqtt_command_parse_error,
  mqtt_command_execution_failed,
  mqtt_invalid_argument,
};

inline const char* to_string(const MqttResultCode code) {
  switch (code) {
    case MqttResultCode::ok:
      return "MQTT_OK";
    case MqttResultCode::mqtt_already_registered:
      return "MQTT_ALREADY_REGISTERED";
    case MqttResultCode::mqtt_invalid_descriptor:
      return "MQTT_INVALID_DESCRIPTOR";
    case MqttResultCode::mqtt_backend_not_bound:
      return "MQTT_BACKEND_NOT_BOUND";
    case MqttResultCode::mqtt_not_connected:
      return "MQTT_NOT_CONNECTED";
    case MqttResultCode::mqtt_publish_failed:
      return "MQTT_PUBLISH_FAILED";
    case MqttResultCode::mqtt_subscribe_failed:
      return "MQTT_SUBSCRIBE_FAILED";
    case MqttResultCode::mqtt_unknown_command_topic:
      return "MQTT_UNKNOWN_COMMAND_TOPIC";
    case MqttResultCode::mqtt_command_parse_error:
      return "MQTT_COMMAND_PARSE_ERROR";
    case MqttResultCode::mqtt_command_execution_failed:
      return "MQTT_COMMAND_EXECUTION_FAILED";
    case MqttResultCode::mqtt_invalid_argument:
      return "MQTT_INVALID_ARGUMENT";
  }

  return "MQTT_UNKNOWN_RESULT";
}

struct MqttStatus {
  MqttResultCode code{MqttResultCode::ok};
  std::string message;

  bool ok() const {
    return code == MqttResultCode::ok;
  }

  static MqttStatus success(std::string detail = {}) {
    return MqttStatus{MqttResultCode::ok, std::move(detail)};
  }

  static MqttStatus error(const MqttResultCode error_code, std::string detail) {
    return MqttStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct MqttResult {
  MqttStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct MqttOperationResult {
  MqttStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct MqttValidationIssue {
  MqttResultCode code{MqttResultCode::ok};
  std::string field;
  std::string message;
};

struct MqttValidationResult {
  MqttStatus status{};
  std::vector<MqttValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

}  // namespace controller::mqtt
