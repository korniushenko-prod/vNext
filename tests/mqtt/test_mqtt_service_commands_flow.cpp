#include <iostream>

#include "mqtt_test_support.hpp"

int main() {
  using namespace mqtt_test;

  {
    TestContext context;
    expect_true(context.initialize(), "flow command context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.flow_service.register_flowmeter(make_flow_descriptor("flow1", "Flow 1", "pulse.flow1")).ok(), "flow should register");
    expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow should initialize");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_flow_batch_start("flow1"), "4.5");
    expect_true(context.mqtt_service.tick(20U).ok(), "flow batch start should process");
    auto flow_status = context.flow_api.get_flowmeter_status("flow1", 20U);
    expect_true(flow_status.ok() && flow_status.value->batch_active, "flow batch start should delegate");
    expect_true(
        flow_status.ok() && flow_status.value->batch_target == std::optional<double>{4.5},
        "flow batch start should parse numeric override");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_flow_batch_stop("flow1"), "");
    expect_true(context.mqtt_service.tick(21U).ok(), "flow batch stop should process");
    flow_status = context.flow_api.get_flowmeter_status("flow1", 21U);
    expect_true(flow_status.ok() && !flow_status.value->batch_active, "flow batch stop should delegate");

    context.flow_hal.increment_mock_count("pulse.flow1", 15U);
    expect_true(context.flow_service.tick(1000U).ok(), "flow tick should accumulate totals");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_flow_batch_reset("flow1"), "");
    expect_true(context.mqtt_service.tick(1001U).ok(), "flow batch reset should process");
    flow_status = context.flow_api.get_flowmeter_status("flow1", 1001U);
    expect_true(flow_status.ok() && approx_equal(flow_status.value->batch_total, 0.0), "flow batch reset should clear batch total");

    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_flow_trip_reset("flow1"), "");
    expect_true(context.mqtt_service.tick(1002U).ok(), "flow trip reset should process");
    flow_status = context.flow_api.get_flowmeter_status("flow1", 1002U);
    expect_true(flow_status.ok() && approx_equal(flow_status.value->trip_total, 0.0), "flow trip reset should clear trip total");
  }

  {
    TestContext context;
    expect_true(context.initialize(), "flow invalid payload context should initialize");
    expect_true(context.mqtt_service.register_bridge(make_descriptor()).ok(), "mqtt bridge should register");
    expect_true(context.flow_service.register_flowmeter(make_flow_descriptor("flow1", "Flow 1", "pulse.flow1")).ok(), "flow should register");
    expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow should initialize");
    expect_true(context.mqtt_service.connect(10U).ok(), "mqtt bridge should connect");

    const auto mapper = context.mapper();
    context.backend.clear_published();
    context.backend.inject_incoming(mapper.cmd_flow_batch_start("flow1"), "not-a-number");
    expect_true(context.mqtt_service.tick(20U).ok(), "invalid flow payload should still produce command result");
    const auto result_code = find_published(context.backend.published_messages(), mapper.cmd_result_code());
    expect_true(
        result_code.has_value() && result_code->payload == "MQTT_COMMAND_PARSE_ERROR",
        "invalid flow numeric payload should surface parse error");
  }

  if (failures != 0) {
    std::cerr << "test_mqtt_service_commands_flow failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_mqtt_service_commands_flow passed\n";
  return 0;
}
