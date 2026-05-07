#include <iostream>

#include "flow_api_test_support.hpp"

int main() {
  using namespace flow_api_test;

  {
    FlowApiTestContext context({
        controller::hal::PulseInputChannelConfig{"pulse.batch", 0U, 0.0, true},
    });
    expect_true(context.initialize(), "flow api commands context should initialize");

    auto descriptor = make_descriptor("batch", "Batch flow", "pulse.batch");
    descriptor.batch_target_default = 2.0;

    expect_true(context.flow_service.register_flowmeter(descriptor).ok(), "flow should register");
    expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow should initialize");

    const auto started = context.api_service.start_batch("batch", std::nullopt, make_command_context(1U, "ui", "start"));
    expect_true(started.accepted, "start_batch should delegate successfully");
    expect_true(started.detail.has_value() && started.detail->batch_active, "start command should return updated batch state");

    expect_true(context.hal.increment_mock_count("pulse.batch", 10U).ok(), "batch pulses should increment");
    expect_true(context.flow_service.tick(1000U).ok(), "tick after start should succeed");

    const auto stopped = context.api_service.stop_batch("batch", make_command_context(1001U, "ui", "stop"));
    expect_true(stopped.accepted, "stop_batch should delegate successfully");
    expect_true(stopped.detail.has_value() && !stopped.detail->batch_active, "stop command should clear active batch");

    const auto reset_batch = context.api_service.reset_batch_total("batch", make_command_context(1002U, "ui", "reset batch"));
    expect_true(reset_batch.accepted, "reset_batch_total should delegate successfully");
    expect_true(
        reset_batch.detail.has_value() && approx_equal(reset_batch.detail->batch_total, 0.0),
        "reset_batch_total should clear batch total");

    const auto reset_trip = context.api_service.reset_trip_total("batch", make_command_context(1003U, "ui", "reset trip"));
    expect_true(reset_trip.accepted, "reset_trip_total should delegate successfully");
    expect_true(
        reset_trip.detail.has_value() && approx_equal(reset_trip.detail->trip_total, 0.0),
        "reset_trip_total should clear trip total");
  }

  {
    FlowApiTestContext context({
        controller::hal::PulseInputChannelConfig{"pulse.batch", 0U, 0.0, true},
    });
    expect_true(context.initialize(), "flow api denied command context should initialize");

    auto descriptor = make_descriptor("batch", "Batch flow", "pulse.batch");
    descriptor.batch_target_default = 2.0;
    expect_true(context.flow_service.register_flowmeter(descriptor).ok(), "flow should register for denied start");
    expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow should initialize for denied start");
    expect_true(context.flow_service.start_batch("batch", 0U, std::nullopt, "test", "already started").ok(), "batch should already be active");

    const auto denied = context.api_service.start_batch("batch", std::nullopt, make_command_context(1U, "ui", "duplicate start"));
    expect_true(!denied.accepted, "duplicate start should be denied");
    expect_true(
        denied.status.code == controller::api::FlowUiResultCode::flow_ui_batch_start_denied,
        "duplicate start should surface FLOW_UI_BATCH_START_DENIED");
    expect_true(
        denied.status.message.find("already active") != std::string::npos,
        "denied command should preserve the structured reason");
  }

  if (failures != 0) {
    std::cerr << "test_flow_api_commands failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_api_commands passed\n";
  return 0;
}
