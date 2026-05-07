#include <iostream>

#include "mqtt_test_support.hpp"

int main() {
  using namespace mqtt_test;

  {
    TestContext context;
    expect_true(context.initialize(), "pid command context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.pid_service.register_pid(make_pid_descriptor("loop1", "Loop 1", "pid.pv", "pwm.main")).ok(), "pid should register");
    expect_true(context.pid_service.tick(100U).ok(), "pid tick should initialize snapshot");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_pid_mode("loop1"), "auto");
    expect_true(context.mqtt_service.tick(20U).ok(), "pid mode command should process");
    auto snapshot = context.pid_service.get_snapshot("loop1");
    expect_true(snapshot.ok() && snapshot.value->requested_mode == controller::pid::PidServiceMode::auto_mode, "pid mode command should delegate");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_pid_setpoint("loop1"), "55.5");
    expect_true(context.mqtt_service.tick(21U).ok(), "pid setpoint command should process");
    expect_true(context.pid_service.tick(121U).ok(), "pid tick should refresh setpoint snapshot");
    snapshot = context.pid_service.get_snapshot("loop1");
    expect_true(snapshot.ok() && snapshot.value->sp == std::optional<double>{55.5}, "pid setpoint command should parse numeric payload");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_pid_manual_output("loop1"), "12.5");
    expect_true(context.mqtt_service.tick(22U).ok(), "pid manual output command should process");
    expect_true(context.pid_service.tick(122U).ok(), "pid tick should refresh manual output snapshot");
    expect_true(
        context.pid_service.get_snapshot("loop1").ok() &&
            approx_equal(context.pid_service.get_snapshot("loop1").value->manual_output, 12.5),
        "pid manual output command should delegate");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_pid_integral_reset("loop1"), "");
    expect_true(context.mqtt_service.tick(23U).ok(), "pid integral reset command should process");
    const auto result_code = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    expect_true(result_code.has_value() && result_code->payload == "MQTT_OK", "pid integral reset should publish OK");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "pid invalid payload context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.pid_service.register_pid(make_pid_descriptor("loop1", "Loop 1", "pid.pv", "pwm.main")).ok(), "pid should register");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_pid_mode("loop1"), "turbo");
    expect_true(context.mqtt_service.tick(20U).ok(), "invalid pid mode should still produce command result");
    const auto invalid_mode = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    expect_true(
        invalid_mode.has_value() && invalid_mode->payload == "MQTT_COMMAND_PARSE_ERROR",
        "invalid pid mode should surface parse error");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_pid_manual_output("loop1"), "NaN!");
    expect_true(context.mqtt_service.tick(21U).ok(), "invalid pid numeric payload should still produce command result");
    const auto invalid_number = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    expect_true(
        invalid_number.has_value() && invalid_number->payload == "MQTT_COMMAND_PARSE_ERROR",
        "invalid pid numeric payload should surface parse error");
  }

  if (failures != 0) {
    std::cerr << "test_mqtt_service_commands_pid failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_mqtt_service_commands_pid passed\n";
  return 0;
}
