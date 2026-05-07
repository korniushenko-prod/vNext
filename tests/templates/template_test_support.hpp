#pragma once

#include <algorithm>
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

#include "api/template_api_service.hpp"
#include "api/web_template_adapter.hpp"
#include "logic/logic_service.hpp"
#include "pid/pid_service.hpp"
#include "../sequence/sequence_test_support.hpp"

namespace template_test {

inline int failures = 0;

inline void expect_true(bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

inline void expect_false(bool condition, const std::string& message) {
  expect_true(!condition, message);
}

inline void expect_equal(
    const std::string& actual,
    const std::string& expected,
    const std::string& message) {
  if (actual != expected) {
    std::cerr << "FAIL: " << message << " (expected '" << expected << "', got '" << actual << "')\n";
    ++failures;
  }
}

inline void expect_equal(
    const std::size_t actual,
    const std::size_t expected,
    const std::string& message) {
  if (actual != expected) {
    std::cerr << "FAIL: " << message << " (expected " << expected << ", got " << actual << ")\n";
    ++failures;
  }
}

inline bool contains_issue_code(
    const std::vector<controller::templates::TemplateIssue>& issues,
    const std::string& code) {
  return std::any_of(
      issues.begin(),
      issues.end(),
      [&](const controller::templates::TemplateIssue& issue) { return issue.code == code; });
}

inline bool contains_text(
    const std::vector<std::string>& values,
    const std::string& needle) {
  return std::find(values.begin(), values.end(), needle) != values.end();
}

struct TemplateTestContext {
  sequence_test::SequenceTestContext sequence;
  controller::logic::LogicService logic_service;
  controller::pid::PidService pid_service;
  controller::templates::TemplateEngine engine;
  controller::api::TemplateApiService api_service;
  controller::api::WebTemplateAdapter web_adapter;

  TemplateTestContext()
      : sequence(),
        logic_service(sequence.registry, sequence.actuator_manager, sequence.timer_service, sequence.alarm_service, sequence.sequence_service),
        pid_service(sequence.registry, sequence.actuator_manager),
        engine(sequence.registry, sequence.actuator_manager, sequence.timer_service, sequence.alarm_service, logic_service, sequence.sequence_service, pid_service),
        api_service(sequence.registry, sequence.actuator_manager, sequence.timer_service, sequence.alarm_service, logic_service, sequence.sequence_service, pid_service),
        web_adapter(api_service) {}

  bool initialize() {
    using controller::signals::SignalType;
    return sequence.initialize() &&
           sequence.registry.register_signal(sequence_test::make_signal_descriptor("signal.pressure", "Pressure", SignalType::float64)).ok() &&
           sequence.registry.register_signal(sequence_test::make_signal_descriptor("signal.pressure_bool", "Pressure Bool", SignalType::boolean)).ok() &&
           sequence.registry.register_signal(sequence_test::make_signal_descriptor("signal.fault", "Fault", SignalType::boolean)).ok() &&
           sequence.registry.register_signal(sequence_test::make_signal_descriptor("signal.batch_done", "Batch Done", SignalType::boolean)).ok() &&
           sequence.registry.update_signal("signal.pressure", controller::signals::SignalValue{4.2}, 0U).ok() &&
           sequence.registry.update_signal("signal.pressure_bool", controller::signals::SignalValue{false}, 0U).ok() &&
           sequence.registry.update_signal("signal.fault", controller::signals::SignalValue{false}, 0U).ok();
  }
};

inline controller::templates::TemplateDraft make_pressure_pump_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "pump.template_1";
  draft.template_kind = controller::templates::TemplateKind::pressure_pump;
  draft.display_name = "Pump Template 1";
  draft.bindings["pressure_signal"] = "signal.pressure";
  draft.bindings["primary_output"] = "relay.main";
  draft.parameters["start_threshold"] = 2.0;
  draft.parameters["stop_threshold"] = 5.0;
  draft.parameters["hysteresis"] = 0.2;
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_pump_with_flowmeter_draft() {
  auto draft = make_pressure_pump_draft();
  draft.instance_id = "pump.flow_1";
  draft.template_kind = controller::templates::TemplateKind::pump_with_flowmeter;
  draft.display_name = "Pump Flow 1";
  draft.bindings["flow_rate_signal"] = "signal.flow_rate";
  draft.parameters["min_flow_threshold"] = 1.0;
  draft.parameters["high_trip_threshold"] = 8.0;
  return draft;
}

inline controller::templates::TemplateDraft make_batch_dosing_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "batch.dose_1";
  draft.template_kind = controller::templates::TemplateKind::batch_dosing;
  draft.display_name = "Batch Dose 1";
  draft.bindings["primary_output"] = "relay.valve";
  draft.bindings["batch_done_signal"] = "signal.batch_done";
  draft.bindings["fault_signal"] = "signal.fault";
  draft.parameters["target_volume"] = 25.0;
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_pid_pressure_pwm_pump_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "pid.pressure_1";
  draft.template_kind = controller::templates::TemplateKind::pid_pressure_pwm_pump;
  draft.display_name = "PID Pressure 1";
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

inline controller::templates::TemplateDraft make_pid_flow_pwm_pump_draft() {
  auto draft = make_pid_pressure_pwm_pump_draft();
  draft.instance_id = "pid.flow_1";
  draft.template_kind = controller::templates::TemplateKind::pid_flow_pwm_pump;
  draft.display_name = "PID Flow 1";
  draft.bindings.erase("pressure_signal");
  draft.bindings["flow_rate_signal"] = "signal.flow_rate";
  draft.parameters.erase("high_trip_threshold");
  return draft;
}

inline controller::templates::TemplateDraft make_compressor_basic_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "compressor.basic_1";
  draft.template_kind = controller::templates::TemplateKind::compressor_basic;
  draft.display_name = "Compressor 1";
  draft.bindings["main_output"] = "relay.main";
  draft.bindings["pressure_signal"] = "signal.pressure";
  draft.bindings["fault_signal"] = "signal.fault";
  draft.parameters["cooldown_ms"] = std::int64_t{5000};
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_burner_supervisory_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "burner.supervisor_1";
  draft.template_kind = controller::templates::TemplateKind::burner_supervisory_skeleton;
  draft.display_name = "Burner Supervisor 1";
  draft.bindings["fan_output"] = "relay.fan";
  draft.bindings["ignition_output"] = "relay.ignition";
  draft.bindings["fuel_output"] = "relay.fuel";
  draft.bindings["flame_signal"] = "signal.flame";
  draft.bindings["air_ok_signal"] = "signal.air_ok";
  draft.parameters["prepurge_ms"] = std::int64_t{5000};
  draft.parameters["ignition_timeout_ms"] = std::int64_t{3000};
  draft.parameters["postpurge_ms"] = std::int64_t{4000};
  draft.create_disabled = true;
  return draft;
}

inline controller::templates::TemplateDraft make_incinerator_supervisory_draft() {
  controller::templates::TemplateDraft draft;
  draft.instance_id = "incinerator.supervisor_1";
  draft.template_kind = controller::templates::TemplateKind::incinerator_supervisory_skeleton;
  draft.display_name = "Incinerator Supervisor 1";
  draft.bindings["fan_output"] = "pwm.fan";
  draft.bindings["diesel_output"] = "relay.diesel";
  draft.bindings["sludge_output"] = "pwm.valve";
  draft.bindings["chamber_temp_signal"] = "signal.chamber_temp";
  draft.bindings["flame_signal"] = "signal.flame";
  draft.bindings["sludge_ready_signal"] = "signal.sludge_ready";
  draft.parameters["warmup_temp"] = 250.0;
  draft.parameters["cooldown_temp"] = 120.0;
  draft.create_disabled = true;
  return draft;
}

inline controller::api::CommandContext make_command_context(std::uint64_t now_ms) {
  controller::api::CommandContext context;
  context.now_ms = now_ms;
  context.source = "template_test";
  context.reason = "apply";
  context.actor = std::string{"tester"};
  return context;
}

}  // namespace template_test
