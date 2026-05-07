#include <iostream>

#include "flow_api_test_support.hpp"

int main() {
  using namespace flow_api_test;

  {
    FlowApiTestContext context({
        controller::hal::PulseInputChannelConfig{"pulse.main", 0U, 0.0, true},
        controller::hal::PulseInputChannelConfig{"pulse.aux", 0U, 0.0, true},
    });
    expect_true(context.initialize(), "flow api list context should initialize");

    auto main_flow = make_descriptor("main", "Main flow", "pulse.main");
    main_flow.high_flow_threshold = 100.0;
    auto aux_flow = make_descriptor("aux", "Aux flow", "pulse.aux");
    aux_flow.enabled = false;
    aux_flow.no_flow_timeout_ms = 500U;

    expect_true(context.flow_service.register_flowmeter(main_flow).ok(), "main flow should register");
    expect_true(context.flow_service.register_flowmeter(aux_flow).ok(), "aux flow should register");
    expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow storage should initialize");
    expect_true(context.flow_service.start_batch("main", 0U, std::nullopt, "test", "start").ok(), "batch should start");
    expect_true(context.hal.increment_mock_count("pulse.main", 20U).ok(), "main pulses should increment");
    expect_true(context.flow_service.tick(1000U).ok(), "tick should update flow snapshots");

    const auto list = context.api_service.list_flowmeters(1000U);
    expect_true(list.ok(), "list_flowmeters should succeed");
    expect_true(list.ok() && list.value->size() == 2U, "both flowmeters should be listed");
    expect_true(list.ok() && list.value->at(0).id == "main", "flow ordering should be deterministic");
    expect_true(list.ok() && list.value->at(1).id == "aux", "second flow should preserve registration order");
    expect_true(list.ok() && approx_equal(list.value->at(0).current_rate, 120.0), "summary current rate should map from snapshot");
    expect_true(list.ok() && approx_equal(list.value->at(0).lifetime_total, 2.0), "summary lifetime total should map");
    expect_true(list.ok() && list.value->at(0).batch_active, "summary batch_active should map");
    expect_true(list.ok() && list.value->at(0).high_flow, "summary high_flow should map");
    expect_true(list.ok() && !list.value->at(1).enabled, "summary enabled flag should map");
  }

  {
    FlowApiTestContext empty_context;
    expect_true(empty_context.initialize(), "empty flow api list context should initialize");
    const auto list = empty_context.api_service.list_flowmeters(0U);
    expect_true(list.ok(), "empty list should still succeed gracefully");
    expect_true(list.ok() && list.value->empty(), "empty flow list should produce an empty vector");
  }

  if (failures != 0) {
    std::cerr << "test_flow_api_list failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_api_list passed\n";
  return 0;
}
