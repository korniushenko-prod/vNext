#include <iostream>

#include "mqtt_test_support.hpp"

int main() {
  using namespace mqtt_test;

  {
    TestContext context;
    expect_true(context.initialize(), "sequence command context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.sequence.sequence_service.register_program(make_program("pump1", "Pump 1")).ok(), "program should register");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_program_start(), "pump1");
    expect_true(context.mqtt_service.tick(20U).ok(), "mqtt tick should process sequence start");

    const auto active_status = context.sequence_api.get_active_program_status(20U);
    expect_true(active_status.ok() && active_status.value->active_program_id == std::optional<std::string>{"pump1"}, "start command should delegate to sequence api");

    const auto result_code = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    const auto result_success = find_published(context.backend.published_messages(), mapper.cmd_result_success());
    expect_true(
        result_code.has_value() && result_code->payload == "MQTT_OK",
        "successful start should publish OK command result code");
    expect_true(
        result_success.has_value() && result_success->payload == "true",
        "successful start should publish success=true");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "sequence stop/trip/reset context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.sequence.sequence_service.register_program(make_program("pump1", "Pump 1")).ok(), "program should register");
    expect_true(context.sequence.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "program should start");
    expect_true(context.sequence.sequence_service.tick(1U).ok(), "sequence should tick into run");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_program_stop(), "");
    expect_true(context.mqtt_service.tick(20U).ok(), "stop command should process");
    const auto stopped = context.sequence_api.get_active_program_status(20U);
    expect_true(stopped.ok() && stopped.value->pending_normal_stop, "stop command should request normal stop");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_program_trip(), "");
    expect_true(context.mqtt_service.tick(21U).ok(), "trip command should process");
    const auto tripped = context.sequence_api.get_active_program_status(21U);
    expect_true(tripped.ok() && tripped.value->pending_trip, "trip command should request trip");

    expect_true(context.sequence.sequence_service.tick(22U).ok(), "trip tick should progress");
    expect_true(context.sequence.sequence_service.tick(23U).ok(), "lockout tick should progress");
    expect_true(
        context.sequence.registry.update_signal("permit.reset", controller::signals::SignalValue{true}, 24U).ok(),
        "reset permit should become true");
    expect_true(context.sequence.sequence_service.tick(24U).ok(), "tick should refresh reset permission");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_program_reset(), "");
    expect_true(context.mqtt_service.tick(25U).ok(), "reset command should process");
    const auto reset = context.sequence_api.get_active_program_status(25U);
    expect_true(reset.ok() && !reset.value->active_program_id.has_value(), "reset command should clear active program");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "sequence invalid command context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_program_start(), "");
    expect_true(context.mqtt_service.tick(20U).ok(), "empty start payload should still produce command result");
    const auto parse_error = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    expect_true(
        parse_error.has_value() && parse_error->payload == "MQTT_COMMAND_PARSE_ERROR",
        "empty start payload should surface parse error");

    context.backend.clear_published();
    context.backend.inject_incoming("plant/controller/cmd/program/pause", "");
    expect_true(context.mqtt_service.tick(21U).ok(), "unknown sequence command should still produce command result");
    const auto unknown = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    expect_true(
        unknown.has_value() && unknown->payload == "MQTT_UNKNOWN_COMMAND_TOPIC",
        "unknown sequence command should surface unknown topic");
  }

  if (failures != 0) {
    std::cerr << "test_mqtt_service_commands_sequence failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_mqtt_service_commands_sequence passed\n";
  return 0;
}
