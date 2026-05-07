#include <iostream>

#include "api/web_flow_adapter.hpp"
#include "flow_api_test_support.hpp"

int main() {
  using namespace flow_api_test;

  {
    FlowApiTestContext empty_context;
    expect_true(empty_context.initialize(), "empty web flow adapter context should initialize");

    controller::api::WebFlowAdapter empty_adapter(empty_context.api_service);
    const auto empty_list = empty_adapter.load_flow_list(0U);
    expect_true(empty_list.success, "empty list should still return a successful view response");
    expect_true(
        empty_list.value.has_value() &&
            empty_list.value->empty_state_message.find("Safe default") != std::string::npos,
        "empty list should explain the safe-default pulse fixture state");
  }

  FlowApiTestContext context({
      controller::hal::PulseInputChannelConfig{"pulse.main", 0U, 0.0, true},
      controller::hal::PulseInputChannelConfig{"pulse.aux", 0U, 0.0, true},
  });
  expect_true(context.initialize(), "web flow adapter context should initialize");

  auto main_flow = make_descriptor("main", "Main flow", "pulse.main");
  main_flow.batch_target_default = 3.0;
  main_flow.high_flow_threshold = 100.0;
  auto aux_flow = make_descriptor("aux", "Aux flow", "pulse.aux");
  aux_flow.no_flow_timeout_ms = 500U;

  expect_true(context.flow_service.register_flowmeter(main_flow).ok(), "main flow should register");
  expect_true(context.flow_service.register_flowmeter(aux_flow).ok(), "aux flow should register");
  expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow service should initialize");
  expect_true(context.flow_service.start_batch("main", 0U, std::nullopt, "test", "start").ok(), "batch should start");
  expect_true(context.hal.increment_mock_count("pulse.main", 20U).ok(), "main pulses should increment");
  expect_true(context.flow_service.tick(1000U).ok(), "tick should update flow state");

  controller::api::WebFlowAdapter adapter(context.api_service);

  const auto list = adapter.load_flow_list(1000U, std::optional<std::string>{"main"});
  expect_true(list.success, "adapter list should succeed");
  expect_true(list.value.has_value() && list.value->items.size() == 2U, "adapter list should build both items");
  expect_true(list.value.has_value() && list.value->items.front().selected, "selected flow should be preserved");

  const auto detail = adapter.load_flow_detail("main", 1000U, 5);
  expect_true(detail.success, "adapter detail should succeed");
  expect_true(
      detail.value.has_value() && detail.value->trend.points.size() == 1U,
      "detail should include the flow trend model");
  expect_true(
      detail.value.has_value() && !detail.value->badges.empty(),
      "detail should expose status badges");
  expect_true(
      detail.value.has_value() && detail.value->runtime_state_label == "Live flow",
      "detail should expose a derived runtime state label for the browser");

  bool saw_protected_badge = false;
  if (detail.value.has_value()) {
    for (const auto& badge : detail.value->badges) {
      if (badge.key == "protected_lifetime" && badge.active) {
        saw_protected_badge = true;
      }
    }
  }
  expect_true(saw_protected_badge, "protected lifetime indicator should be preserved");

  const auto stopped = adapter.stop_batch("main", make_command_context(1001U, "ui", "stop"));
  expect_true(stopped.accepted, "adapter stop command should delegate");
  expect_true(
      stopped.detail.has_value() && !stopped.detail->status.batch_active,
      "adapter stop command should return refreshed detail");

  const auto denied = adapter.stop_batch("main", make_command_context(1002U, "ui", "stop idle"));
  expect_true(!denied.accepted, "adapter should surface denied commands");
  expect_true(
      denied.code == controller::api::FlowUiResultCode::flow_ui_batch_stop_denied,
      "adapter denied command should keep stable error code");

  if (failures != 0) {
    std::cerr << "test_web_flow_adapter failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_flow_adapter passed\n";
  return 0;
}
