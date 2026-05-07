#include <iostream>

#include "flow_api_test_support.hpp"

int main() {
  using namespace flow_api_test;

  FlowApiTestContext context({
      controller::hal::PulseInputChannelConfig{"pulse.main", 0U, 50.0, true},
  });
  expect_true(context.initialize(), "flow api status context should initialize");

  auto descriptor = make_descriptor("main", "Main flow", "pulse.main");
  descriptor.batch_target_default = 5.0;
  descriptor.high_flow_threshold = 100.0;
  descriptor.avg_last_n_pulses = 4U;
  descriptor.trend_bucket_count = 12U;

  expect_true(context.flow_service.register_flowmeter(descriptor).ok(), "flow should register");
  expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow should initialize");
  expect_true(context.flow_service.start_batch("main", 0U, std::nullopt, "test", "start").ok(), "batch should start");
  expect_true(context.hal.increment_mock_count("pulse.main", 20U).ok(), "pulses should increment");
  expect_true(context.flow_service.tick(1000U).ok(), "tick should update snapshot");

  const auto status = context.api_service.get_flowmeter_status("main", 1000U);
  expect_true(status.ok(), "get_flowmeter_status should succeed");
  expect_true(status.ok() && status.value->id == "main", "status should keep flow id");
  expect_true(status.ok() && status.value->raw_pulse_lifetime == "20", "raw pulse lifetime should be string-mapped");
  expect_true(status.ok() && approx_equal(status.value->lifetime_total, 2.0), "lifetime total should map");
  expect_true(status.ok() && approx_equal(status.value->trip_total, 2.0), "trip total should map");
  expect_true(status.ok() && approx_equal(status.value->batch_total, 2.0), "batch total should map");
  expect_true(status.ok() && status.value->batch_active, "batch active should map");
  expect_true(status.ok() && status.value->batch_target == std::optional<double>{5.0}, "default batch target should surface");
  expect_true(status.ok() && approx_equal(status.value->current_rate, 120.0), "current rate should map");
  expect_true(status.ok() && status.value->high_flow, "high_flow should map");
  expect_true(status.ok() && !status.value->no_flow, "no_flow should remain false after recent pulse");
  expect_true(status.ok() && status.value->descriptor_summary.pulse_input_id == "pulse.main", "descriptor summary should be included");
  expect_true(
      status.ok() && status.value->descriptor_summary.primary_rate_mode == "time_window",
      "primary rate mode should be read-only summary text");
  expect_true(
      status.ok() && status.value->descriptor_summary.protected_lifetime_totals,
      "protected lifetime total should be exposed as read-only/protected");

  const auto missing = context.api_service.get_flowmeter_status("missing", 1000U);
  expect_true(!missing.ok(), "unknown flow id should fail");
  expect_true(
      missing.status.code == controller::api::FlowUiResultCode::flow_ui_flow_not_found,
      "unknown flow id should use FLOW_UI_FLOW_NOT_FOUND");

  if (failures != 0) {
    std::cerr << "test_flow_api_status failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_api_status passed\n";
  return 0;
}
