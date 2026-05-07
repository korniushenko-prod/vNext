#include <iostream>

#include "mqtt_test_support.hpp"

int main() {
  using namespace mqtt_test;

  {
    controller::mqtt::MqttService mqtt_service;
    const auto result = mqtt_service.register_bridge(make_descriptor());
    expect_true(result.ok(), "standalone mqtt bridge should register");
    expect_true(
        mqtt_service.connect(10U).status.code == controller::mqtt::MqttResultCode::mqtt_backend_not_bound,
        "missing backend should surface MQTT_BACKEND_NOT_BOUND");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "publish failure context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    context.backend.set_fail_publish(true);
    expect_true(
        context.mqtt_service.connect(10U).status.code == controller::mqtt::MqttResultCode::mqtt_publish_failed,
        "publish failure should surface MQTT_PUBLISH_FAILED");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "unknown topic context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");
    const auto mapper = context.mapper();

    context.backend.clear_published();
    context.backend.inject_incoming("plant/controller/cmd/unknown/thing", "");
    expect_true(context.mqtt_service.tick(20U).ok(), "unknown topic should still produce a command result");
    const auto result_code = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    expect_true(
        result_code.has_value() && result_code->payload == "MQTT_UNKNOWN_COMMAND_TOPIC",
        "unknown command topic should surface MQTT_UNKNOWN_COMMAND_TOPIC");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "disconnected command context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");
    const auto mapper = context.mapper();

    context.backend.clear_published();
    context.backend.disconnect();
    context.backend.inject_incoming(mapper.cmd_program_stop(), "");
    expect_true(context.mqtt_service.tick(20U).ok(), "disconnected tick should succeed");
    expect_true(
        !context.mqtt_service.get_snapshot().last_command_topic.has_value(),
        "disconnected tick should not consume incoming commands");
    expect_true(
        context.backend.published_messages().empty(),
        "disconnected tick should not publish command results");
  }

  if (failures != 0) {
    std::cerr << "test_mqtt_service_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_mqtt_service_errors passed\n";
  return 0;
}
