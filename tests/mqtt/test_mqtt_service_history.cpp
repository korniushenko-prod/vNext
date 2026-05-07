#include <iostream>

#include "mqtt_test_support.hpp"

int main() {
  using namespace mqtt_test;

  {
    TestContext context(64U);
    expect_true(context.initialize(), "history context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.sequence.sequence_service.register_program(make_program("pump1", "Pump 1")).ok(), "program should register");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.inject_incoming(mapper.cmd_program_start(), "pump1");
    expect_true(context.mqtt_service.tick(20U).ok(), "command tick should process");
    expect_true(context.mqtt_service.disconnect(30U, "done").ok(), "disconnect should succeed");

    const auto history = context.mqtt_service.read_history();
    expect_true(!history.empty(), "mqtt history should not be empty");
    expect_true(history.front().sequence_number < history.back().sequence_number, "history ordering should be deterministic");

    bool saw_connected = false;
    bool saw_subscribed = false;
    bool saw_published = false;
    bool saw_command_received = false;
    bool saw_command_executed = false;
    bool saw_disconnected = false;
    for (const auto& entry : history) {
      saw_connected = saw_connected || entry.event_type == controller::mqtt::MqttHistoryEventType::connected;
      saw_subscribed = saw_subscribed || entry.event_type == controller::mqtt::MqttHistoryEventType::subscribed;
      saw_published = saw_published || entry.event_type == controller::mqtt::MqttHistoryEventType::published;
      saw_command_received = saw_command_received || entry.event_type == controller::mqtt::MqttHistoryEventType::command_received;
      saw_command_executed = saw_command_executed || entry.event_type == controller::mqtt::MqttHistoryEventType::command_executed;
      saw_disconnected = saw_disconnected || entry.event_type == controller::mqtt::MqttHistoryEventType::disconnected;
    }

    expect_true(saw_connected, "history should record connected event");
    expect_true(saw_subscribed, "history should record subscribed event");
    expect_true(saw_published, "history should record published event");
    expect_true(saw_command_received, "history should record command_received event");
    expect_true(saw_command_executed, "history should record command_executed event");
    expect_true(saw_disconnected, "history should record disconnected event");
  }

  {
    TestContext context(3U);
    expect_true(context.initialize(), "bounded history context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");
    expect_true(context.mqtt_service.disconnect(20U, "done").ok(), "disconnect should succeed");

    const auto history = context.mqtt_service.read_history();
    expect_true(history.size() == 3U, "history should enforce drop-oldest capacity");
    expect_true(history.front().sequence_number > 1U, "drop-oldest policy should remove earliest entries first");
    expect_true(history.front().sequence_number < history.back().sequence_number, "remaining history should stay ordered");
  }

  if (failures != 0) {
    std::cerr << "test_mqtt_service_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_mqtt_service_history passed\n";
  return 0;
}
