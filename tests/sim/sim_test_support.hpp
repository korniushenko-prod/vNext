#pragma once

#include <cstdint>
#include <cmath>
#include <iostream>
#include <optional>
#include <string>
#include <vector>

#include "flow/flow_descriptor.hpp"
#include "pid/pid_service_types.hpp"
#include "sequence/sequence_history.hpp"
#include "sequence/sequence_snapshot.hpp"
#include "sim/sim_harness.hpp"
#include "templates/template_draft.hpp"

namespace sim_test {

inline int failures = 0;

inline void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

inline void expect_near(
    const double actual,
    const double expected,
    const double tolerance,
    const std::string& message) {
  if (std::fabs(actual - expected) > tolerance) {
    std::cerr << "FAIL: " << message << " expected=" << expected << " actual=" << actual << '\n';
    ++failures;
  }
}

inline void expect_equal(
    const std::string& actual,
    const std::string& expected,
    const std::string& message) {
  if (actual != expected) {
    std::cerr << "FAIL: " << message << " expected='" << expected << "' actual='" << actual << "'\n";
    ++failures;
  }
}

inline controller::templates::TemplateDraft make_pressure_pump_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "pressure.sim_1";
  draft.template_kind = controller::templates::TemplateKind::pressure_pump;
  draft.display_name = "Pressure Sim";
  draft.bindings["pressure_signal"] = "signal.pressure";
  draft.bindings["primary_output"] = "relay.main";
  draft.parameters["start_threshold"] = 2.0;
  draft.parameters["stop_threshold"] = 5.0;
  draft.parameters["hysteresis"] = 0.2;
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_pid_pressure_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "pid.sim_1";
  draft.template_kind = controller::templates::TemplateKind::pid_pressure_pwm_pump;
  draft.display_name = "PID Pressure Sim";
  draft.bindings["pressure_signal"] = "signal.pressure";
  draft.bindings["pwm_output"] = "pwm.main";
  draft.parameters["setpoint"] = 5.0;
  draft.parameters["kp"] = 1.0;
  draft.parameters["ki"] = 0.5;
  draft.parameters["kd"] = 0.1;
  draft.parameters["output_min"] = 0.0;
  draft.parameters["output_max"] = 100.0;
  draft.parameters["deadband"] = 0.0;
  draft.parameters["high_trip_threshold"] = 9.0;
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_batch_dosing_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "batch.sim_1";
  draft.template_kind = controller::templates::TemplateKind::batch_dosing;
  draft.display_name = "Batch Sim";
  draft.bindings["primary_output"] = "relay.valve";
  draft.bindings["batch_done_signal"] = "flow.flow1.batch_done";
  draft.bindings["fault_signal"] = "signal.fault";
  draft.parameters["target_volume"] = 2.0;
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_burner_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "burner.sim_1";
  draft.template_kind = controller::templates::TemplateKind::burner_supervisory_skeleton;
  draft.display_name = "Burner Sim";
  draft.bindings["fan_output"] = "relay.fan";
  draft.bindings["ignition_output"] = "relay.ignition";
  draft.bindings["fuel_output"] = "relay.fuel";
  draft.bindings["flame_signal"] = "signal.flame";
  draft.bindings["air_ok_signal"] = "signal.air_ok";
  draft.parameters["prepurge_ms"] = std::int64_t{1000};
  draft.parameters["ignition_timeout_ms"] = std::int64_t{900};
  draft.parameters["postpurge_ms"] = std::int64_t{700};
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_incinerator_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "incinerator.sim_1";
  draft.template_kind = controller::templates::TemplateKind::incinerator_supervisory_skeleton;
  draft.display_name = "Incinerator Sim";
  draft.bindings["fan_output"] = "pwm.fan";
  draft.bindings["diesel_output"] = "relay.diesel";
  draft.bindings["sludge_output"] = "pwm.valve";
  draft.bindings["chamber_temp_signal"] = "signal.chamber_temp";
  draft.bindings["flame_signal"] = "signal.flame";
  draft.bindings["sludge_ready_signal"] = "signal.sludge_ready";
  draft.parameters["warmup_temp"] = 90.0;
  draft.parameters["cooldown_temp"] = 45.0;
  draft.create_disabled = true;
  return draft;
}

inline controller::flow::FlowDescriptor make_flow_descriptor() {
  controller::flow::FlowDescriptor descriptor;
  descriptor.id = "flow1";
  descriptor.name = "Flow 1";
  descriptor.enabled = true;
  descriptor.pulse_input_id = "pulse.flow1";
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = controller::flow::FlowRateMode::time_window;
  descriptor.time_window_ms = 60000U;
  descriptor.avg_last_n_pulses = 3U;
  descriptor.batch_target_default = 2.0;
  descriptor.no_flow_timeout_ms = 1000U;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_enabled = true;
  descriptor.trend_bucket_ms = 1000U;
  descriptor.trend_bucket_count = 8U;
  descriptor.protected_lifetime_totals = true;
  return descriptor;
}

inline std::vector<std::string> entered_state_order(const std::vector<controller::sequence::SequenceHistoryEntry>& history) {
  std::vector<std::string> states;
  for (const auto& entry : history) {
    if (entry.event_type == controller::sequence::SequenceEventType::state_entered && entry.to_state.has_value()) {
      states.push_back(*entry.to_state);
    }
  }
  return states;
}

inline bool contains_state_sequence(
    const std::vector<std::string>& states,
    const std::vector<std::string>& subsequence) {
  std::size_t index = 0U;
  for (const auto& state : states) {
    if (index < subsequence.size() && state == subsequence[index]) {
      ++index;
    }
  }
  return index == subsequence.size();
}

inline bool history_contains_reason(
    const std::vector<controller::sequence::SequenceHistoryEntry>& history,
    const std::string& expected_fragment) {
  for (const auto& entry : history) {
    if (entry.reason.find(expected_fragment) != std::string::npos) {
      return true;
    }
  }
  return false;
}

inline std::optional<controller::sequence::SequenceSnapshot> find_program_snapshot(
    const std::vector<controller::sequence::SequenceSnapshot>& snapshots,
    const std::string& program_id) {
  for (const auto& snapshot : snapshots) {
    if (snapshot.program_id == program_id) {
      return snapshot;
    }
  }
  return std::nullopt;
}

}  // namespace sim_test
