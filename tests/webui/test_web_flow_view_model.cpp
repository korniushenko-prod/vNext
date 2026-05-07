#include <iostream>

#include "api/web_flow_adapter.hpp"
#include "flow_api_test_support.hpp"

int main() {
  using namespace flow_api_test;

  controller::api::FlowStatusDto status;
  status.id = "main";
  status.name = "Main flow";
  status.enabled = true;
  status.unit = "L";
  status.raw_pulse_lifetime = "42";
  status.lifetime_total = 12.5;
  status.trip_total = 3.5;
  status.batch_total = 1.5;
  status.batch_active = true;
  status.batch_done = true;
  status.batch_target = 5.0;
  status.current_rate = 120.0;
  status.rate_time_window = 120.0;
  status.rate_pulse_frequency = 90.0;
  status.rate_avg_n = 100.0;
  status.no_flow = true;
  status.high_flow = true;
  status.last_pulse_age_ms = 2500U;
  status.descriptor_summary = controller::api::FlowDescriptorSummaryDto{
      "pulse.main",
      10.0,
      "time_window",
      60000U,
      3U,
      1000U,
      100.0,
      true,
      1000U,
      24U,
      true,
  };

  controller::api::FlowTrendDto trend;
  trend.flow_id = "main";
  trend.ordering = "oldest_to_newest";
  trend.bucket_ms = 1000U;
  trend.total_points = 2U;
  trend.points.push_back(controller::api::TrendPointDto{0U, 1.0, 60.0});
  trend.points.push_back(controller::api::TrendPointDto{1000U, 2.0, 120.0});

  std::vector<controller::api::FlowHistoryEntryDto> history = {
      controller::api::FlowHistoryEntryDto{1U, "main", "batch_started", 100U, "ui", "start", 5.0},
      controller::api::FlowHistoryEntryDto{2U, "main", "batch_completed", 200U, "flow_service", "target_reached", 5.0},
  };

  const auto detail = controller::api::WebFlowAdapter::build_detail_view_model(status, trend, history);
  expect_true(detail.runtime_state_label == "Live flow", "runtime state should describe active pulse traffic");
  expect_true(detail.runtime_state_tone == "ok", "runtime state tone should highlight live flow");
  expect_true(detail.prominent_rate_value == "120.00", "current rate should produce a prominent formatted value");
  expect_true(detail.prominent_rate_unit == "L/min", "current rate unit should stay visible");

  bool saw_no_flow = false;
  bool saw_high_flow = false;
  bool saw_protected = false;
  for (const auto& badge : detail.badges) {
    if (badge.key == "no_flow" && badge.active) {
      saw_no_flow = true;
    }
    if (badge.key == "high_flow" && badge.active) {
      saw_high_flow = true;
    }
    if (badge.key == "protected_lifetime" && badge.active) {
      saw_protected = true;
    }
  }
  expect_true(saw_no_flow, "no-flow badge should be represented");
  expect_true(saw_high_flow, "high-flow badge should be represented");
  expect_true(saw_protected, "protected lifetime badge should be represented");
  expect_true(detail.descriptor_read_only, "descriptor summary should remain read-only");
  expect_true(
      detail.descriptor_note.find("read-only") != std::string::npos,
      "descriptor section should explain that editing is postponed");
  expect_true(!detail.trend.points.empty() && detail.trend.points.front().volume_ratio == 0.5, "chart model should be deterministic");

  const auto empty_history = controller::api::WebFlowAdapter::build_history_view_model({});
  expect_true(empty_history.empty(), "empty history should stay empty");

  controller::api::FlowTrendDto empty_trend;
  empty_trend.flow_id = "main";
  empty_trend.ordering = "oldest_to_newest";
  empty_trend.bucket_ms = 1000U;
  const auto empty_trend_view = controller::api::WebFlowAdapter::build_trend_view_model(empty_trend);
  expect_true(!empty_trend_view.has_data, "empty trend should keep a no-data state");
  expect_true(
      empty_trend_view.empty_message == "No trend data yet.",
      "empty trend should expose a human-readable empty state");

  controller::api::FlowStatusDto waiting_status = status;
  waiting_status.raw_pulse_lifetime = "0";
  waiting_status.current_rate = 0.0;
  waiting_status.rate_time_window = 0.0;
  waiting_status.rate_pulse_frequency = 0.0;
  waiting_status.rate_avg_n = 0.0;
  waiting_status.no_flow = false;
  waiting_status.batch_active = false;
  const auto waiting_detail = controller::api::WebFlowAdapter::build_detail_view_model(waiting_status, empty_trend, {});
  expect_true(waiting_detail.runtime_state_label == "Waiting for pulses", "zero-pulse state should explain that the fixture is idle");
  expect_true(
      waiting_detail.runtime_state_detail.find("bound pulse input") != std::string::npos,
      "waiting state should explain that the flow is configured but has not counted pulses");

  if (failures != 0) {
    std::cerr << "test_web_flow_view_model failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_flow_view_model passed\n";
  return 0;
}
