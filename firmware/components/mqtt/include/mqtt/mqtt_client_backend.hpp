#pragma once

#include <map>
#include <string>
#include <vector>

#include "mqtt/mqtt_result.hpp"
#include "mqtt/mqtt_types.hpp"

namespace controller::mqtt {

class MqttClientBackend {
 public:
  virtual ~MqttClientBackend() = default;

  virtual MqttOperationResult connect() = 0;
  virtual MqttOperationResult disconnect() = 0;
  virtual bool is_connected() const = 0;
  virtual MqttOperationResult publish(const std::string& topic, const std::string& payload, bool retain) = 0;
  virtual MqttOperationResult subscribe(const std::string& topic) = 0;
  virtual std::vector<MqttIncomingMessage> read_incoming() = 0;
  virtual void clear_published() = 0;
};

class MockMqttClientBackend final : public MqttClientBackend {
 public:
  MqttOperationResult connect() override;
  MqttOperationResult disconnect() override;
  bool is_connected() const override;
  MqttOperationResult publish(const std::string& topic, const std::string& payload, bool retain) override;
  MqttOperationResult subscribe(const std::string& topic) override;
  std::vector<MqttIncomingMessage> read_incoming() override;
  void clear_published() override;

  void inject_incoming(const std::string& topic, const std::string& payload);
  void force_connected_state(bool connected);
  void set_fail_connect(bool fail);
  void set_fail_disconnect(bool fail);
  void set_fail_publish(bool fail);
  void set_fail_subscribe(const std::string& topic, bool fail);

  const std::vector<MqttPublishedMessage>& published_messages() const;
  const std::vector<std::string>& subscriptions() const;

 private:
  bool connected_{false};
  bool fail_connect_{false};
  bool fail_disconnect_{false};
  bool fail_publish_{false};
  std::vector<MqttIncomingMessage> incoming_messages_;
  std::vector<MqttPublishedMessage> published_messages_;
  std::vector<std::string> subscriptions_;
  std::map<std::string, bool> subscribe_failures_;
};

}  // namespace controller::mqtt
