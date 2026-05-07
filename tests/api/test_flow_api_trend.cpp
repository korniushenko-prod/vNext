#include <iostream>

#include "flow_api_test_support.hpp"

int main() {
  using namespace flow_api_test;

  FlowApiTestContext context({
      controller::hal::PulseInputChannelConfig{"pulse.trend", 0U, 0.0, true},
  });
  expect_true(context.initialize(), "flow api trend context should initialize");

  auto descriptor = make_descriptor("trend", "Trend flow", "pulse.trend");
  descriptor.trend_bucket_ms = 1000U;
  descriptor.trend_bucket_count = 3U;
  descriptor.batch_target_default = 1.0;

  expect_true(context.flow_service.register_flowmeter(descriptor).ok(), "trend flow should register");
  expect_true(context.flow_service.initialize_from_storage(0U).ok(), "trend flow should initialize");

  const auto empty_trend = context.api_service.get_flowmeter_trend("trend");
  expect_true(empty_trend.ok(), "empty trend should still succeed");
  expect_true(empty_trend.ok() && empty_trend.value->points.empty(), "empty trend should expose zero points");

  expect_true(context.hal.increment_mock_count("pulse.trend", 10U).ok(), "bucket 0 pulses should increment");
  expect_true(context.flow_service.tick(0U).ok(), "bucket 0 tick should succeed");
  expect_true(context.hal.increment_mock_count("pulse.trend", 20U).ok(), "bucket 1000 pulses should increment");
  expect_true(context.flow_service.tick(1000U).ok(), "bucket 1000 tick should succeed");
  expect_true(context.flow_service.start_batch("trend", 1500U, std::nullopt, "ui", "start").ok(), "batch should start for history");
  expect_true(context.flow_service.stop_batch("trend", 1600U, "ui", "stop").ok(), "batch should stop for history");
  expect_true(context.flow_service.reset_batch_total("trend", 1700U, "ui", "reset").ok(), "batch total reset should record history");

  const auto trend = context.api_service.get_flowmeter_trend("trend");
  expect_true(trend.ok(), "trend retrieval should succeed");
  expect_true(trend.ok() && trend.value->ordering == "oldest_to_newest", "trend ordering should be documented");
  expect_true(trend.ok() && trend.value->points.size() == 2U, "trend points should be preserved");
  expect_true(trend.ok() && trend.value->points.at(0).bucket_start_ms == 0U, "trend should keep oldest bucket first");
  expect_true(trend.ok() && trend.value->points.at(1).bucket_start_ms == 1000U, "trend should keep newest bucket last");

  const auto history = context.api_service.get_flowmeter_history("trend", 2);
  expect_true(history.ok(), "history retrieval should succeed");
  expect_true(history.ok() && history.value->size() == 2U, "history limit should keep a recent bounded slice");
  expect_true(
      history.ok() && history.value->at(0).event_type == "batch_stopped",
      "bounded history should preserve oldest-to-newest order within the retained slice");
  expect_true(
      history.ok() && history.value->at(1).event_type == "batch_total_reset",
      "latest retained history event should remain last");

  if (failures != 0) {
    std::cerr << "test_flow_api_trend failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_flow_api_trend passed\n";
  return 0;
}
