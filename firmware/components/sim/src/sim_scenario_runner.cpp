#include "sim/sim_scenario_runner.hpp"

#include <algorithm>
#include <utility>

#include "sim/sim_harness.hpp"

namespace controller::sim {

SimScenarioRunner::SimScenarioRunner(SimHarness& harness, std::string scenario_name)
    : harness_(harness),
      scenario_name_(std::move(scenario_name)),
      clock_(0U) {}

SimClock& SimScenarioRunner::clock() {
  return clock_;
}

const SimClock& SimScenarioRunner::clock() const {
  return clock_;
}

SimSignalInjector& SimScenarioRunner::injector() {
  return injector_;
}

const SimSignalInjector& SimScenarioRunner::injector() const {
  return injector_;
}

SimStatus SimScenarioRunner::add_component(SimComponent& component) {
  const auto duplicate = std::find_if(components_.begin(), components_.end(), [&](SimComponent* existing) {
    return existing->component_id() == component.component_id();
  });
  if (duplicate != components_.end()) {
    return SimStatus::error(
        SimErrorCode::sim_duplicate_id,
        "Simulator component id '" + component.component_id() + "' is already registered.");
  }
  components_.push_back(&component);
  return SimStatus::success();
}

bool SimScenarioRunner::assertion_less(const SimScheduledAssertion& lhs, const SimScheduledAssertion& rhs) {
  if (lhs.at_ms != rhs.at_ms) {
    return lhs.at_ms < rhs.at_ms;
  }
  return lhs.id < rhs.id;
}

SimStatus SimScenarioRunner::add_assertion(const SimScheduledAssertion& assertion) {
  const auto duplicate = std::find_if(assertions_.begin(), assertions_.end(), [&](const SimScheduledAssertion& existing) {
    return existing.id == assertion.id;
  });
  if (duplicate != assertions_.end()) {
    return SimStatus::error(
        SimErrorCode::sim_duplicate_id,
        "Simulator assertion id '" + assertion.id + "' is already registered.");
  }
  assertions_.push_back(assertion);
  std::sort(assertions_.begin(), assertions_.end(), assertion_less);
  return SimStatus::success();
}

SimScenarioRunReport SimScenarioRunner::run_for(const SimDurationMs total_ms, const SimDurationMs step_ms) {
  SimScenarioRunReport report;
  report.scenario_name = scenario_name_;
  report.status = SimStatus::success();
  report.started_at_ms = clock_.now_ms();
  report.ended_at_ms = clock_.now_ms();
  report.total_requested_ms = total_ms;
  report.step_ms = step_ms;

  if (step_ms == 0U) {
    report.status = SimStatus::error(
        SimErrorCode::sim_invalid_configuration,
        "Scenario runner step_ms must be greater than zero.");
    report.reason = report.status.message;
    return report;
  }

  auto init_status = harness_.initialize();
  if (!init_status.ok()) {
    report.status = init_status;
    report.reason = init_status.message;
    return report;
  }

  for (auto* component : components_) {
    if (component == nullptr || component->is_initialized()) {
      continue;
    }
    init_status = component->initialize(harness_, clock_.now_ms());
    if (!init_status.ok()) {
      report.status = init_status;
      report.reason = init_status.message;
      return report;
    }
  }

  std::size_t processed_now = 0U;
  auto status = injector_.process_due_events(harness_, clock_.now_ms(), processed_now);
  if (!status.ok()) {
    report.status = status;
    report.reason = status.message;
    return report;
  }
  report.events_processed += processed_now;

  for (auto& assertion : assertions_) {
    if (assertion.processed || assertion.at_ms > clock_.now_ms()) {
      continue;
    }
    const auto assertion_status =
        assertion.callback != nullptr
            ? assertion.callback(harness_, clock_.now_ms())
            : SimStatus::error(SimErrorCode::sim_assertion_failed, "Scheduled simulator assertion has no callback.");
    if (!assertion_status.ok()) {
      report.status = assertion_status.code == SimErrorCode::ok
                          ? SimStatus::error(SimErrorCode::sim_assertion_failed, assertion_status.message)
                          : assertion_status;
      report.reason = "Assertion '" + assertion.id + "' failed: " + report.status.message;
      report.stopped_early = true;
      return report;
    }
    assertion.processed = true;
    ++report.assertions_processed;
  }

  const SimTimestampMs end_ms = report.started_at_ms + total_ms;
  while (clock_.now_ms() < end_ms) {
    const auto delta_ms = std::min<SimDurationMs>(step_ms, end_ms - clock_.now_ms());
    clock_.advance_ms(delta_ms);
    const auto now_ms = clock_.now_ms();

    std::size_t processed_events = 0U;
    status = injector_.process_due_events(harness_, now_ms, processed_events);
    if (!status.ok()) {
      report.status = status;
      report.reason = status.message;
      report.ended_at_ms = now_ms;
      report.stopped_early = true;
      return report;
    }
    report.events_processed += processed_events;

    status = harness_.tick_pre_plants(now_ms, delta_ms);
    if (!status.ok()) {
      report.status = status;
      report.reason = status.message;
      report.ended_at_ms = now_ms;
      report.stopped_early = true;
      return report;
    }

    for (auto* component : components_) {
      status = component->step(harness_, now_ms, delta_ms);
      if (!status.ok()) {
        report.status = status;
        report.reason = status.message;
        report.ended_at_ms = now_ms;
        report.stopped_early = true;
        return report;
      }
    }

    status = harness_.tick_post_plants(now_ms, delta_ms);
    if (!status.ok()) {
      report.status = status;
      report.reason = status.message;
      report.ended_at_ms = now_ms;
      report.stopped_early = true;
      return report;
    }

    for (auto& assertion : assertions_) {
      if (assertion.processed || assertion.at_ms > now_ms) {
        continue;
      }
      const auto assertion_status =
          assertion.callback != nullptr
              ? assertion.callback(harness_, now_ms)
              : SimStatus::error(SimErrorCode::sim_assertion_failed, "Scheduled simulator assertion has no callback.");
      if (!assertion_status.ok()) {
        report.status = assertion_status.code == SimErrorCode::ok
                            ? SimStatus::error(SimErrorCode::sim_assertion_failed, assertion_status.message)
                            : assertion_status;
        report.reason = "Assertion '" + assertion.id + "' failed: " + report.status.message;
        report.ended_at_ms = now_ms;
        report.stopped_early = true;
        return report;
      }
      assertion.processed = true;
      ++report.assertions_processed;
    }

    ++report.steps_executed;
    report.ended_at_ms = now_ms;
  }

  report.completed = true;
  report.reason = "Scenario completed.";
  return report;
}

}  // namespace controller::sim
