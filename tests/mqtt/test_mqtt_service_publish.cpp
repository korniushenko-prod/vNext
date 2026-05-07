#include <iostream>

#include "mqtt_test_support.hpp"

int main() {
  using namespace mqtt_test;

  {
    TestContext context;
    expect_true(context.initialize(), "publish context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(
        context.sequence.sequence_service.register_program(make_program("pump1", "Pump 1")).ok(),
        "sequence program should register");
    expect_true(
        context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(),
        "sequence program should start");
    expect_true(context.sequence.sequence_service.tick(1U).ok(), "sequence tick should advance to run");

    auto flow_descriptor = make_flow_descriptor("flow1", "Flow 1", "pulse.flow1");
    expect_true(context.flow_service.register_flowmeter(flow_descriptor).ok(), "flow should register");
    expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow should initialize");
    expect_true(
        context.flow_service.start_batch("flow1", 2U, std::optional<double>{3.5}, "test", "start batch").ok(),
        "flow batch should start");
    expect_true(context.flow_hal.increment_mock_count("pulse.flow1", 20U).ok(), "flow pulses should increment");
    expect_true(context.flow_service.tick(1000U).ok(), "flow tick should update status");

    auto pid_descriptor = make_pid_descriptor("loop1", "Loop 1", "pid.pv", "pwm.main");
    expect_true(context.pid_service.register_pid(pid_descriptor).ok(), "pid should register");
    expect_true(context.pid_service.tick(100U).ok(), "pid tick should update status");

    expect_true(
        context.sequence.alarm_service.set_condition("alarm.sequence", true, 5U, "test", "alarm active").ok(),
        "alarm should become active");

    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");
    const auto mapper = context.mapper();
    const auto online = find_published(context.backend.published_messages(), mapper.availability_topic());
    expect_true(online.has_value() && online->payload == "online", "connect should publish online availability");

    context.backend.clear_published();
    expect_true(context.mqtt_service.tick(1010U).ok(), "periodic publish tick should succeed");
    const auto messages = context.backend.published_messages();

    expect_true(
        find_published(messages, mapper.sequence_lifecycle()).has_value(),
        "periodic publish should include sequence lifecycle");
    expect_true(
        find_published(messages, mapper.alarm_any_active()).has_value(),
        "periodic publish should include alarm aggregate");
    expect_true(
        find_published(messages, mapper.flow_batch_active("flow1")).has_value(),
        "periodic publish should include flow batch state");
    expect_true(
        find_published(messages, mapper.pid_effective_mode("loop1")).has_value(),
        "periodic publish should include pid state");
    expect_true(
        find_published(messages, mapper.actuator_kind("relay.main")).has_value(),
        "periodic publish should include actuator state");

    const auto retained = find_published(messages, mapper.sequence_lifecycle());
    expect_true(retained.has_value() && retained->retain, "status topics should honor retain_status");

    context.backend.clear_published();
    expect_true(context.mqtt_service.disconnect(1020U, "test disconnect").ok(), "disconnect should succeed");
    const auto offline = find_published(context.backend.published_messages(), mapper.availability_topic());
    expect_true(offline.has_value() && offline->payload == "offline", "disconnect should publish offline availability");

    context.backend.clear_published();
    expect_true(context.mqtt_service.tick(2020U).ok(), "disconnected tick should be a no-op success");
    expect_true(context.backend.published_messages().empty(), "disconnected tick should not publish status");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "disabled publish context should initialize");
    auto descriptor = make_descriptor();
    descriptor.enabled = false;
    expect_true(context.mqtt_service.register_bridge(descriptor).ok(), "disabled mqtt bridge should register");

    expect_true(
        context.mqtt_service.connect(10U).status.code == controller::mqtt::MqttResultCode::mqtt_invalid_argument,
        "connect should reject a disabled bridge");
    expect_true(context.mqtt_service.tick(20U).ok(), "disabled tick should return success");
    expect_true(context.backend.published_messages().empty(), "disabled bridge should not publish");
  }

  if (failures != 0) {
    std::cerr << "test_mqtt_service_publish failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_mqtt_service_publish passed\n";
  return 0;
}
