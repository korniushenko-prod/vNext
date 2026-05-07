#pragma once

#include <optional>
#include <string>

#include "mqtt/mqtt_result.hpp"
#include "mqtt/mqtt_types.hpp"

namespace controller::mqtt {

struct MqttDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string topic_prefix;
  std::optional<std::string> availability_topic;
  MqttTimestampMs status_publish_interval_ms{1000U};
  bool retain_status{true};
  bool publish_sequence_status{true};
  bool publish_flow_status{true};
  bool publish_pid_status{true};
  bool publish_alarm_status{true};
  bool publish_actuator_status{true};
};

MqttValidationResult validate_mqtt_descriptor(
    const MqttDescriptor& descriptor,
    std::optional<std::string> existing_id = std::nullopt);

}  // namespace controller::mqtt
