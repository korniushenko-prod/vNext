#include "mqtt/mqtt_client_backend.hpp"

#include <utility>

namespace controller::mqtt {

MqttOperationResult MockMqttClientBackend::connect() {
  if (fail_connect_) {
    return {MqttStatus::error(MqttResultCode::mqtt_command_execution_failed, "Mock MQTT connect failure.")};
  }

  connected_ = true;
  return {MqttStatus::success("Mock MQTT backend connected.")};
}

MqttOperationResult MockMqttClientBackend::disconnect() {
  if (fail_disconnect_) {
    return {MqttStatus::error(MqttResultCode::mqtt_command_execution_failed, "Mock MQTT disconnect failure.")};
  }

  connected_ = false;
  return {MqttStatus::success("Mock MQTT backend disconnected.")};
}

bool MockMqttClientBackend::is_connected() const {
  return connected_;
}

MqttOperationResult MockMqttClientBackend::publish(
    const std::string& topic,
    const std::string& payload,
    const bool retain) {
  if (!connected_) {
    return {MqttStatus::error(MqttResultCode::mqtt_not_connected, "Mock MQTT backend is not connected.")};
  }
  if (fail_publish_) {
    return {MqttStatus::error(MqttResultCode::mqtt_publish_failed, "Mock MQTT publish failure.")};
  }

  published_messages_.push_back(MqttPublishedMessage{topic, payload, retain});
  return {MqttStatus::success("Mock publish accepted.")};
}

MqttOperationResult MockMqttClientBackend::subscribe(const std::string& topic) {
  if (!connected_) {
    return {MqttStatus::error(MqttResultCode::mqtt_not_connected, "Mock MQTT backend is not connected.")};
  }

  const auto failure = subscribe_failures_.find(topic);
  if (failure != subscribe_failures_.end() && failure->second) {
    return {MqttStatus::error(
        MqttResultCode::mqtt_subscribe_failed,
        "Mock MQTT subscribe failure for topic '" + topic + "'.")};
  }

  subscriptions_.push_back(topic);
  return {MqttStatus::success("Mock subscribe accepted.")};
}

std::vector<MqttIncomingMessage> MockMqttClientBackend::read_incoming() {
  auto messages = std::move(incoming_messages_);
  incoming_messages_.clear();
  return messages;
}

void MockMqttClientBackend::clear_published() {
  published_messages_.clear();
}

void MockMqttClientBackend::inject_incoming(const std::string& topic, const std::string& payload) {
  incoming_messages_.push_back(MqttIncomingMessage{topic, payload});
}

void MockMqttClientBackend::force_connected_state(const bool connected) {
  connected_ = connected;
}

void MockMqttClientBackend::set_fail_connect(const bool fail) {
  fail_connect_ = fail;
}

void MockMqttClientBackend::set_fail_disconnect(const bool fail) {
  fail_disconnect_ = fail;
}

void MockMqttClientBackend::set_fail_publish(const bool fail) {
  fail_publish_ = fail;
}

void MockMqttClientBackend::set_fail_subscribe(const std::string& topic, const bool fail) {
  subscribe_failures_[topic] = fail;
}

const std::vector<MqttPublishedMessage>& MockMqttClientBackend::published_messages() const {
  return published_messages_;
}

const std::vector<std::string>& MockMqttClientBackend::subscriptions() const {
  return subscriptions_;
}

}  // namespace controller::mqtt
