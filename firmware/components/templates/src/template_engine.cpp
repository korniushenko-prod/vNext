#include "templates/template_engine.hpp"

#include <algorithm>
#include <cctype>
#include <cstdint>
#include <sstream>
#include <string>
#include <type_traits>
#include <utility>

#include "conditions/condition_node.hpp"
#include "conditions/condition_tree.hpp"
#include "hal/relay_hal.hpp"
#include "logic/rule_action.hpp"
#include "sequence/sequence_action.hpp"
#include "sequence/sequence_state.hpp"
#include "sequence/sequence_transition.hpp"

namespace controller::templates {

namespace {

using controller::actuators::ActuatorRole;
using controller::actuators::ActuatorTargetKind;
using controller::alarms::AlarmDescriptor;
using controller::alarms::AlarmSeverity;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionTree;
using controller::hal::RelayState;
using controller::logic::RuleAction;
using controller::logic::RuleActionKind;
using controller::logic::RuleAlarmSetConditionAction;
using controller::logic::RuleDescriptor;
using controller::logic::RulePwmRequestAction;
using controller::logic::RuleRelayRequestAction;
using controller::pid::PidConfig;
using controller::pid::PidMode;
using controller::pid::PidServiceDescriptor;
using controller::pid::PidSetpointSourceKind;
using controller::sequence::SequenceAction;
using controller::sequence::SequenceActionKind;
using controller::sequence::SequenceLogNoteAction;
using controller::sequence::SequenceProgram;
using controller::sequence::SequenceProgramType;
using controller::sequence::SequencePwmRequestAction;
using controller::sequence::SequenceRelayRequestAction;
using controller::sequence::SequenceState;
using controller::sequence::SequenceStateType;
using controller::sequence::SequenceTransition;
using controller::signals::SignalType;

constexpr const char* kSourceModule = "template_engine";

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](unsigned char ch) {
    return !std::isspace(ch);
  });
}

std::string placeholder_instance_id(const std::string& instance_id) {
  return has_text(instance_id) ? instance_id : "<instance_id>";
}

std::string placeholder_display_name(const std::string& display_name, const std::string& fallback) {
  return has_text(display_name) ? display_name : fallback;
}

std::string make_artifact_id(
    const std::string& instance_id,
    const std::string& group,
    const std::string& name) {
  return instance_id + "." + group + "." + name;
}

std::string make_outline_artifact_id(
    const std::string& instance_id,
    const std::string& group,
    const std::string& name) {
  return placeholder_instance_id(instance_id) + "." + group + "." + name;
}

void append_issue(
    std::vector<TemplateIssue>& issues,
    std::string path,
    std::string code,
    const TemplateIssueSeverity severity,
    std::string message) {
  issues.push_back(TemplateIssue{
      std::move(path),
      std::move(code),
      severity,
      std::move(message),
  });
}

void merge_issues(std::vector<TemplateIssue>& target, const std::vector<TemplateIssue>& source) {
  target.insert(target.end(), source.begin(), source.end());
}

TemplateErrorCode derive_error_code(const std::vector<TemplateIssue>& issues) {
  for (const auto& issue : issues) {
    if (issue.severity != TemplateIssueSeverity::error) {
      continue;
    }
    if (issue.code == "TEMPLATE_UNSUPPORTED_KIND") {
      return TemplateErrorCode::template_unsupported_kind;
    }
    if (issue.code == "TEMPLATE_DUPLICATE_RESULTING_ID") {
      return TemplateErrorCode::template_duplicate_resulting_id;
    }
    if (issue.code == "TEMPLATE_ACTIVE_PROGRAM_PRESENT") {
      return TemplateErrorCode::template_active_program_present;
    }
  }
  return TemplateErrorCode::template_invalid_draft;
}

void finalize_validation(TemplateValidationResult& result, const std::string& success_message) {
  const auto blocking = std::find_if(
      result.issues.begin(),
      result.issues.end(),
      [](const TemplateIssue& issue) { return issue.severity == TemplateIssueSeverity::error; });
  if (blocking == result.issues.end()) {
    result.status = TemplateStatus::success(success_message);
    return;
  }

  result.status = TemplateStatus::error(derive_error_code(result.issues), blocking->message);
}

bool has_parameter(const TemplateDraft& draft, const std::string& parameter_id) {
  return draft.parameters.find(parameter_id) != draft.parameters.end();
}

bool has_binding(const TemplateDraft& draft, const std::string& slot_id) {
  const auto it = draft.bindings.find(slot_id);
  return it != draft.bindings.end() && has_text(it->second);
}

std::string binding_or_empty(const TemplateDraft& draft, const std::string& slot_id) {
  const auto it = draft.bindings.find(slot_id);
  return it == draft.bindings.end() ? std::string{} : it->second;
}

template <typename T>
const T* value_if(const controller::signals::SignalValue& value) {
  return std::get_if<T>(&value);
}

bool parameter_matches_type(
    const TemplateParameterDefinition& definition,
    const TemplateParameterValue& value) {
  switch (definition.type) {
    case TemplateParameterType::boolean:
      return std::holds_alternative<bool>(value);
    case TemplateParameterType::int64:
      return std::holds_alternative<std::int64_t>(value);
    case TemplateParameterType::float64:
      return std::holds_alternative<double>(value) || std::holds_alternative<std::int64_t>(value);
    case TemplateParameterType::string:
      return std::holds_alternative<std::string>(value);
  }
  return false;
}

std::optional<double> parameter_as_double(
    const TemplateDraft& draft,
    const std::string& parameter_id) {
  const auto it = draft.parameters.find(parameter_id);
  if (it == draft.parameters.end()) {
    return std::nullopt;
  }
  if (const auto* int_value = value_if<std::int64_t>(it->second)) {
    return static_cast<double>(*int_value);
  }
  if (const auto* double_value = value_if<double>(it->second)) {
    return *double_value;
  }
  return std::nullopt;
}

std::optional<std::int64_t> parameter_as_int64(
    const TemplateDraft& draft,
    const std::string& parameter_id) {
  const auto it = draft.parameters.find(parameter_id);
  if (it == draft.parameters.end()) {
    return std::nullopt;
  }
  if (const auto* int_value = value_if<std::int64_t>(it->second)) {
    return *int_value;
  }
  return std::nullopt;
}

ConditionTree make_compare_tree(
    const std::string& tree_id,
    const std::string& signal_path,
    const ConditionOperator op,
    controller::conditions::ConditionValue rhs,
    std::optional<double> hysteresis = std::nullopt) {
  return ConditionTree{
      tree_id,
      tree_id + ".root",
      {ConditionNode{
          {tree_id + ".root", tree_id, "", ConditionNodeKind::signal_compare, 0U, 0U, hysteresis},
          ConditionSignalCompareNode{signal_path, op, std::move(rhs)},
      }},
  };
}

SequenceAction make_relay_sequence_action(
    std::string id,
    std::string target_id,
    const RelayState state,
    std::string reason) {
  return SequenceAction{
      std::move(id),
      "",
      SequenceActionKind::relay_request,
      SequenceRelayRequestAction{std::move(target_id), state, std::move(reason)},
  };
}

SequenceAction make_pwm_sequence_action(
    std::string id,
    std::string target_id,
    const double duty_percent,
    const bool enabled,
    std::string reason) {
  return SequenceAction{
      std::move(id),
      "",
      SequenceActionKind::pwm_request,
      SequencePwmRequestAction{std::move(target_id), duty_percent, enabled, std::move(reason)},
  };
}

SequenceAction make_note_sequence_action(std::string id, std::string note) {
  return SequenceAction{
      std::move(id),
      "",
      SequenceActionKind::log_note,
      SequenceLogNoteAction{std::move(note)},
  };
}

RuleAction make_relay_rule_action(
    std::string id,
    std::string target_id,
    const RelayState state,
    std::string reason) {
  return RuleAction{
      std::move(id),
      "",
      RuleActionKind::relay_request,
      RuleRelayRequestAction{std::move(target_id), state, std::move(reason)},
  };
}

RuleAction make_alarm_rule_action(
    std::string id,
    std::string alarm_id,
    const bool condition_active) {
  return RuleAction{
      std::move(id),
      "",
      RuleActionKind::alarm_set_condition,
      RuleAlarmSetConditionAction{std::move(alarm_id), condition_active},
  };
}

SequenceState make_state(
    std::string id,
    std::string name,
    const SequenceStateType type) {
  SequenceState state;
  state.id = std::move(id);
  state.name = std::move(name);
  state.type = type;
  return state;
}

SequenceTransition make_transition(
    std::string id,
    std::string name,
    std::string target_state_id,
    std::optional<ConditionTree> condition = std::nullopt,
    const bool require_min_time_done = false) {
  return SequenceTransition{
      std::move(id),
      std::move(name),
      std::move(target_state_id),
      std::move(condition),
      require_min_time_done,
      true,
  };
}

RuleDescriptor make_rule_shell(
    const std::string& id,
    const std::string& name,
    ConditionTree condition_tree,
    const std::string& description) {
  RuleDescriptor rule;
  rule.id = id;
  rule.name = name;
  rule.enabled = false;
  rule.description = description;
  rule.condition_tree = std::move(condition_tree);
  rule.source_module = kSourceModule;
  rule.visible = true;
  rule.tags = {"template"};
  return rule;
}

AlarmDescriptor make_alarm_shell(
    const std::string& id,
    const std::string& name,
    const AlarmSeverity severity,
    const bool latching,
    const std::string& description) {
  return AlarmDescriptor{
      id,
      name,
      true,
      severity,
      latching,
      description,
      kSourceModule,
      true,
      true,
      false,
      true,
  };
}

PidServiceDescriptor make_pid_shell(
    const std::string& id,
    const std::string& name,
    const std::string& pv_signal_path,
    const std::string& output_target_id,
    const double setpoint,
    const double kp,
    const double ki,
    const double kd,
    const double output_min,
    const double output_max,
    const double deadband) {
  PidConfig config;
  config.id = id;
  config.name = name;
  config.enabled = false;
  config.kp = kp;
  config.ki = ki;
  config.kd = kd;
  config.sample_time_ms = 1000U;
  config.mode = PidMode::hold;
  config.output_min = output_min;
  config.output_max = output_max;
  config.integral_min = output_min;
  config.integral_max = output_max;
  config.deadband = deadband;
  config.manual_output = 0.0;

  PidServiceDescriptor descriptor;
  descriptor.id = id;
  descriptor.name = name;
  descriptor.enabled = false;
  descriptor.core_config = config;
  descriptor.pv_signal_path = pv_signal_path;
  descriptor.setpoint_source_kind = PidSetpointSourceKind::constant;
  descriptor.constant_setpoint = setpoint;
  descriptor.output_target_id = output_target_id;
  descriptor.output_target_kind = ActuatorTargetKind::pwm;
  descriptor.stale_as_fault = true;
  descriptor.invalid_as_fault = true;
  descriptor.fault_clears_output = true;
  descriptor.publish_signals = true;
  return descriptor;
}

TemplateProgramPreview make_program_preview(
    const std::string& id,
    const std::string& name,
    const SequenceProgramType type,
    const std::vector<std::string>& state_ids) {
  return TemplateProgramPreview{id, name, type, false, state_ids};
}

TemplateRulePreview make_rule_preview(
    const std::string& id,
    const std::string& name,
    const std::string& description) {
  return TemplateRulePreview{id, name, false, description};
}

TemplateAlarmPreview make_alarm_preview(
    const std::string& id,
    const std::string& name,
    const std::string& description) {
  return TemplateAlarmPreview{id, name, true, description};
}

TemplatePidPreview make_pid_preview(
    const std::string& id,
    const std::string& name,
    const std::string& pv_signal_path,
    const std::string& output_target_id) {
  return TemplatePidPreview{id, name, false, pv_signal_path, output_target_id};
}

std::vector<std::string> program_state_ids(const SequenceProgram& program) {
  std::vector<std::string> states;
  states.reserve(program.states.size());
  for (const auto& state : program.states) {
    states.push_back(state.id);
  }
  return states;
}

const TemplateDefinition& definition_pressure_pump() {
  static const TemplateDefinition definition{
      TemplateKind::pressure_pump,
      "Pressure Pump",
      "Curated supervisory bundle for a relay-driven pressure pump with start/stop rules.",
      false,
      SequenceProgramType::pump,
      {
          TemplateSlotDefinition{"pressure_signal", "Pressure Signal", TemplateSlotKind::signal, true, {SignalType::int64, SignalType::float64}, {}, {}, false, {}, "Numeric pressure process value used for start/stop comparison."},
          TemplateSlotDefinition{"primary_output", "Primary Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay}, {ActuatorRole::pump}, true, {}, "Relay actuator request target for pump run demand."},
      },
      {
          TemplateParameterDefinition{"start_threshold", "Start Threshold", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Pressure threshold that requests the pump ON.", ""},
          TemplateParameterDefinition{"stop_threshold", "Stop Threshold", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Pressure threshold that requests the pump OFF.", ""},
          TemplateParameterDefinition{"hysteresis", "Hysteresis", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Numeric hysteresis applied to the compare nodes.", ""},
          TemplateParameterDefinition{"high_trip_threshold", "High Trip Threshold", TemplateParameterType::float64, false, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Optional high pressure trip threshold for an alarm pair.", ""},
      },
      {},
  };
  return definition;
}

const TemplateDefinition& definition_pump_with_flowmeter() {
  static const TemplateDefinition definition{
      TemplateKind::pump_with_flowmeter,
      "Pump With Flowmeter",
      "Pressure pump bundle extended with flow supervision and a no-flow trip alarm.",
      false,
      SequenceProgramType::pump,
      {
          TemplateSlotDefinition{"pressure_signal", "Pressure Signal", TemplateSlotKind::signal, true, {SignalType::int64, SignalType::float64}, {}, {}, false, {}, "Numeric pressure process value."},
          TemplateSlotDefinition{"flow_rate_signal", "Flow Rate Signal", TemplateSlotKind::signal, true, {SignalType::int64, SignalType::float64}, {}, {}, false, {}, "Numeric flow-rate signal used for no-flow supervision."},
          TemplateSlotDefinition{"primary_output", "Primary Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay}, {ActuatorRole::pump}, true, {}, "Relay actuator request target for pump demand."},
      },
      {
          TemplateParameterDefinition{"start_threshold", "Start Threshold", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Pressure threshold that requests the pump ON.", ""},
          TemplateParameterDefinition{"stop_threshold", "Stop Threshold", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Pressure threshold that requests the pump OFF.", ""},
          TemplateParameterDefinition{"hysteresis", "Hysteresis", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Numeric hysteresis applied to pressure compares.", ""},
          TemplateParameterDefinition{"min_flow_threshold", "Min Flow Threshold", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Minimum expected flow rate while supervising flow.", ""},
          TemplateParameterDefinition{"high_trip_threshold", "High Trip Threshold", TemplateParameterType::float64, false, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Optional high pressure trip threshold.", ""},
      },
      {},
  };
  return definition;
}

const TemplateDefinition& definition_batch_dosing() {
  static const TemplateDefinition definition{
      TemplateKind::batch_dosing,
      "Batch Dosing",
      "Safe supervisory sequence skeleton for a batch-dosing output with optional done and fault signals.",
      false,
      SequenceProgramType::dosing,
      {
          TemplateSlotDefinition{"primary_output", "Primary Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::pump, ActuatorRole::valve}, true, {}, "Relay or PWM output that remains active during DISPENSE."},
          TemplateSlotDefinition{"batch_done_signal", "Batch Done Signal", TemplateSlotKind::signal, false, {SignalType::boolean}, {}, {}, false, {}, "Optional completion signal for the DISPENSE -> COMPLETE transition."},
          TemplateSlotDefinition{"fault_signal", "Fault Signal", TemplateSlotKind::signal, false, {SignalType::boolean}, {}, {}, false, {}, "Optional fault signal for trip transitions."},
      },
      {
          TemplateParameterDefinition{"target_volume", "Target Volume", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Requested target volume for operator review and later commissioning.", ""},
      },
      {"READY_CHECK", "START", "DISPENSE", "COMPLETE", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
  };
  return definition;
}

const TemplateDefinition& definition_pid_pressure_pwm_pump() {
  static const TemplateDefinition definition{
      TemplateKind::pid_pressure_pwm_pump,
      "PID Pressure PWM Pump",
      "PID descriptor bundle for a pressure-controlled PWM pump with optional high-pressure supervision.",
      false,
      SequenceProgramType::pump,
      {
          TemplateSlotDefinition{"pressure_signal", "Pressure Signal", TemplateSlotKind::signal, true, {SignalType::int64, SignalType::float64}, {}, {}, false, {}, "Numeric pressure process value for the PID PV."},
          TemplateSlotDefinition{"pwm_output", "PWM Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::pwm}, {ActuatorRole::pump}, true, {}, "PWM actuator target driven by the generated PID controller."},
      },
      {
          TemplateParameterDefinition{"setpoint", "Setpoint", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Constant PID setpoint.", ""},
          TemplateParameterDefinition{"kp", "Kp", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Proportional gain.", ""},
          TemplateParameterDefinition{"ki", "Ki", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Integral gain.", ""},
          TemplateParameterDefinition{"kd", "Kd", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Derivative gain.", ""},
          TemplateParameterDefinition{"output_min", "Output Min", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Minimum PID output.", "%"},
          TemplateParameterDefinition{"output_max", "Output Max", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Maximum PID output.", "%"},
          TemplateParameterDefinition{"deadband", "Deadband", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "PID deadband.", ""},
          TemplateParameterDefinition{"high_trip_threshold", "High Trip Threshold", TemplateParameterType::float64, false, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Optional high pressure trip threshold.", ""},
      },
      {},
  };
  return definition;
}

const TemplateDefinition& definition_pid_flow_pwm_pump() {
  static const TemplateDefinition definition{
      TemplateKind::pid_flow_pwm_pump,
      "PID Flow PWM Pump",
      "PID descriptor bundle for a flow-controlled PWM pump.",
      false,
      SequenceProgramType::pump,
      {
          TemplateSlotDefinition{"flow_rate_signal", "Flow Rate Signal", TemplateSlotKind::signal, true, {SignalType::int64, SignalType::float64}, {}, {}, false, {}, "Numeric flow-rate signal used as the PID PV."},
          TemplateSlotDefinition{"pwm_output", "PWM Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::pwm}, {ActuatorRole::pump}, true, {}, "PWM actuator target driven by the generated PID controller."},
      },
      {
          TemplateParameterDefinition{"setpoint", "Setpoint", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Constant PID setpoint.", ""},
          TemplateParameterDefinition{"kp", "Kp", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Proportional gain.", ""},
          TemplateParameterDefinition{"ki", "Ki", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Integral gain.", ""},
          TemplateParameterDefinition{"kd", "Kd", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "Derivative gain.", ""},
          TemplateParameterDefinition{"output_min", "Output Min", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Minimum PID output.", "%"},
          TemplateParameterDefinition{"output_max", "Output Max", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Maximum PID output.", "%"},
          TemplateParameterDefinition{"deadband", "Deadband", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, 0.0, std::nullopt, {}, "PID deadband.", ""},
      },
      {},
  };
  return definition;
}

const TemplateDefinition& definition_compressor_basic() {
  static const TemplateDefinition definition{
      TemplateKind::compressor_basic,
      "Compressor Basic",
      "Supervisory compressor sequence skeleton with optional fault and pressure alarms.",
      false,
      SequenceProgramType::compressor,
      {
          TemplateSlotDefinition{"main_output", "Main Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay}, {ActuatorRole::motor, ActuatorRole::pump}, true, {}, "Relay actuator that energizes the compressor contactor or drive request."},
          TemplateSlotDefinition{"pressure_signal", "Pressure Signal", TemplateSlotKind::signal, false, {SignalType::int64, SignalType::float64}, {}, {}, false, {}, "Optional numeric pressure signal for supervisory alarm generation."},
          TemplateSlotDefinition{"fault_signal", "Fault Signal", TemplateSlotKind::signal, false, {SignalType::boolean}, {}, {}, false, {}, "Optional fault signal for supervisory alarm generation."},
      },
      {
          TemplateParameterDefinition{"cooldown_ms", "Cooldown Ms", TemplateParameterType::int64, true, std::nullopt, 0, std::nullopt, std::nullopt, std::nullopt, {}, "Cooldown hold time used by the normal-stop cooldown state.", "ms"},
      },
      {"OFF", "READY_CHECK", "START", "RUN", "COOLDOWN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
  };
  return definition;
}

const TemplateDefinition& definition_burner_supervisory() {
  static const TemplateDefinition definition{
      TemplateKind::burner_supervisory_skeleton,
      "Burner Supervisory Skeleton",
      "Disabled-by-default supervisory-only burner sequence bundle. Not certified burner logic.",
      true,
      SequenceProgramType::burner,
      {
          TemplateSlotDefinition{"fan_output", "Fan Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::fan}, true, {}, "Fan output used in purge and run states."},
          TemplateSlotDefinition{"ignition_output", "Ignition Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay}, {ActuatorRole::ignition}, true, {}, "Ignition relay output."},
          TemplateSlotDefinition{"fuel_output", "Fuel Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay}, {ActuatorRole::fuel}, true, {}, "Fuel relay output."},
          TemplateSlotDefinition{"flame_signal", "Flame Signal", TemplateSlotKind::signal, true, {SignalType::boolean}, {}, {}, false, {}, "Boolean flame prove signal."},
          TemplateSlotDefinition{"air_ok_signal", "Air OK Signal", TemplateSlotKind::signal, true, {SignalType::boolean}, {}, {}, false, {}, "Boolean combustion-air permissive signal."},
      },
      {
          TemplateParameterDefinition{"prepurge_ms", "Prepurge Ms", TemplateParameterType::int64, true, std::nullopt, 0, std::nullopt, std::nullopt, std::nullopt, {}, "Supervisory prepurge dwell.", "ms"},
          TemplateParameterDefinition{"ignition_timeout_ms", "Ignition Timeout Ms", TemplateParameterType::int64, true, std::nullopt, 0, std::nullopt, std::nullopt, std::nullopt, {}, "Supervisory ignition timeout dwell.", "ms"},
          TemplateParameterDefinition{"postpurge_ms", "Postpurge Ms", TemplateParameterType::int64, true, std::nullopt, 0, std::nullopt, std::nullopt, std::nullopt, {}, "Supervisory postpurge dwell.", "ms"},
      },
      {"OFF", "READY_CHECK", "PREPURGE", "IGNITION", "FLAME_PROVE", "RUN", "POSTPURGE", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
  };
  return definition;
}

const TemplateDefinition& definition_incinerator_supervisory() {
  static const TemplateDefinition definition{
      TemplateKind::incinerator_supervisory_skeleton,
      "Incinerator Supervisory Skeleton",
      "Disabled-by-default supervisory-only incinerator sequence bundle. Not certified combustion logic.",
      true,
      SequenceProgramType::incinerator,
      {
          TemplateSlotDefinition{"fan_output", "Fan Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::fan}, true, {}, "Fan output used during warmup and cooldown."},
          TemplateSlotDefinition{"diesel_output", "Diesel Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay}, {ActuatorRole::fuel}, true, {}, "Diesel warmup output."},
          TemplateSlotDefinition{"sludge_output", "Sludge Output", TemplateSlotKind::actuator, true, {}, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::pump, ActuatorRole::valve}, true, {}, "Sludge enable output."},
          TemplateSlotDefinition{"chamber_temp_signal", "Chamber Temp Signal", TemplateSlotKind::signal, true, {SignalType::int64, SignalType::float64}, {}, {}, false, {}, "Numeric chamber temperature signal."},
          TemplateSlotDefinition{"flame_signal", "Flame Signal", TemplateSlotKind::signal, false, {SignalType::boolean}, {}, {}, false, {}, "Optional boolean flame supervision signal."},
          TemplateSlotDefinition{"sludge_ready_signal", "Sludge Ready Signal", TemplateSlotKind::signal, false, {SignalType::boolean}, {}, {}, false, {}, "Optional sludge-ready permissive signal."},
      },
      {
          TemplateParameterDefinition{"warmup_temp", "Warmup Temp", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Warmup temperature threshold for sludge enable.", ""},
          TemplateParameterDefinition{"cooldown_temp", "Cooldown Temp", TemplateParameterType::float64, true, std::nullopt, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, "Cooldown temperature threshold for normal stop completion.", ""},
      },
      {"OFF", "READY_CHECK", "DIESEL_WARMUP", "SLUDGE_ENABLE", "SLUDGE_RUN", "COOLDOWN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
  };
  return definition;
}

const std::vector<TemplateDefinition>& static_definitions() {
  static const std::vector<TemplateDefinition> definitions{
      definition_pressure_pump(),
      definition_pump_with_flowmeter(),
      definition_batch_dosing(),
      definition_pid_pressure_pwm_pump(),
      definition_pid_flow_pwm_pump(),
      definition_compressor_basic(),
      definition_burner_supervisory(),
      definition_incinerator_supervisory(),
  };
  return definitions;
}

void sort_unique(std::vector<std::string>& values) {
  std::sort(values.begin(), values.end());
  values.erase(std::unique(values.begin(), values.end()), values.end());
}

TemplateCreatedArtifactSummary make_created_summary(
    const std::string& id,
    const std::string& name,
    const std::string& kind,
    const bool enabled) {
  return TemplateCreatedArtifactSummary{id, name, kind, enabled};
}

}  // namespace

bool is_supported_template_kind(const TemplateKind kind) {
  return std::any_of(
      static_definitions().begin(),
      static_definitions().end(),
      [&](const TemplateDefinition& definition) { return definition.kind == kind; });
}

const char* to_string(const TemplateKind kind) {
  switch (kind) {
    case TemplateKind::pressure_pump:
      return "pressure_pump";
    case TemplateKind::pump_with_flowmeter:
      return "pump_with_flowmeter";
    case TemplateKind::batch_dosing:
      return "batch_dosing";
    case TemplateKind::pid_pressure_pwm_pump:
      return "pid_pressure_pwm_pump";
    case TemplateKind::pid_flow_pwm_pump:
      return "pid_flow_pwm_pump";
    case TemplateKind::compressor_basic:
      return "compressor_basic";
    case TemplateKind::burner_supervisory_skeleton:
      return "burner_supervisory_skeleton";
    case TemplateKind::incinerator_supervisory_skeleton:
      return "incinerator_supervisory_skeleton";
  }
  return "unknown";
}

const char* to_string(const TemplateSlotKind kind) {
  switch (kind) {
    case TemplateSlotKind::signal:
      return "signal";
    case TemplateSlotKind::actuator:
      return "actuator";
    case TemplateSlotKind::timer:
      return "timer";
    case TemplateSlotKind::alarm:
      return "alarm";
  }
  return "unknown";
}

const char* to_string(const TemplateParameterType type) {
  switch (type) {
    case TemplateParameterType::boolean:
      return "bool";
    case TemplateParameterType::int64:
      return "int64";
    case TemplateParameterType::float64:
      return "double";
    case TemplateParameterType::string:
      return "string";
  }
  return "unknown";
}

const char* to_string(const TemplateIssueSeverity severity) {
  switch (severity) {
    case TemplateIssueSeverity::info:
      return "info";
    case TemplateIssueSeverity::warning:
      return "warning";
    case TemplateIssueSeverity::error:
      return "error";
  }
  return "error";
}

const char* to_string(const TemplateErrorCode code) {
  switch (code) {
    case TemplateErrorCode::ok:
      return "OK";
    case TemplateErrorCode::template_unsupported_kind:
      return "TEMPLATE_UNSUPPORTED_KIND";
    case TemplateErrorCode::template_invalid_draft:
      return "TEMPLATE_INVALID_DRAFT";
    case TemplateErrorCode::template_duplicate_resulting_id:
      return "TEMPLATE_DUPLICATE_RESULTING_ID";
    case TemplateErrorCode::template_active_program_present:
      return "TEMPLATE_ACTIVE_PROGRAM_PRESENT";
    case TemplateErrorCode::template_apply_failed:
      return "TEMPLATE_RUNTIME_APPLY_FAILED";
    case TemplateErrorCode::template_rollback_failed:
      return "TEMPLATE_ROLLBACK_FAILED";
    case TemplateErrorCode::template_invalid_argument:
      return "TEMPLATE_INVALID_ARGUMENT";
    case TemplateErrorCode::template_data_unavailable:
      return "TEMPLATE_DATA_UNAVAILABLE";
  }
  return "TEMPLATE_UNKNOWN";
}

bool TemplateValidationResult::has_errors() const {
  return std::any_of(
      issues.begin(),
      issues.end(),
      [](const TemplateIssue& issue) { return issue.severity == TemplateIssueSeverity::error; });
}

bool TemplateValidationResult::ok() const {
  return status.ok() && !has_errors();
}

TemplateEngine::TemplateEngine(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    controller::logic::LogicService& logic_service,
    controller::sequence::SequenceService& sequence_service,
    controller::pid::PidService& pid_service)
    : signal_registry_(signal_registry),
      actuator_manager_(actuator_manager),
      timer_service_(timer_service),
      alarm_service_(alarm_service),
      logic_service_(logic_service),
      sequence_service_(sequence_service),
      pid_service_(pid_service) {}

void TemplateEngine::set_fault_injection(const TemplateEngineFaultInjection& fault_injection) {
  fault_injection_ = fault_injection;
}

std::vector<TemplateDefinition> TemplateEngine::build_definitions() const {
  return static_definitions();
}

const TemplateDefinition* TemplateEngine::find_definition(const TemplateKind kind) const {
  const auto& definitions = static_definitions();
  const auto it = std::find_if(
      definitions.begin(),
      definitions.end(),
      [&](const TemplateDefinition& definition) { return definition.kind == kind; });
  return it == definitions.end() ? nullptr : &(*it);
}

std::vector<TemplateListEntry> TemplateEngine::list_templates() const {
  std::vector<TemplateListEntry> items;
  for (const auto& definition : static_definitions()) {
    std::size_t required_binding_count = 0U;
    for (const auto& slot : definition.slot_definitions) {
      required_binding_count += slot.required ? 1U : 0U;
    }

    std::size_t required_parameter_count = 0U;
    for (const auto& parameter : definition.parameter_definitions) {
      required_parameter_count += parameter.required ? 1U : 0U;
    }

    items.push_back(TemplateListEntry{
        definition.kind,
        definition.label,
        definition.description,
        definition.supervisory_only,
        required_binding_count,
        required_parameter_count,
    });
  }
  return items;
}

TemplateCatalog TemplateEngine::get_catalog() const {
  TemplateCatalog catalog;
  catalog.supported_templates = static_definitions();

  for (const auto& descriptor : signal_registry_.list_descriptors()) {
    catalog.signals.push_back(TemplateSignalCatalogEntry{
        descriptor.path,
        descriptor.type,
        descriptor.unit,
        descriptor.source_module,
    });
  }
  std::sort(
      catalog.signals.begin(),
      catalog.signals.end(),
      [](const TemplateSignalCatalogEntry& lhs, const TemplateSignalCatalogEntry& rhs) {
        return lhs.path < rhs.path;
      });

  for (const auto& snapshot : actuator_manager_.list_snapshots()) {
    catalog.actuators.push_back(TemplateActuatorCatalogEntry{
        snapshot.target_id,
        snapshot.kind,
        snapshot.role,
    });
  }
  std::sort(
      catalog.actuators.begin(),
      catalog.actuators.end(),
      [](const TemplateActuatorCatalogEntry& lhs, const TemplateActuatorCatalogEntry& rhs) {
        return lhs.id < rhs.id;
      });

  for (const auto& descriptor : timer_service_.list_descriptors()) {
    catalog.timers.push_back(TemplateTimerCatalogEntry{
        descriptor.id,
        descriptor.name,
        descriptor.kind,
        descriptor.enabled,
    });
  }
  std::sort(
      catalog.timers.begin(),
      catalog.timers.end(),
      [](const TemplateTimerCatalogEntry& lhs, const TemplateTimerCatalogEntry& rhs) {
        return lhs.id < rhs.id;
      });

  for (const auto& descriptor : alarm_service_.list_descriptors()) {
    catalog.alarms.push_back(TemplateAlarmCatalogEntry{
        descriptor.id,
        descriptor.name,
        descriptor.severity,
        descriptor.enabled,
    });
  }
  std::sort(
      catalog.alarms.begin(),
      catalog.alarms.end(),
      [](const TemplateAlarmCatalogEntry& lhs, const TemplateAlarmCatalogEntry& rhs) {
        return lhs.id < rhs.id;
      });

  for (const auto& program : sequence_service_.list_programs()) {
    catalog.existing_program_ids.push_back(program.id);
  }
  sort_unique(catalog.existing_program_ids);

  for (const auto& rule : logic_service_.list_rules()) {
    catalog.existing_rule_ids.push_back(rule.id);
  }
  sort_unique(catalog.existing_rule_ids);

  for (const auto& descriptor : pid_service_.list_descriptors()) {
    catalog.existing_pid_ids.push_back(descriptor.id);
  }
  sort_unique(catalog.existing_pid_ids);

  return catalog;
}

TemplateResult<TemplateSchema> TemplateEngine::get_schema(const TemplateKind kind) const {
  TemplateResult<TemplateSchema> result;
  const auto* definition = find_definition(kind);
  if (definition == nullptr) {
    result.status = TemplateStatus::error(
        TemplateErrorCode::template_unsupported_kind,
        "Unsupported template kind was requested.");
    return result;
  }

  const auto catalog = get_catalog();
  result.status = TemplateStatus::success("Template schema refreshed.");
  result.value = TemplateSchema{
      *definition,
      catalog.signals,
      catalog.actuators,
      catalog.timers,
      catalog.alarms,
      catalog.existing_program_ids,
      catalog.existing_rule_ids,
      catalog.existing_pid_ids,
  };
  return result;
}

TemplateDraft TemplateEngine::create_draft(const TemplateKind kind) const {
  TemplateDraft draft;
  draft.template_kind = kind;
  draft.create_disabled = true;
  if (const auto* definition = find_definition(kind); definition != nullptr) {
    draft.display_name = definition->label;
  }
  return draft;
}

TemplateDraftSummary TemplateEngine::build_draft_summary(
    const TemplateDraft& draft,
    const TemplateDefinition& definition) const {
  TemplateDraftSummary summary;
  summary.template_kind = draft.template_kind;
  summary.instance_id = draft.instance_id;
  summary.display_name = draft.display_name;
  summary.supervisory_only = definition.supervisory_only;

  for (const auto& slot : definition.slot_definitions) {
    summary.required_binding_count += slot.required ? 1U : 0U;
    summary.bound_binding_count += has_binding(draft, slot.slot_id) ? 1U : 0U;
  }
  for (const auto& parameter : definition.parameter_definitions) {
    summary.required_parameter_count += parameter.required ? 1U : 0U;
    summary.provided_parameter_count += has_parameter(draft, parameter.parameter_id) ? 1U : 0U;
  }
  return summary;
}

TemplateEngine::GeneratedArtifactIds TemplateEngine::build_generated_ids(const TemplateDraft& draft) const {
  GeneratedArtifactIds ids;
  switch (draft.template_kind) {
    case TemplateKind::pressure_pump:
      ids.rule_ids = {
          make_artifact_id(draft.instance_id, "rule", "low_pressure_on"),
          make_artifact_id(draft.instance_id, "rule", "high_pressure_off"),
      };
      if (has_parameter(draft, "high_trip_threshold")) {
        ids.rule_ids.push_back(make_artifact_id(draft.instance_id, "rule", "high_pressure_trip"));
        ids.alarm_ids.push_back(make_artifact_id(draft.instance_id, "alarm", "high_pressure_trip"));
      }
      break;
    case TemplateKind::pump_with_flowmeter:
      ids.rule_ids = {
          make_artifact_id(draft.instance_id, "rule", "low_pressure_on"),
          make_artifact_id(draft.instance_id, "rule", "high_pressure_off"),
          make_artifact_id(draft.instance_id, "rule", "no_flow_alarm"),
      };
      ids.alarm_ids = {make_artifact_id(draft.instance_id, "alarm", "no_flow_trip")};
      if (has_parameter(draft, "high_trip_threshold")) {
        ids.rule_ids.push_back(make_artifact_id(draft.instance_id, "rule", "high_pressure_trip"));
        ids.alarm_ids.push_back(make_artifact_id(draft.instance_id, "alarm", "high_pressure_trip"));
      }
      break;
    case TemplateKind::batch_dosing:
      ids.program_ids = {make_artifact_id(draft.instance_id, "program", "main")};
      break;
    case TemplateKind::pid_pressure_pwm_pump:
      ids.pid_ids = {make_artifact_id(draft.instance_id, "pid", "main")};
      if (has_parameter(draft, "high_trip_threshold")) {
        ids.rule_ids.push_back(make_artifact_id(draft.instance_id, "rule", "high_pressure_trip"));
        ids.alarm_ids.push_back(make_artifact_id(draft.instance_id, "alarm", "high_pressure_trip"));
      }
      break;
    case TemplateKind::pid_flow_pwm_pump:
      ids.pid_ids = {make_artifact_id(draft.instance_id, "pid", "main")};
      break;
    case TemplateKind::compressor_basic:
      ids.program_ids = {make_artifact_id(draft.instance_id, "program", "main")};
      if (has_binding(draft, "pressure_signal")) {
        ids.rule_ids.push_back(make_artifact_id(draft.instance_id, "rule", "pressure_alarm"));
        ids.alarm_ids.push_back(make_artifact_id(draft.instance_id, "alarm", "pressure_trip"));
      }
      if (has_binding(draft, "fault_signal")) {
        ids.rule_ids.push_back(make_artifact_id(draft.instance_id, "rule", "fault_alarm"));
        ids.alarm_ids.push_back(make_artifact_id(draft.instance_id, "alarm", "fault_trip"));
      }
      break;
    case TemplateKind::burner_supervisory_skeleton:
      ids.program_ids = {make_artifact_id(draft.instance_id, "program", "main")};
      ids.rule_ids = {
          make_artifact_id(draft.instance_id, "rule", "air_fault"),
          make_artifact_id(draft.instance_id, "rule", "flame_fault"),
      };
      ids.alarm_ids = {
          make_artifact_id(draft.instance_id, "alarm", "air_fault"),
          make_artifact_id(draft.instance_id, "alarm", "flame_fault"),
      };
      break;
    case TemplateKind::incinerator_supervisory_skeleton:
      ids.program_ids = {make_artifact_id(draft.instance_id, "program", "main")};
      if (has_binding(draft, "flame_signal")) {
        ids.rule_ids.push_back(make_artifact_id(draft.instance_id, "rule", "flame_fault"));
        ids.alarm_ids.push_back(make_artifact_id(draft.instance_id, "alarm", "flame_fault"));
      }
      if (has_binding(draft, "sludge_ready_signal")) {
        ids.rule_ids.push_back(make_artifact_id(draft.instance_id, "rule", "sludge_ready_fault"));
        ids.alarm_ids.push_back(make_artifact_id(draft.instance_id, "alarm", "sludge_ready_fault"));
      }
      break;
  }
  return ids;
}

TemplateValidationResult TemplateEngine::validate_common_fields(const TemplateDraft& draft) const {
  TemplateValidationResult result;
  if (!is_supported_template_kind(draft.template_kind)) {
    append_issue(
        result.issues,
        "draft.template_kind",
        "TEMPLATE_UNSUPPORTED_KIND",
        TemplateIssueSeverity::error,
        "Unsupported template kind was requested.");
  }
  if (!has_text(draft.instance_id)) {
    append_issue(
        result.issues,
        "draft.instance_id",
        "TEMPLATE_EMPTY_INSTANCE_ID",
        TemplateIssueSeverity::error,
        "instance_id must not be empty.");
  }
  if (!has_text(draft.display_name)) {
    append_issue(
        result.issues,
        "draft.display_name",
        "TEMPLATE_EMPTY_DISPLAY_NAME",
        TemplateIssueSeverity::error,
        "display_name must not be empty.");
  }
  if (!draft.create_disabled) {
    append_issue(
        result.issues,
        "draft.create_disabled",
        "TEMPLATE_UNSAFE_CREATE_ENABLE_REQUEST",
        TemplateIssueSeverity::error,
        "Stage 23 forces all generated programs, rules and PID controllers to be created disabled.");
  }
  finalize_validation(result, "Template draft fields refreshed.");
  return result;
}

TemplateValidationResult TemplateEngine::validate_bindings_and_parameters(
    const TemplateDraft& draft,
    const TemplateDefinition& definition) const {
  TemplateValidationResult result;

  for (const auto& slot : definition.slot_definitions) {
    const auto resource_id = binding_or_empty(draft, slot.slot_id);
    if (!has_text(resource_id)) {
      if (slot.required) {
        append_issue(
            result.issues,
            "bindings." + slot.slot_id,
            "TEMPLATE_MISSING_REQUIRED_BINDING",
            TemplateIssueSeverity::error,
            "Required binding '" + slot.slot_id + "' is missing.");
      }
      continue;
    }

    if (slot.slot_kind == TemplateSlotKind::signal) {
      const auto descriptor = signal_registry_.get_descriptor(resource_id);
      if (!descriptor.ok()) {
        append_issue(result.issues, "bindings." + slot.slot_id, "TEMPLATE_INVALID_BINDING_RESOURCE", TemplateIssueSeverity::error, "Signal binding '" + resource_id + "' is not registered.");
        continue;
      }
      if (!slot.allowed_signal_types.empty() &&
          std::find(slot.allowed_signal_types.begin(), slot.allowed_signal_types.end(), descriptor.value->type) ==
              slot.allowed_signal_types.end()) {
        append_issue(result.issues, "bindings." + slot.slot_id, "TEMPLATE_WRONG_SIGNAL_TYPE", TemplateIssueSeverity::error, "Signal '" + resource_id + "' does not match the expected slot type.");
      }
      continue;
    }

    if (slot.slot_kind == TemplateSlotKind::actuator) {
      const auto snapshot = actuator_manager_.get_snapshot(resource_id);
      if (!snapshot.ok()) {
        append_issue(result.issues, "bindings." + slot.slot_id, "TEMPLATE_INVALID_BINDING_RESOURCE", TemplateIssueSeverity::error, "Actuator binding '" + resource_id + "' is not registered.");
        continue;
      }
      if (!slot.allowed_actuator_kinds.empty() &&
          std::find(slot.allowed_actuator_kinds.begin(), slot.allowed_actuator_kinds.end(), snapshot.value->kind) ==
              slot.allowed_actuator_kinds.end()) {
        append_issue(result.issues, "bindings." + slot.slot_id, "TEMPLATE_WRONG_ACTUATOR_KIND", TemplateIssueSeverity::error, "Actuator '" + resource_id + "' does not match the expected slot kind.");
      }
      if (!slot.preferred_actuator_roles.empty() &&
          std::find(slot.preferred_actuator_roles.begin(), slot.preferred_actuator_roles.end(), snapshot.value->role) ==
              slot.preferred_actuator_roles.end()) {
        append_issue(
            result.issues,
            "bindings." + slot.slot_id,
            slot.allow_generic_role_fallback ? "TEMPLATE_ROLE_MISMATCH_WARNING"
                                             : "TEMPLATE_WRONG_ACTUATOR_ROLE",
            slot.allow_generic_role_fallback ? TemplateIssueSeverity::warning
                                             : TemplateIssueSeverity::error,
            "Actuator '" + resource_id + "' does not use the preferred role for this slot.");
      }
      continue;
    }

    if (slot.slot_kind == TemplateSlotKind::timer) {
      const auto descriptor = timer_service_.get_descriptor(resource_id);
      if (!descriptor.ok()) {
        append_issue(result.issues, "bindings." + slot.slot_id, "TEMPLATE_INVALID_BINDING_RESOURCE", TemplateIssueSeverity::error, "Timer binding '" + resource_id + "' is not registered.");
      } else if (!slot.allowed_timer_kinds.empty() &&
                 std::find(slot.allowed_timer_kinds.begin(), slot.allowed_timer_kinds.end(), descriptor.value->kind) ==
                     slot.allowed_timer_kinds.end()) {
        append_issue(result.issues, "bindings." + slot.slot_id, "TEMPLATE_WRONG_TIMER_KIND", TemplateIssueSeverity::error, "Timer '" + resource_id + "' does not match the expected slot kind.");
      }
      continue;
    }

    if (!alarm_service_.has_alarm(resource_id)) {
      append_issue(result.issues, "bindings." + slot.slot_id, "TEMPLATE_INVALID_BINDING_RESOURCE", TemplateIssueSeverity::error, "Alarm binding '" + resource_id + "' is not registered.");
    }
  }

  for (const auto& parameter : definition.parameter_definitions) {
    const auto it = draft.parameters.find(parameter.parameter_id);
    if (it == draft.parameters.end()) {
      if (parameter.required && !parameter.default_value.has_value()) {
        append_issue(result.issues, "parameters." + parameter.parameter_id, "TEMPLATE_MISSING_REQUIRED_PARAMETER", TemplateIssueSeverity::error, "Required parameter '" + parameter.parameter_id + "' is missing.");
      }
      continue;
    }

    if (!parameter_matches_type(parameter, it->second)) {
      append_issue(result.issues, "parameters." + parameter.parameter_id, "TEMPLATE_INVALID_PARAMETER_TYPE", TemplateIssueSeverity::error, "Parameter '" + parameter.parameter_id + "' does not match the declared type.");
      continue;
    }

    if (parameter.type == TemplateParameterType::int64) {
      const auto value = std::get<std::int64_t>(it->second);
      if (parameter.min_int64_value.has_value() && value < *parameter.min_int64_value) {
        append_issue(result.issues, "parameters." + parameter.parameter_id, "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "Parameter '" + parameter.parameter_id + "' is below the supported minimum.");
      }
      if (parameter.max_int64_value.has_value() && value > *parameter.max_int64_value) {
        append_issue(result.issues, "parameters." + parameter.parameter_id, "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "Parameter '" + parameter.parameter_id + "' is above the supported maximum.");
      }
    } else if (parameter.type == TemplateParameterType::float64) {
      const auto value = parameter_as_double(draft, parameter.parameter_id);
      if (!value.has_value()) {
        append_issue(result.issues, "parameters." + parameter.parameter_id, "TEMPLATE_INVALID_PARAMETER_TYPE", TemplateIssueSeverity::error, "Parameter '" + parameter.parameter_id + "' must be numeric.");
      } else {
        if (parameter.min_double_value.has_value() && *value < *parameter.min_double_value) {
          append_issue(result.issues, "parameters." + parameter.parameter_id, "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "Parameter '" + parameter.parameter_id + "' is below the supported minimum.");
        }
        if (parameter.max_double_value.has_value() && *value > *parameter.max_double_value) {
          append_issue(result.issues, "parameters." + parameter.parameter_id, "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "Parameter '" + parameter.parameter_id + "' is above the supported maximum.");
        }
      }
    }
  }

  if ((draft.template_kind == TemplateKind::pressure_pump || draft.template_kind == TemplateKind::pump_with_flowmeter) &&
      parameter_as_double(draft, "start_threshold").has_value() &&
      parameter_as_double(draft, "stop_threshold").has_value() &&
      *parameter_as_double(draft, "stop_threshold") <= *parameter_as_double(draft, "start_threshold")) {
    append_issue(result.issues, "parameters.stop_threshold", "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "stop_threshold must be greater than start_threshold.");
  }

  if ((draft.template_kind == TemplateKind::pid_pressure_pwm_pump || draft.template_kind == TemplateKind::pid_flow_pwm_pump) &&
      parameter_as_double(draft, "output_min").has_value() &&
      parameter_as_double(draft, "output_max").has_value() &&
      *parameter_as_double(draft, "output_max") < *parameter_as_double(draft, "output_min")) {
    append_issue(result.issues, "parameters.output_max", "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "output_max must be greater than or equal to output_min.");
  }

  if (draft.template_kind == TemplateKind::batch_dosing &&
      parameter_as_double(draft, "target_volume").has_value() &&
      *parameter_as_double(draft, "target_volume") <= 0.0) {
    append_issue(result.issues, "parameters.target_volume", "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "target_volume must be greater than zero.");
  }

  if (draft.template_kind == TemplateKind::incinerator_supervisory_skeleton &&
      parameter_as_double(draft, "warmup_temp").has_value() &&
      parameter_as_double(draft, "cooldown_temp").has_value() &&
      *parameter_as_double(draft, "warmup_temp") <= *parameter_as_double(draft, "cooldown_temp")) {
    append_issue(result.issues, "parameters.warmup_temp", "TEMPLATE_INVALID_PARAMETER_RANGE", TemplateIssueSeverity::error, "warmup_temp should be greater than cooldown_temp.");
  }

  finalize_validation(result, "Template bindings and parameters refreshed.");
  return result;
}

TemplateValidationResult TemplateEngine::validate_collisions(const TemplateDraft& draft) const {
  TemplateValidationResult result;
  if (!has_text(draft.instance_id)) {
    finalize_validation(result, "Collision check skipped until instance_id is provided.");
    return result;
  }

  const auto ids = build_generated_ids(draft);
  for (const auto& id : ids.program_ids) {
    if (sequence_service_.has_program(id)) {
      append_issue(result.issues, "instance_id", "TEMPLATE_DUPLICATE_RESULTING_ID", TemplateIssueSeverity::error, "Generated program id '" + id + "' already exists.");
    }
  }
  for (const auto& id : ids.rule_ids) {
    if (logic_service_.has_rule(id)) {
      append_issue(result.issues, "instance_id", "TEMPLATE_DUPLICATE_RESULTING_ID", TemplateIssueSeverity::error, "Generated rule id '" + id + "' already exists.");
    }
  }
  for (const auto& id : ids.alarm_ids) {
    if (alarm_service_.has_alarm(id)) {
      append_issue(result.issues, "instance_id", "TEMPLATE_DUPLICATE_RESULTING_ID", TemplateIssueSeverity::error, "Generated alarm id '" + id + "' already exists.");
    }
  }
  for (const auto& id : ids.pid_ids) {
    if (pid_service_.has_pid(id)) {
      append_issue(result.issues, "instance_id", "TEMPLATE_DUPLICATE_RESULTING_ID", TemplateIssueSeverity::error, "Generated PID id '" + id + "' already exists.");
    }
  }
  finalize_validation(result, "Collision check refreshed.");
  return result;
}

void TemplateEngine::append_active_program_issue(std::vector<TemplateIssue>& issues) const {
  append_issue(issues, "runtime.sequence", "TEMPLATE_ACTIVE_PROGRAM_PRESENT", TemplateIssueSeverity::error, "Template apply is denied while a Sequence program is active.");
}

TemplateValidationResult TemplateEngine::validate_draft(
    const TemplateDraft& draft,
    const TemplateTimestampMs now_ms,
    const bool include_apply_guards) const {
  TemplateValidationResult result;
  const auto common = validate_common_fields(draft);
  merge_issues(result.issues, common.issues);

  const auto* definition = find_definition(draft.template_kind);
  if (definition != nullptr) {
    const auto binding_validation = validate_bindings_and_parameters(draft, *definition);
    merge_issues(result.issues, binding_validation.issues);

    if (has_text(draft.instance_id)) {
      const auto collisions = validate_collisions(draft);
      merge_issues(result.issues, collisions.issues);
    }

    if (definition->supervisory_only) {
      append_issue(result.issues, "draft.template_kind", "TEMPLATE_SUPERVISORY_WARNING", TemplateIssueSeverity::warning, "This template is supervisory-only and must be reviewed before any enable/start actions.");
    }
  }

  if (draft.template_kind == TemplateKind::batch_dosing && !has_binding(draft, "batch_done_signal")) {
    append_issue(result.issues, "bindings.batch_done_signal", "TEMPLATE_MISSING_OPTIONAL_BATCH_DONE_WARNING", TemplateIssueSeverity::warning, "batch_done_signal is not bound, so DISPENSE remains a manual supervisory hold state.");
  }
  if (draft.template_kind == TemplateKind::incinerator_supervisory_skeleton && !has_binding(draft, "flame_signal")) {
    append_issue(result.issues, "bindings.flame_signal", "TEMPLATE_OPTIONAL_SAFETY_SLOT_WARNING", TemplateIssueSeverity::warning, "flame_signal is not bound, so flame supervision remains absent in the supervisory incinerator skeleton.");
  }
  if (draft.template_kind == TemplateKind::incinerator_supervisory_skeleton && !has_binding(draft, "sludge_ready_signal")) {
    append_issue(result.issues, "bindings.sludge_ready_signal", "TEMPLATE_OPTIONAL_SAFETY_SLOT_WARNING", TemplateIssueSeverity::warning, "sludge_ready_signal is not bound, so sludge-enable permissive supervision remains manual.");
  }

  if (include_apply_guards && sequence_service_.get_active_snapshot(now_ms).ok()) {
    append_active_program_issue(result.issues);
  }

  finalize_validation(result, "Template draft validation refreshed.");
  return result;
}

TemplateBundleSummary TemplateEngine::build_outline_summary(
    const TemplateDraft& draft,
    const TemplateDefinition& definition) const {
  TemplateBundleSummary summary;
  const auto display_name = placeholder_display_name(draft.display_name, definition.label);

  switch (draft.template_kind) {
    case TemplateKind::pressure_pump:
      summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "low_pressure_on"), display_name + " Low Pressure On", "Relay ON request while low pressure is true."));
      summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "high_pressure_off"), display_name + " High Pressure Off", "Relay OFF request while high pressure is true."));
      if (has_parameter(draft, "high_trip_threshold")) {
        summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "high_pressure_trip"), display_name + " High Pressure Trip", "Optional trip alarm for high pressure."));
        summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "high_pressure_trip"), display_name + " High Pressure Trip", "Alarm condition rule for optional high pressure trip."));
      }
      break;
    case TemplateKind::pump_with_flowmeter:
      summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "low_pressure_on"), display_name + " Low Pressure On", "Relay ON request while low pressure is true."));
      summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "high_pressure_off"), display_name + " High Pressure Off", "Relay OFF request while high pressure is true."));
      summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "no_flow_trip"), display_name + " No Flow Trip", "Supervisory no-flow trip alarm."));
      summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "no_flow_alarm"), display_name + " No Flow Alarm", "Alarm condition rule for no-flow supervision."));
      if (has_parameter(draft, "high_trip_threshold")) {
        summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "high_pressure_trip"), display_name + " High Pressure Trip", "Optional trip alarm for high pressure."));
        summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "high_pressure_trip"), display_name + " High Pressure Trip", "Alarm condition rule for optional high pressure trip."));
      }
      break;
    case TemplateKind::batch_dosing:
      summary.generated_programs.push_back(make_program_preview(make_outline_artifact_id(draft.instance_id, "program", "main"), display_name + " Program", SequenceProgramType::dosing, definition.preview_state_ids));
      break;
    case TemplateKind::pid_pressure_pwm_pump:
      summary.generated_pids.push_back(make_pid_preview(make_outline_artifact_id(draft.instance_id, "pid", "main"), display_name + " PID", binding_or_empty(draft, "pressure_signal"), binding_or_empty(draft, "pwm_output")));
      if (has_parameter(draft, "high_trip_threshold")) {
        summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "high_pressure_trip"), display_name + " High Pressure Trip", "Optional high pressure trip alarm."));
        summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "high_pressure_trip"), display_name + " High Pressure Trip", "Alarm condition rule for optional high pressure trip."));
      }
      break;
    case TemplateKind::pid_flow_pwm_pump:
      summary.generated_pids.push_back(make_pid_preview(make_outline_artifact_id(draft.instance_id, "pid", "main"), display_name + " PID", binding_or_empty(draft, "flow_rate_signal"), binding_or_empty(draft, "pwm_output")));
      break;
    case TemplateKind::compressor_basic:
      summary.generated_programs.push_back(make_program_preview(make_outline_artifact_id(draft.instance_id, "program", "main"), display_name + " Program", SequenceProgramType::compressor, definition.preview_state_ids));
      if (has_binding(draft, "pressure_signal")) {
        summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "pressure_trip"), display_name + " Pressure Trip", "Optional compressor pressure supervisory alarm."));
        summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "pressure_alarm"), display_name + " Pressure Alarm", "Alarm condition rule for the pressure signal."));
      }
      if (has_binding(draft, "fault_signal")) {
        summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "fault_trip"), display_name + " Fault Trip", "Optional compressor fault supervisory alarm."));
        summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "fault_alarm"), display_name + " Fault Alarm", "Alarm condition rule for the fault signal."));
      }
      break;
    case TemplateKind::burner_supervisory_skeleton:
      summary.generated_programs.push_back(make_program_preview(make_outline_artifact_id(draft.instance_id, "program", "main"), display_name + " Program", SequenceProgramType::burner, definition.preview_state_ids));
      summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "air_fault"), display_name + " Air Fault", "Supervisory air-permissive alarm."));
      summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "flame_fault"), display_name + " Flame Fault", "Supervisory flame alarm."));
      summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "air_fault"), display_name + " Air Fault", "Alarm condition rule for air supervision."));
      summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "flame_fault"), display_name + " Flame Fault", "Alarm condition rule for flame supervision."));
      break;
    case TemplateKind::incinerator_supervisory_skeleton:
      summary.generated_programs.push_back(make_program_preview(make_outline_artifact_id(draft.instance_id, "program", "main"), display_name + " Program", SequenceProgramType::incinerator, definition.preview_state_ids));
      if (has_binding(draft, "flame_signal")) {
        summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "flame_fault"), display_name + " Flame Fault", "Optional flame supervisory alarm."));
        summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "flame_fault"), display_name + " Flame Fault", "Alarm condition rule for flame supervision."));
      }
      if (has_binding(draft, "sludge_ready_signal")) {
        summary.generated_alarms.push_back(make_alarm_preview(make_outline_artifact_id(draft.instance_id, "alarm", "sludge_ready_fault"), display_name + " Sludge Ready Fault", "Optional sludge-ready supervisory alarm."));
        summary.generated_rules.push_back(make_rule_preview(make_outline_artifact_id(draft.instance_id, "rule", "sludge_ready_fault"), display_name + " Sludge Ready Fault", "Alarm condition rule for sludge-ready supervision."));
      }
      break;
  }

  return summary;
}

TemplateBundleSummary TemplateEngine::build_bundle_summary(const TemplateBundle& bundle) const {
  TemplateBundleSummary summary;
  for (const auto& program : bundle.generated_programs) {
    summary.generated_programs.push_back(make_program_preview(program.id, program.name, program.type, program_state_ids(program)));
  }
  for (const auto& rule : bundle.generated_rules) {
    summary.generated_rules.push_back(make_rule_preview(rule.id, rule.name, rule.description));
  }
  for (const auto& alarm : bundle.generated_alarms) {
    summary.generated_alarms.push_back(make_alarm_preview(alarm.id, alarm.name, alarm.description));
  }
  for (const auto& pid : bundle.generated_pids) {
    summary.generated_pids.push_back(make_pid_preview(pid.id, pid.name, pid.pv_signal_path, pid.output_target_id));
  }
  return summary;
}

TemplateResult<TemplateBundle> TemplateEngine::generate_bundle(const TemplateDraft& draft) const {
  TemplateResult<TemplateBundle> result;
  const auto* definition = find_definition(draft.template_kind);
  if (definition == nullptr) {
    result.status = TemplateStatus::error(TemplateErrorCode::template_unsupported_kind, "Unsupported template kind was requested.");
    return result;
  }

  const auto validation = validate_draft(draft, 0U, false);
  if (validation.has_errors()) {
    result.status = TemplateStatus::error(derive_error_code(validation.issues), validation.status.message);
    return result;
  }

  TemplateBundle bundle;
  bundle.template_kind = draft.template_kind;
  bundle.instance_id = draft.instance_id;
  const auto display_name = draft.display_name;

  switch (draft.template_kind) {
    case TemplateKind::pressure_pump:
    case TemplateKind::pump_with_flowmeter: {
      const auto pressure_signal = binding_or_empty(draft, "pressure_signal");
      const auto primary_output = binding_or_empty(draft, "primary_output");
      const auto start_threshold = *parameter_as_double(draft, "start_threshold");
      const auto stop_threshold = *parameter_as_double(draft, "stop_threshold");
      const auto hysteresis = *parameter_as_double(draft, "hysteresis");

      auto low_rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "low_pressure_on"), display_name + " Low Pressure On", make_compare_tree("pressure.low", pressure_signal, ConditionOperator::lte, start_threshold, hysteresis), "Requests the primary relay ON while pressure is below the start threshold.");
      low_rule.while_true_actions.push_back(make_relay_rule_action(low_rule.id + ".relay_on", primary_output, RelayState::on, "template low pressure on"));
      bundle.generated_rules.push_back(std::move(low_rule));

      auto high_rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "high_pressure_off"), display_name + " High Pressure Off", make_compare_tree("pressure.high", pressure_signal, ConditionOperator::gte, stop_threshold, hysteresis), "Requests the primary relay OFF while pressure is above the stop threshold.");
      high_rule.while_true_actions.push_back(make_relay_rule_action(high_rule.id + ".relay_off", primary_output, RelayState::off, "template high pressure off"));
      bundle.generated_rules.push_back(std::move(high_rule));

      if (draft.template_kind == TemplateKind::pump_with_flowmeter) {
        const auto flow_signal = binding_or_empty(draft, "flow_rate_signal");
        const auto min_flow_threshold = *parameter_as_double(draft, "min_flow_threshold");
        const auto alarm_id = make_artifact_id(draft.instance_id, "alarm", "no_flow_trip");
        bundle.generated_alarms.push_back(make_alarm_shell(alarm_id, display_name + " No Flow Trip", AlarmSeverity::trip, true, "Supervisory no-flow alarm for the generated flowmeter template."));
        auto no_flow_rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "no_flow_alarm"), display_name + " No Flow Alarm", make_compare_tree("flow.no_flow", flow_signal, ConditionOperator::lt, min_flow_threshold), "Sets the no-flow alarm when the flow signal remains below the minimum threshold.");
        no_flow_rule.on_true_actions.push_back(make_alarm_rule_action(no_flow_rule.id + ".set", alarm_id, true));
        no_flow_rule.on_false_actions.push_back(make_alarm_rule_action(no_flow_rule.id + ".clear", alarm_id, false));
        bundle.generated_rules.push_back(std::move(no_flow_rule));
      }

      if (has_parameter(draft, "high_trip_threshold")) {
        const auto threshold = *parameter_as_double(draft, "high_trip_threshold");
        const auto alarm_id = make_artifact_id(draft.instance_id, "alarm", "high_pressure_trip");
        bundle.generated_alarms.push_back(make_alarm_shell(alarm_id, display_name + " High Pressure Trip", AlarmSeverity::trip, true, "Optional high-pressure supervisory alarm."));
        auto high_trip_rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "high_pressure_trip"), display_name + " High Pressure Trip", make_compare_tree("pressure.trip", pressure_signal, ConditionOperator::gte, threshold), "Sets the optional high-pressure trip alarm when pressure exceeds its trip threshold.");
        high_trip_rule.on_true_actions.push_back(make_alarm_rule_action(high_trip_rule.id + ".set", alarm_id, true));
        high_trip_rule.on_false_actions.push_back(make_alarm_rule_action(high_trip_rule.id + ".clear", alarm_id, false));
        bundle.generated_rules.push_back(std::move(high_trip_rule));
      }
      break;
    }
    case TemplateKind::batch_dosing: {
      const auto output_id = binding_or_empty(draft, "primary_output");
      const auto target_volume = *parameter_as_double(draft, "target_volume");
      const auto output_snapshot = actuator_manager_.get_snapshot(output_id);

      SequenceProgram program;
      program.id = make_artifact_id(draft.instance_id, "program", "main");
      program.name = display_name + " Program";
      program.description = "Safe supervisory batch dosing skeleton generated from Template Engine.";
      program.enabled = false;
      program.type = SequenceProgramType::dosing;
      program.initial_state_id = "READY_CHECK";
      program.normal_stop_state_id = "NORMAL_STOP";
      program.trip_state_id = "TRIP_STOP";
      program.lockout_state_id = "LOCKOUT";

      auto ready = make_state("READY_CHECK", "READY_CHECK", SequenceStateType::action);
      ready.entry_actions.push_back(make_note_sequence_action("ready.note", "Review target volume before enabling: " + std::to_string(target_volume)));
      ready.transitions.push_back(make_transition("ready.to_start", "READY_CHECK -> START", "START"));
      auto start = make_state("START", "START", SequenceStateType::action);
      start.transitions.push_back(make_transition("start.to_dispense", "START -> DISPENSE", "DISPENSE"));
      auto dispense = make_state("DISPENSE", "DISPENSE", SequenceStateType::run);
      dispense.non_skippable = true;
      if (output_snapshot.value->kind == ActuatorTargetKind::relay) {
        dispense.active_actions.push_back(make_relay_sequence_action("dispense.output", output_id, RelayState::on, "template dispense active"));
      } else {
        dispense.active_actions.push_back(make_pwm_sequence_action("dispense.output", output_id, 100.0, true, "template dispense active"));
      }
      if (has_binding(draft, "batch_done_signal")) {
        dispense.transitions.push_back(make_transition("dispense.to_complete", "DISPENSE -> COMPLETE", "COMPLETE", make_compare_tree("dispense.done", binding_or_empty(draft, "batch_done_signal"), ConditionOperator::eq, true)));
      } else {
        bundle.warnings.push_back("batch_done_signal is not bound, so DISPENSE stays active until a manual stop or future edits are applied.");
      }
      if (has_binding(draft, "fault_signal")) {
        dispense.transitions.push_back(make_transition("dispense.to_trip", "DISPENSE -> TRIP_STOP", "TRIP_STOP", make_compare_tree("dispense.fault", binding_or_empty(draft, "fault_signal"), ConditionOperator::eq, true)));
      }
      auto complete = make_state("COMPLETE", "COMPLETE", SequenceStateType::action);
      complete.transitions.push_back(make_transition("complete.to_stop", "COMPLETE -> NORMAL_STOP", "NORMAL_STOP"));
      auto normal_stop = make_state("NORMAL_STOP", "NORMAL_STOP", SequenceStateType::stop);
      auto trip_stop = make_state("TRIP_STOP", "TRIP_STOP", SequenceStateType::stop);
      trip_stop.transitions.push_back(make_transition("trip.to_lockout", "TRIP_STOP -> LOCKOUT", "LOCKOUT"));
      auto lockout = make_state("LOCKOUT", "LOCKOUT", SequenceStateType::lockout);
      program.states = {ready, start, dispense, complete, normal_stop, trip_stop, lockout};
      bundle.generated_programs.push_back(std::move(program));
      break;
    }
    case TemplateKind::pid_pressure_pwm_pump:
    case TemplateKind::pid_flow_pwm_pump: {
      const auto pv_signal = draft.template_kind == TemplateKind::pid_pressure_pwm_pump ? binding_or_empty(draft, "pressure_signal") : binding_or_empty(draft, "flow_rate_signal");
      const auto pwm_output = binding_or_empty(draft, "pwm_output");
      bundle.generated_pids.push_back(make_pid_shell(make_artifact_id(draft.instance_id, "pid", "main"), display_name + " PID", pv_signal, pwm_output, *parameter_as_double(draft, "setpoint"), *parameter_as_double(draft, "kp"), *parameter_as_double(draft, "ki"), *parameter_as_double(draft, "kd"), *parameter_as_double(draft, "output_min"), *parameter_as_double(draft, "output_max"), *parameter_as_double(draft, "deadband")));
      if (draft.template_kind == TemplateKind::pid_pressure_pwm_pump && has_parameter(draft, "high_trip_threshold")) {
        const auto threshold = *parameter_as_double(draft, "high_trip_threshold");
        const auto alarm_id = make_artifact_id(draft.instance_id, "alarm", "high_pressure_trip");
        bundle.generated_alarms.push_back(make_alarm_shell(alarm_id, display_name + " High Pressure Trip", AlarmSeverity::trip, true, "Optional high-pressure supervisory alarm for the generated PID bundle."));
        auto rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "high_pressure_trip"), display_name + " High Pressure Trip", make_compare_tree("pid.pressure.trip", pv_signal, ConditionOperator::gte, threshold), "Sets the optional high-pressure alarm condition for the generated PID bundle.");
        rule.on_true_actions.push_back(make_alarm_rule_action(rule.id + ".set", alarm_id, true));
        rule.on_false_actions.push_back(make_alarm_rule_action(rule.id + ".clear", alarm_id, false));
        bundle.generated_rules.push_back(std::move(rule));
      }
      break;
    }
    case TemplateKind::compressor_basic: {
      const auto output_id = binding_or_empty(draft, "main_output");
      const auto cooldown_ms = static_cast<controller::sequence::SequenceDurationMs>(*parameter_as_int64(draft, "cooldown_ms"));
      SequenceProgram program;
      program.id = make_artifact_id(draft.instance_id, "program", "main");
      program.name = display_name + " Program";
      program.description = "Basic supervisory compressor skeleton generated from Template Engine.";
      program.enabled = false;
      program.type = SequenceProgramType::compressor;
      program.initial_state_id = "OFF";
      program.normal_stop_state_id = "COOLDOWN";
      program.trip_state_id = "TRIP_STOP";
      program.lockout_state_id = "LOCKOUT";
      auto off = make_state("OFF", "OFF", SequenceStateType::stop);
      off.transitions.push_back(make_transition("off.to_ready", "OFF -> READY_CHECK", "READY_CHECK"));
      auto ready = make_state("READY_CHECK", "READY_CHECK", SequenceStateType::action);
      ready.transitions.push_back(make_transition("ready.to_start", "READY_CHECK -> START", "START"));
      auto start = make_state("START", "START", SequenceStateType::action);
      start.transitions.push_back(make_transition("start.to_run", "START -> RUN", "RUN"));
      auto run = make_state("RUN", "RUN", SequenceStateType::run);
      run.active_actions.push_back(make_relay_sequence_action("run.output", output_id, RelayState::on, "template compressor run"));
      auto cooldown = make_state("COOLDOWN", "COOLDOWN", SequenceStateType::cooldown);
      cooldown.min_time_ms = cooldown_ms;
      cooldown.transitions.push_back(make_transition("cooldown.to_stop", "COOLDOWN -> NORMAL_STOP", "NORMAL_STOP", std::nullopt, true));
      auto normal_stop = make_state("NORMAL_STOP", "NORMAL_STOP", SequenceStateType::stop);
      auto trip_stop = make_state("TRIP_STOP", "TRIP_STOP", SequenceStateType::stop);
      trip_stop.transitions.push_back(make_transition("trip.to_lockout", "TRIP_STOP -> LOCKOUT", "LOCKOUT"));
      auto lockout = make_state("LOCKOUT", "LOCKOUT", SequenceStateType::lockout);
      program.states = {off, ready, start, run, cooldown, normal_stop, trip_stop, lockout};
      bundle.generated_programs.push_back(std::move(program));
      if (has_binding(draft, "pressure_signal")) {
        const auto alarm_id = make_artifact_id(draft.instance_id, "alarm", "pressure_trip");
        bundle.generated_alarms.push_back(make_alarm_shell(alarm_id, display_name + " Pressure Trip", AlarmSeverity::trip, true, "Optional supervisory pressure alarm for compressor skeleton."));
        auto rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "pressure_alarm"), display_name + " Pressure Alarm", make_compare_tree("compressor.pressure.alarm", binding_or_empty(draft, "pressure_signal"), ConditionOperator::gte, 0.0), "Placeholder pressure supervision rule generated for operator review.");
        rule.on_true_actions.push_back(make_alarm_rule_action(rule.id + ".set", alarm_id, true));
        rule.on_false_actions.push_back(make_alarm_rule_action(rule.id + ".clear", alarm_id, false));
        bundle.generated_rules.push_back(std::move(rule));
      }
      if (has_binding(draft, "fault_signal")) {
        const auto alarm_id = make_artifact_id(draft.instance_id, "alarm", "fault_trip");
        bundle.generated_alarms.push_back(make_alarm_shell(alarm_id, display_name + " Fault Trip", AlarmSeverity::trip, true, "Optional supervisory fault alarm for compressor skeleton."));
        auto rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "fault_alarm"), display_name + " Fault Alarm", make_compare_tree("compressor.fault.alarm", binding_or_empty(draft, "fault_signal"), ConditionOperator::eq, true), "Fault signal alarm condition rule generated for operator review.");
        rule.on_true_actions.push_back(make_alarm_rule_action(rule.id + ".set", alarm_id, true));
        rule.on_false_actions.push_back(make_alarm_rule_action(rule.id + ".clear", alarm_id, false));
        bundle.generated_rules.push_back(std::move(rule));
      }
      break;
    }
    case TemplateKind::burner_supervisory_skeleton: {
      const auto fan_output = binding_or_empty(draft, "fan_output");
      const auto ignition_output = binding_or_empty(draft, "ignition_output");
      const auto fuel_output = binding_or_empty(draft, "fuel_output");
      const auto flame_signal = binding_or_empty(draft, "flame_signal");
      const auto air_ok_signal = binding_or_empty(draft, "air_ok_signal");
      const auto prepurge_ms = static_cast<controller::sequence::SequenceDurationMs>(*parameter_as_int64(draft, "prepurge_ms"));
      const auto ignition_timeout_ms = static_cast<controller::sequence::SequenceDurationMs>(*parameter_as_int64(draft, "ignition_timeout_ms"));
      const auto postpurge_ms = static_cast<controller::sequence::SequenceDurationMs>(*parameter_as_int64(draft, "postpurge_ms"));
      const auto fan_snapshot = actuator_manager_.get_snapshot(fan_output);

      SequenceProgram program;
      program.id = make_artifact_id(draft.instance_id, "program", "main");
      program.name = display_name + " Program";
      program.description = "Supervisory-only burner sequence skeleton generated disabled for review.";
      program.enabled = false;
      program.type = SequenceProgramType::burner;
      program.initial_state_id = "OFF";
      program.normal_stop_state_id = "POSTPURGE";
      program.trip_state_id = "TRIP_STOP";
      program.lockout_state_id = "LOCKOUT";
      auto off = make_state("OFF", "OFF", SequenceStateType::stop);
      off.transitions.push_back(make_transition("off.to_ready", "OFF -> READY_CHECK", "READY_CHECK"));
      auto ready = make_state("READY_CHECK", "READY_CHECK", SequenceStateType::action);
      ready.guard_condition = make_compare_tree("burner.ready.air", air_ok_signal, ConditionOperator::eq, true);
      ready.guard_fail_target_state_id = "TRIP_STOP";
      ready.transitions.push_back(make_transition("ready.to_prepurge", "READY_CHECK -> PREPURGE", "PREPURGE"));
      auto prepurge = make_state("PREPURGE", "PREPURGE", SequenceStateType::purge);
      prepurge.min_time_ms = prepurge_ms;
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        prepurge.active_actions.push_back(make_relay_sequence_action("prepurge.fan", fan_output, RelayState::on, "template prepurge fan"));
      } else {
        prepurge.active_actions.push_back(make_pwm_sequence_action("prepurge.fan", fan_output, 100.0, true, "template prepurge fan"));
      }
      prepurge.transitions.push_back(make_transition("prepurge.to_ignition", "PREPURGE -> IGNITION", "IGNITION", std::nullopt, true));
      auto ignition = make_state("IGNITION", "IGNITION", SequenceStateType::ignition);
      ignition.max_time_ms = ignition_timeout_ms;
      ignition.timeout_target_state_id = "TRIP_STOP";
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        ignition.active_actions.push_back(make_relay_sequence_action("ignition.fan", fan_output, RelayState::on, "template ignition fan"));
      } else {
        ignition.active_actions.push_back(make_pwm_sequence_action("ignition.fan", fan_output, 100.0, true, "template ignition fan"));
      }
      ignition.active_actions.push_back(make_relay_sequence_action("ignition.spark", ignition_output, RelayState::on, "template ignition output"));
      ignition.active_actions.push_back(make_relay_sequence_action("ignition.fuel", fuel_output, RelayState::on, "template fuel output"));
      ignition.transitions.push_back(make_transition("ignition.to_prove", "IGNITION -> FLAME_PROVE", "FLAME_PROVE"));
      auto prove = make_state("FLAME_PROVE", "FLAME_PROVE", SequenceStateType::ignition);
      prove.max_time_ms = ignition_timeout_ms;
      prove.timeout_target_state_id = "TRIP_STOP";
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        prove.active_actions.push_back(make_relay_sequence_action("prove.fan", fan_output, RelayState::on, "template prove fan"));
      } else {
        prove.active_actions.push_back(make_pwm_sequence_action("prove.fan", fan_output, 100.0, true, "template prove fan"));
      }
      prove.active_actions.push_back(make_relay_sequence_action("prove.spark", ignition_output, RelayState::on, "template prove ignition"));
      prove.active_actions.push_back(make_relay_sequence_action("prove.fuel", fuel_output, RelayState::on, "template prove fuel"));
      prove.transitions.push_back(make_transition("prove.to_run", "FLAME_PROVE -> RUN", "RUN", make_compare_tree("burner.prove.flame", flame_signal, ConditionOperator::eq, true)));
      auto run = make_state("RUN", "RUN", SequenceStateType::run);
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        run.active_actions.push_back(make_relay_sequence_action("run.fan", fan_output, RelayState::on, "template burner run fan"));
      } else {
        run.active_actions.push_back(make_pwm_sequence_action("run.fan", fan_output, 100.0, true, "template burner run fan"));
      }
      run.active_actions.push_back(make_relay_sequence_action("run.fuel", fuel_output, RelayState::on, "template burner run fuel"));
      auto postpurge = make_state("POSTPURGE", "POSTPURGE", SequenceStateType::purge);
      postpurge.min_time_ms = postpurge_ms;
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        postpurge.active_actions.push_back(make_relay_sequence_action("postpurge.fan", fan_output, RelayState::on, "template postpurge fan"));
      } else {
        postpurge.active_actions.push_back(make_pwm_sequence_action("postpurge.fan", fan_output, 100.0, true, "template postpurge fan"));
      }
      postpurge.transitions.push_back(make_transition("postpurge.to_stop", "POSTPURGE -> NORMAL_STOP", "NORMAL_STOP", std::nullopt, true));
      auto normal_stop = make_state("NORMAL_STOP", "NORMAL_STOP", SequenceStateType::stop);
      auto trip_stop = make_state("TRIP_STOP", "TRIP_STOP", SequenceStateType::stop);
      trip_stop.transitions.push_back(make_transition("trip.to_lockout", "TRIP_STOP -> LOCKOUT", "LOCKOUT"));
      auto lockout = make_state("LOCKOUT", "LOCKOUT", SequenceStateType::lockout);
      program.states = {off, ready, prepurge, ignition, prove, run, postpurge, normal_stop, trip_stop, lockout};
      bundle.generated_programs.push_back(std::move(program));
      bundle.warnings.push_back("Burner template is supervisory-only. It is not certified burner management logic and remains disabled after apply.");
      const auto air_alarm_id = make_artifact_id(draft.instance_id, "alarm", "air_fault");
      const auto flame_alarm_id = make_artifact_id(draft.instance_id, "alarm", "flame_fault");
      bundle.generated_alarms.push_back(make_alarm_shell(air_alarm_id, display_name + " Air Fault", AlarmSeverity::trip, true, "Supervisory burner air fault alarm."));
      bundle.generated_alarms.push_back(make_alarm_shell(flame_alarm_id, display_name + " Flame Fault", AlarmSeverity::trip, true, "Supervisory burner flame fault alarm."));
      auto air_rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "air_fault"), display_name + " Air Fault", make_compare_tree("burner.air.rule", air_ok_signal, ConditionOperator::eq, false), "Air supervision alarm rule for the burner supervisory skeleton.");
      air_rule.on_true_actions.push_back(make_alarm_rule_action(air_rule.id + ".set", air_alarm_id, true));
      air_rule.on_false_actions.push_back(make_alarm_rule_action(air_rule.id + ".clear", air_alarm_id, false));
      bundle.generated_rules.push_back(std::move(air_rule));
      auto flame_rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "flame_fault"), display_name + " Flame Fault", make_compare_tree("burner.flame.rule", flame_signal, ConditionOperator::eq, false), "Flame supervision alarm rule for the burner supervisory skeleton.");
      flame_rule.on_true_actions.push_back(make_alarm_rule_action(flame_rule.id + ".set", flame_alarm_id, true));
      flame_rule.on_false_actions.push_back(make_alarm_rule_action(flame_rule.id + ".clear", flame_alarm_id, false));
      bundle.generated_rules.push_back(std::move(flame_rule));
      break;
    }
    case TemplateKind::incinerator_supervisory_skeleton: {
      const auto fan_output = binding_or_empty(draft, "fan_output");
      const auto diesel_output = binding_or_empty(draft, "diesel_output");
      const auto sludge_output = binding_or_empty(draft, "sludge_output");
      const auto chamber_temp = binding_or_empty(draft, "chamber_temp_signal");
      const auto warmup_temp = *parameter_as_double(draft, "warmup_temp");
      const auto cooldown_temp = *parameter_as_double(draft, "cooldown_temp");
      const auto fan_snapshot = actuator_manager_.get_snapshot(fan_output);
      const auto sludge_snapshot = actuator_manager_.get_snapshot(sludge_output);
      SequenceProgram program;
      program.id = make_artifact_id(draft.instance_id, "program", "main");
      program.name = display_name + " Program";
      program.description = "Supervisory-only incinerator sequence skeleton generated disabled for review.";
      program.enabled = false;
      program.type = SequenceProgramType::incinerator;
      program.initial_state_id = "OFF";
      program.normal_stop_state_id = "COOLDOWN";
      program.trip_state_id = "TRIP_STOP";
      program.lockout_state_id = "LOCKOUT";
      auto off = make_state("OFF", "OFF", SequenceStateType::stop);
      off.transitions.push_back(make_transition("off.to_ready", "OFF -> READY_CHECK", "READY_CHECK"));
      auto ready = make_state("READY_CHECK", "READY_CHECK", SequenceStateType::action);
      ready.transitions.push_back(make_transition("ready.to_warmup", "READY_CHECK -> DIESEL_WARMUP", "DIESEL_WARMUP"));
      auto warmup = make_state("DIESEL_WARMUP", "DIESEL_WARMUP", SequenceStateType::action);
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        warmup.active_actions.push_back(make_relay_sequence_action("warmup.fan", fan_output, RelayState::on, "template warmup fan"));
      } else {
        warmup.active_actions.push_back(make_pwm_sequence_action("warmup.fan", fan_output, 100.0, true, "template warmup fan"));
      }
      warmup.active_actions.push_back(make_relay_sequence_action("warmup.diesel", diesel_output, RelayState::on, "template warmup diesel"));
      warmup.transitions.push_back(make_transition("warmup.to_enable", "DIESEL_WARMUP -> SLUDGE_ENABLE", "SLUDGE_ENABLE", make_compare_tree("incinerator.warmup.temp", chamber_temp, ConditionOperator::gte, warmup_temp)));
      auto sludge_enable = make_state("SLUDGE_ENABLE", "SLUDGE_ENABLE", SequenceStateType::action);
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        sludge_enable.active_actions.push_back(make_relay_sequence_action("enable.fan", fan_output, RelayState::on, "template enable fan"));
      } else {
        sludge_enable.active_actions.push_back(make_pwm_sequence_action("enable.fan", fan_output, 100.0, true, "template enable fan"));
      }
      sludge_enable.active_actions.push_back(make_relay_sequence_action("enable.diesel", diesel_output, RelayState::on, "template enable diesel"));
      if (has_binding(draft, "sludge_ready_signal")) {
        sludge_enable.transitions.push_back(make_transition("enable.to_run", "SLUDGE_ENABLE -> SLUDGE_RUN", "SLUDGE_RUN", make_compare_tree("incinerator.sludge.ready", binding_or_empty(draft, "sludge_ready_signal"), ConditionOperator::eq, true)));
      } else {
        sludge_enable.transitions.push_back(make_transition("enable.to_run", "SLUDGE_ENABLE -> SLUDGE_RUN", "SLUDGE_RUN"));
      }
      auto sludge_run = make_state("SLUDGE_RUN", "SLUDGE_RUN", SequenceStateType::run);
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        sludge_run.active_actions.push_back(make_relay_sequence_action("run.fan", fan_output, RelayState::on, "template sludge run fan"));
      } else {
        sludge_run.active_actions.push_back(make_pwm_sequence_action("run.fan", fan_output, 100.0, true, "template sludge run fan"));
      }
      if (sludge_snapshot.value->kind == ActuatorTargetKind::relay) {
        sludge_run.active_actions.push_back(make_relay_sequence_action("run.sludge", sludge_output, RelayState::on, "template sludge run output"));
      } else {
        sludge_run.active_actions.push_back(make_pwm_sequence_action("run.sludge", sludge_output, 100.0, true, "template sludge run output"));
      }
      auto cooldown = make_state("COOLDOWN", "COOLDOWN", SequenceStateType::cooldown);
      if (fan_snapshot.value->kind == ActuatorTargetKind::relay) {
        cooldown.active_actions.push_back(make_relay_sequence_action("cooldown.fan", fan_output, RelayState::on, "template cooldown fan"));
      } else {
        cooldown.active_actions.push_back(make_pwm_sequence_action("cooldown.fan", fan_output, 100.0, true, "template cooldown fan"));
      }
      cooldown.transitions.push_back(make_transition("cooldown.to_stop", "COOLDOWN -> NORMAL_STOP", "NORMAL_STOP", make_compare_tree("incinerator.cooldown.temp", chamber_temp, ConditionOperator::lte, cooldown_temp)));
      auto normal_stop = make_state("NORMAL_STOP", "NORMAL_STOP", SequenceStateType::stop);
      auto trip_stop = make_state("TRIP_STOP", "TRIP_STOP", SequenceStateType::stop);
      trip_stop.transitions.push_back(make_transition("trip.to_lockout", "TRIP_STOP -> LOCKOUT", "LOCKOUT"));
      auto lockout = make_state("LOCKOUT", "LOCKOUT", SequenceStateType::lockout);
      program.states = {off, ready, warmup, sludge_enable, sludge_run, cooldown, normal_stop, trip_stop, lockout};
      bundle.generated_programs.push_back(std::move(program));
      bundle.warnings.push_back("Incinerator template is supervisory-only. It is not certified combustion logic and remains disabled after apply.");
      if (has_binding(draft, "flame_signal")) {
        const auto alarm_id = make_artifact_id(draft.instance_id, "alarm", "flame_fault");
        bundle.generated_alarms.push_back(make_alarm_shell(alarm_id, display_name + " Flame Fault", AlarmSeverity::trip, true, "Optional flame supervisory alarm for the incinerator skeleton."));
        auto rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "flame_fault"), display_name + " Flame Fault", make_compare_tree("incinerator.flame.rule", binding_or_empty(draft, "flame_signal"), ConditionOperator::eq, false), "Optional flame supervision alarm rule.");
        rule.on_true_actions.push_back(make_alarm_rule_action(rule.id + ".set", alarm_id, true));
        rule.on_false_actions.push_back(make_alarm_rule_action(rule.id + ".clear", alarm_id, false));
        bundle.generated_rules.push_back(std::move(rule));
      }
      if (has_binding(draft, "sludge_ready_signal")) {
        const auto alarm_id = make_artifact_id(draft.instance_id, "alarm", "sludge_ready_fault");
        bundle.generated_alarms.push_back(make_alarm_shell(alarm_id, display_name + " Sludge Ready Fault", AlarmSeverity::warning, false, "Optional sludge-ready supervisory alarm."));
        auto rule = make_rule_shell(make_artifact_id(draft.instance_id, "rule", "sludge_ready_fault"), display_name + " Sludge Ready Fault", make_compare_tree("incinerator.sludge.rule", binding_or_empty(draft, "sludge_ready_signal"), ConditionOperator::eq, false), "Optional sludge-ready supervision alarm rule.");
        rule.on_true_actions.push_back(make_alarm_rule_action(rule.id + ".set", alarm_id, true));
        rule.on_false_actions.push_back(make_alarm_rule_action(rule.id + ".clear", alarm_id, false));
        bundle.generated_rules.push_back(std::move(rule));
      }
      break;
    }
  }

  result.status = TemplateStatus::success("Template bundle generated.");
  result.value = std::move(bundle);
  return result;
}

TemplateResult<TemplatePreview> TemplateEngine::preview_draft(
    const TemplateDraft& draft,
    const TemplateTimestampMs now_ms) const {
  TemplateResult<TemplatePreview> result;
  const auto* definition = find_definition(draft.template_kind);
  if (definition == nullptr) {
    result.status = TemplateStatus::error(TemplateErrorCode::template_unsupported_kind, "Unsupported template kind was requested.");
    return result;
  }

  TemplatePreview preview;
  preview.draft_summary = build_draft_summary(draft, *definition);
  const auto validation = validate_draft(draft, now_ms, true);
  preview.validation_issues = validation.issues;
  preview.will_create_disabled = true;
  preview.bundle_summary = build_outline_summary(draft, *definition);

  const auto generated = generate_bundle(draft);
  if (generated.ok()) {
    preview.bundle_summary = build_bundle_summary(*generated.value);
    preview.preview_valid = true;
    preview.warnings = generated.value->warnings;
  }

  for (const auto& issue : validation.issues) {
    if (issue.severity == TemplateIssueSeverity::warning) {
      preview.warnings.push_back(issue.message);
    }
  }

  preview.apply_allowed = preview.preview_valid && !validation.has_errors();
  result.status = validation.has_errors() ? TemplateStatus::error(derive_error_code(validation.issues), validation.status.message)
                                          : TemplateStatus::success("Template preview refreshed.");
  result.value = std::move(preview);
  return result;
}

TemplateApplyResult TemplateEngine::apply_template(
    const TemplateDraft& draft,
    const TemplateCommandContext& context) {
  if (!has_text(context.source)) {
    return TemplateApplyResult{false, TemplateStatus::error(TemplateErrorCode::template_invalid_argument, "TemplateCommandContext.source must not be empty.")};
  }
  if (!has_text(context.reason)) {
    return TemplateApplyResult{false, TemplateStatus::error(TemplateErrorCode::template_invalid_argument, "TemplateCommandContext.reason must not be empty.")};
  }

  const auto validation = validate_draft(draft, context.now_ms, true);
  if (validation.has_errors()) {
    return TemplateApplyResult{false, TemplateStatus::error(derive_error_code(validation.issues), validation.status.message)};
  }

  const auto generated = generate_bundle(draft);
  if (!generated.ok()) {
    return TemplateApplyResult{false, generated.status};
  }

  std::vector<RollbackRecord> registered;
  std::size_t successful_registrations = 0U;
  bool apply_injected = false;
  const auto maybe_inject_apply_failure = [&]() -> std::optional<TemplateStatus> {
    if (!apply_injected && fault_injection_.fail_apply_after_successful_registrations.has_value() && successful_registrations == *fault_injection_.fail_apply_after_successful_registrations) {
      apply_injected = true;
      return TemplateStatus::error(TemplateErrorCode::template_apply_failed, "Injected template apply failure for rollback verification.");
    }
    return std::nullopt;
  };

  auto rollback = [&](TemplateStatus failure_status) {
    TemplateApplyResult response;
    response.accepted = false;
    response.status = failure_status;
    response.rollback_attempted = !registered.empty();
    bool rollback_injected = false;
    std::size_t successful_removals = 0U;
    for (auto it = registered.rbegin(); it != registered.rend(); ++it) {
      if (!rollback_injected && fault_injection_.fail_rollback_after_successful_removals.has_value() && successful_removals == *fault_injection_.fail_rollback_after_successful_removals) {
        rollback_injected = true;
        response.rollback_succeeded = false;
        append_issue(response.rollback_issues, "rollback." + it->id, "TEMPLATE_ROLLBACK_FAILED", TemplateIssueSeverity::error, "Injected rollback failure while removing '" + it->id + "'.");
        continue;
      }

      bool removed = false;
      std::string message;
      switch (it->kind) {
        case RollbackRecord::Kind::alarm: {
          const auto result_remove = alarm_service_.remove_alarm(it->id, context.now_ms);
          removed = result_remove.ok();
          message = result_remove.status.message;
          break;
        }
        case RollbackRecord::Kind::pid: {
          const auto result_remove = pid_service_.remove_pid(it->id, context.now_ms);
          removed = result_remove.ok();
          message = result_remove.status.message;
          break;
        }
        case RollbackRecord::Kind::rule: {
          const auto result_remove = logic_service_.remove_rule(it->id, context.now_ms);
          removed = result_remove.ok();
          message = result_remove.status.message;
          break;
        }
        case RollbackRecord::Kind::program: {
          const auto result_remove = sequence_service_.remove_program(it->id, context.now_ms);
          removed = result_remove.ok();
          message = result_remove.status.message;
          break;
        }
      }

      if (!removed) {
        response.rollback_succeeded = false;
        append_issue(response.rollback_issues, "rollback." + it->id, "TEMPLATE_ROLLBACK_FAILED", TemplateIssueSeverity::error, "Rollback failed for '" + it->id + "': " + message);
      } else {
        ++successful_removals;
      }
    }

    if (!response.rollback_issues.empty()) {
      response.status = TemplateStatus::error(TemplateErrorCode::template_rollback_failed, "Template apply failed and rollback did not complete cleanly.");
    }
    return response;
  };

  auto register_alarm = [&](const AlarmDescriptor& descriptor) -> std::optional<TemplateApplyResult> {
    if (const auto injected = maybe_inject_apply_failure(); injected.has_value()) {
      return rollback(*injected);
    }
    const auto op = alarm_service_.register_alarm(descriptor);
    if (!op.ok()) {
      return rollback(TemplateStatus::error(TemplateErrorCode::template_apply_failed, "Failed to register alarm '" + descriptor.id + "': " + op.status.message));
    }
    registered.push_back(RollbackRecord{RollbackRecord::Kind::alarm, descriptor.id});
    ++successful_registrations;
    return std::nullopt;
  };
  auto register_pid = [&](const PidServiceDescriptor& descriptor) -> std::optional<TemplateApplyResult> {
    if (const auto injected = maybe_inject_apply_failure(); injected.has_value()) {
      return rollback(*injected);
    }
    const auto op = pid_service_.register_pid(descriptor);
    if (!op.ok()) {
      return rollback(TemplateStatus::error(TemplateErrorCode::template_apply_failed, "Failed to register PID '" + descriptor.id + "': " + op.status.message));
    }
    registered.push_back(RollbackRecord{RollbackRecord::Kind::pid, descriptor.id});
    ++successful_registrations;
    return std::nullopt;
  };
  auto register_rule = [&](const RuleDescriptor& descriptor) -> std::optional<TemplateApplyResult> {
    if (const auto injected = maybe_inject_apply_failure(); injected.has_value()) {
      return rollback(*injected);
    }
    const auto op = logic_service_.register_rule(descriptor);
    if (!op.ok()) {
      return rollback(TemplateStatus::error(TemplateErrorCode::template_apply_failed, "Failed to register rule '" + descriptor.id + "': " + op.status.message));
    }
    registered.push_back(RollbackRecord{RollbackRecord::Kind::rule, descriptor.id});
    ++successful_registrations;
    return std::nullopt;
  };
  auto register_program = [&](const SequenceProgram& descriptor) -> std::optional<TemplateApplyResult> {
    if (const auto injected = maybe_inject_apply_failure(); injected.has_value()) {
      return rollback(*injected);
    }
    const auto op = sequence_service_.register_program(descriptor);
    if (!op.ok()) {
      return rollback(TemplateStatus::error(TemplateErrorCode::template_apply_failed, "Failed to register program '" + descriptor.id + "': " + op.status.message));
    }
    registered.push_back(RollbackRecord{RollbackRecord::Kind::program, descriptor.id});
    ++successful_registrations;
    return std::nullopt;
  };

  for (const auto& descriptor : generated.value->generated_alarms) {
    if (const auto failure = register_alarm(descriptor); failure.has_value()) {
      return *failure;
    }
  }
  for (const auto& descriptor : generated.value->generated_pids) {
    if (const auto failure = register_pid(descriptor); failure.has_value()) {
      return *failure;
    }
  }
  for (const auto& descriptor : generated.value->generated_rules) {
    if (const auto failure = register_rule(descriptor); failure.has_value()) {
      return *failure;
    }
  }
  for (const auto& descriptor : generated.value->generated_programs) {
    if (const auto failure = register_program(descriptor); failure.has_value()) {
      return *failure;
    }
  }

  TemplateApplyResult response;
  response.accepted = true;
  response.status = TemplateStatus::success("Template bundle applied disabled for review.");
  for (const auto& descriptor : generated.value->generated_programs) {
    response.created_programs.push_back(make_created_summary(descriptor.id, descriptor.name, "program", descriptor.enabled));
  }
  for (const auto& descriptor : generated.value->generated_rules) {
    response.created_rules.push_back(make_created_summary(descriptor.id, descriptor.name, "rule", descriptor.enabled));
  }
  for (const auto& descriptor : generated.value->generated_alarms) {
    response.created_alarms.push_back(make_created_summary(descriptor.id, descriptor.name, "alarm", descriptor.enabled));
  }
  for (const auto& descriptor : generated.value->generated_pids) {
    response.created_pids.push_back(make_created_summary(descriptor.id, descriptor.name, "pid", descriptor.enabled));
  }
  return response;
}

}  // namespace controller::templates
