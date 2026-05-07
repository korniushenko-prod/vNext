#include <iostream>

#include "flow_api_test_support.hpp"

int main() {
  using namespace flow_api_test;

  {
    FlowApiTestContext empty_context;
    expect_true(empty_context.initialize(), "empty flow api errors context should initialize");

    const auto default_status = empty_context.api_service.get_active_or_default_flowmeter_status(0U);
    expect_true(!default_status.ok(), "default status should fail when no flowmeters are registered");
    expect_true(
        default_status.status.code == controller::api::FlowUiResultCode::flow_ui_no_flowmeters,
        "no flowmeters should use FLOW_UI_NO_FLOWMETERS");
    expect_true(
        default_status.status.message.find("Safe default") != std::string::npos,
        "no-flowmeters status should explain the safe-default hardware state");
  }

  {
    FlowApiTestContext context({
        controller::hal::PulseInputChannelConfig{"pulse.main", 0U, 0.0, true},
    });
    expect_true(context.initialize(), "flow api errors context should initialize");

    expect_true(
        context.flow_service.register_flowmeter(make_descriptor("main", "Main flow", "pulse.main")).ok(),
        "flow should register");
    expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow should initialize");

    const auto invalid_context = context.api_service.start_batch(
        "main",
        std::nullopt,
        make_command_context(1U, "", "missing source"));
    expect_true(!invalid_context.accepted, "empty command source should be rejected");
    expect_true(
        invalid_context.status.code == controller::api::FlowUiResultCode::flow_ui_invalid_argument,
        "invalid command context should use FLOW_UI_INVALID_ARGUMENT");

    const auto missing = context.api_service.get_flowmeter_history("missing", 5);
    expect_true(!missing.ok(), "unknown flow history should fail");
    expect_true(
        missing.status.code == controller::api::FlowUiResultCode::flow_ui_flow_not_found,
        "unknown flow history should use FLOW_UI_FLOW_NOT_FOUND");

    const auto stop_idle = context.api_service.stop_batch("main", make_command_context(2U, "ui", "stop idle"));
    expect_true(!stop_idle.accepted, "stopping an idle batch should be denied");
    expect_true(
        stop_idle.status.code == controller::api::FlowUiResultCode::flow_ui_batch_stop_denied,
        "stopping an idle batch should use FLOW_UI_BATCH_STOP_DENIED");
  }

  if (failures != 0) {
    std::cerr << "test_flow_api_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_api_errors passed\n";
  return 0;
}
