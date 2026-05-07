#pragma once

#include <cstddef>
#include <cstdint>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_descriptor.hpp"
#include "alarms/alarm_service.hpp"
#include "conditions/condition_node.hpp"
#include "conditions/condition_tree.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "logic/logic_service.hpp"
#include "sequence/sequence_program.hpp"
#include "sequence/sequence_service.hpp"
#include "sequence/sequence_state.hpp"
#include "sequence/sequence_transition.hpp"
#include "signals/signal_descriptor.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_descriptor.hpp"
#include "timers/timer_service.hpp"

namespace logic_test {

inline int failures = 0;

inline void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

inline controller::signals::SignalDescriptor make_signal_descriptor(
    std::string path,
    std::string name,
    const controller::signals::SignalType type,
    const controller::signals::SignalAccessMode access_mode = controller::signals::SignalAccessMode::read_only) {
  return controller::signals::SignalDescriptor{
      std::move(path),
      std::move(name),
      "logic test signal",
      type,
      "",
      "logic_tests",
      access_mode,
      0U,
      true,
      true,
  };
}

inline controller::conditions::ConditionNode make_bool_compare_node(
    const std::string& node_id,
    const std::string& signal_path,
    const bool expected) {
  using controller::conditions::ConditionNode;
  using controller::conditions::ConditionNodeKind;
  using controller::conditions::ConditionOperator;
  using controller::conditions::ConditionSignalCompareNode;

  return ConditionNode{
      {node_id, node_id, "", ConditionNodeKind::signal_compare, 0U, 0U, std::nullopt},
      ConditionSignalCompareNode{signal_path, ConditionOperator::eq, expected},
  };
}

inline controller::conditions::ConditionTree make_bool_signal_tree(
    const std::string& tree_id,
    const std::string& signal_path,
    const bool expected) {
  const auto root_id = tree_id + "_root";
  return controller::conditions::ConditionTree{
      tree_id,
      root_id,
      {make_bool_compare_node(root_id, signal_path, expected)},
  };
}

inline controller::logic::RuleDescriptor make_rule(
    const std::string& id,
    const std::string& signal_path,
    const bool expected = true) {
  controller::logic::RuleDescriptor rule;
  rule.id = id;
  rule.name = id;
  rule.enabled = true;
  rule.description = "logic test rule";
  rule.condition_tree = make_bool_signal_tree(id + "_tree", signal_path, expected);
  rule.source_module = "logic_tests";
  return rule;
}

inline controller::logic::RuleAction relay_action(
    const std::string& id,
    const std::string& target_id,
    const controller::hal::RelayState state,
    const std::string& reason = "") {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleRelayRequestAction;

  return RuleAction{id, id, RuleActionKind::relay_request, RuleRelayRequestAction{target_id, state, reason}};
}

inline controller::logic::RuleAction pwm_action(
    const std::string& id,
    const std::string& target_id,
    const double duty_percent,
    const bool enabled,
    const std::string& reason = "") {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RulePwmRequestAction;

  return RuleAction{id, id, RuleActionKind::pwm_request, RulePwmRequestAction{target_id, duty_percent, enabled, reason}};
}

inline controller::logic::RuleAction timer_start_action(const std::string& id, const std::string& timer_id) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleTimerStartAction;

  return RuleAction{id, id, RuleActionKind::timer_start, RuleTimerStartAction{timer_id}};
}

inline controller::logic::RuleAction timer_stop_action(const std::string& id, const std::string& timer_id) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleTimerStopAction;

  return RuleAction{id, id, RuleActionKind::timer_stop, RuleTimerStopAction{timer_id}};
}

inline controller::logic::RuleAction alarm_action(
    const std::string& id,
    const std::string& alarm_id,
    const bool condition_active) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleAlarmSetConditionAction;

  return RuleAction{id, id, RuleActionKind::alarm_set_condition, RuleAlarmSetConditionAction{alarm_id, condition_active}};
}

inline controller::logic::RuleAction virtual_signal_action(
    const std::string& id,
    const std::string& signal_path,
    const controller::signals::SignalValue& value) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleWriteVirtualSignalAction;

  return RuleAction{id, id, RuleActionKind::write_virtual_signal, RuleWriteVirtualSignalAction{signal_path, value}};
}

inline controller::logic::RuleAction program_start_action(const std::string& id, const std::string& program_id) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleProgramStartAction;

  return RuleAction{id, id, RuleActionKind::program_start, RuleProgramStartAction{program_id}};
}

inline controller::logic::RuleAction program_normal_stop_action(const std::string& id) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleProgramRequestNormalStopAction;

  return RuleAction{id, id, RuleActionKind::program_request_normal_stop, RuleProgramRequestNormalStopAction{}};
}

inline controller::logic::RuleAction program_trip_action(const std::string& id) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleProgramRequestTripAction;

  return RuleAction{id, id, RuleActionKind::program_request_trip, RuleProgramRequestTripAction{}};
}

inline controller::logic::RuleAction program_reset_action(const std::string& id) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleProgramResetActiveAction;

  return RuleAction{id, id, RuleActionKind::program_reset_active, RuleProgramResetActiveAction{}};
}

inline controller::logic::RuleAction note_action(const std::string& id, const std::string& note) {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleLogNoteAction;

  return RuleAction{id, id, RuleActionKind::log_note, RuleLogNoteAction{note}};
}

inline controller::sequence::SequenceTransition transition(
    const std::string& id,
    const std::string& target_state_id,
    std::optional<controller::conditions::ConditionTree> condition = std::nullopt) {
  return controller::sequence::SequenceTransition{id, id, target_state_id, std::move(condition), false, true};
}

inline controller::sequence::SequenceState state(
    const std::string& id,
    const controller::sequence::SequenceStateType type = controller::sequence::SequenceStateType::generic) {
  controller::sequence::SequenceState result;
  result.id = id;
  result.name = id;
  result.type = type;
  return result;
}

inline controller::sequence::SequenceProgram make_program() {
  using controller::sequence::SequenceProgram;
  using controller::sequence::SequenceProgramType;
  using controller::sequence::SequenceStateType;

  SequenceProgram program;
  program.id = "program.main";
  program.name = "Program Main";
  program.enabled = true;
  program.type = SequenceProgramType::pump;
  program.initial_state_id = "start";
  program.normal_stop_state_id = "stop";
  program.trip_state_id = "trip";
  program.lockout_state_id = "lockout";
  program.start_condition = make_bool_signal_tree("program_start_tree", "permit.start", true);
  program.reset_condition = make_bool_signal_tree("program_reset_tree", "permit.reset", true);

  auto start = state("start", SequenceStateType::action);
  auto run = state("run", SequenceStateType::run);
  auto stop = state("stop", SequenceStateType::stop);
  auto trip = state("trip", SequenceStateType::stop);
  auto lockout = state("lockout", SequenceStateType::lockout);

  start.transitions.push_back(transition("to_run", "run"));
  trip.transitions.push_back(transition("to_lockout", "lockout"));
  program.states = {start, run, stop, trip, lockout};
  return program;
}

struct LogicTestContext {
  controller::signals::SignalRegistry registry;
  controller::hal::MockRelayHal relay_hal;
  controller::hal::MockPwmHal pwm_hal;
  controller::actuators::ActuatorManager actuator_manager;
  controller::timers::TimerService timer_service;
  controller::alarms::AlarmService alarm_service;
  controller::sequence::SequenceService sequence_service;
  controller::logic::LogicService logic_service;

  explicit LogicTestContext(const std::size_t history_capacity = 8U)
      : relay_hal({
            controller::hal::RelayChannelConfig{"relay.main", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.fan", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.alt", controller::hal::RelayState::off, controller::hal::RelayState::off},
        }),
        pwm_hal({
            controller::hal::PwmOutputChannelConfig{"pwm.main", {0.0, 100.0, 0.0}, 0.0, false, false},
        }),
        actuator_manager(relay_hal, pwm_hal, &registry),
        timer_service(&registry),
        alarm_service(&registry),
        sequence_service(registry, actuator_manager, timer_service, alarm_service, history_capacity),
        logic_service(registry, actuator_manager, timer_service, alarm_service, sequence_service, history_capacity) {}

  bool initialize() {
    using controller::actuators::ActuatorRole;
    using controller::actuators::PwmActuatorTarget;
    using controller::actuators::RelayActuatorTarget;
    using controller::alarms::AlarmDescriptor;
    using controller::alarms::AlarmSeverity;
    using controller::signals::SignalAccessMode;
    using controller::signals::SignalType;
    using controller::signals::SignalValue;
    using controller::timers::TimerDescriptor;
    using controller::timers::TimerKind;

    return relay_hal.initialize().ok() &&
           pwm_hal.initialize().ok() &&
           actuator_manager
               .register_relay_target(
                   RelayActuatorTarget{"relay.main", "Relay Main", true, ActuatorRole::generic, controller::hal::RelayState::off, std::nullopt},
                   0U)
               .ok() &&
           actuator_manager
               .register_relay_target(
                   RelayActuatorTarget{"relay.fan", "Relay Fan", true, ActuatorRole::fan, controller::hal::RelayState::off, std::nullopt},
                   0U)
               .ok() &&
           actuator_manager
               .register_relay_target(
                   RelayActuatorTarget{"relay.alt", "Relay Alt", true, ActuatorRole::generic, controller::hal::RelayState::off, std::nullopt},
                   0U)
               .ok() &&
           actuator_manager
               .register_pwm_target(PwmActuatorTarget{"pwm.main", "PWM Main", true, ActuatorRole::generic, 0.0, 100.0, 0.0}, 0U)
               .ok() &&
           timer_service
               .register_timer(TimerDescriptor{
                   "timer.main",
                   "Timer Main",
                   "logic timer",
                   true,
                   TimerKind::state_min_time,
                   1000U,
                   "logic_tests",
                   true,
                   false,
                   true,
               })
               .ok() &&
           timer_service
               .register_timer(TimerDescriptor{
                   "timer.aux",
                   "Timer Aux",
                   "logic aux timer",
                   true,
                   TimerKind::state_min_time,
                   1000U,
                   "logic_tests",
                   true,
                   false,
                   true,
               })
               .ok() &&
           alarm_service
               .register_alarm(AlarmDescriptor{
                   "alarm.main",
                   "Alarm Main",
                   true,
                   AlarmSeverity::warning,
                   false,
                   "logic alarm",
                   "logic_tests",
                   true,
                   true,
                   false,
                   true,
               })
               .ok() &&
           registry.register_signal(make_signal_descriptor("cond.a", "Condition A", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("cond.b", "Condition B", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("cond.c", "Condition C", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("sensor.temp", "Sensor Temp", SignalType::float64)).ok() &&
           registry.register_signal(make_signal_descriptor("permit.start", "Permit Start", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("permit.reset", "Permit Reset", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("virtual.flag", "Virtual Flag", SignalType::boolean, SignalAccessMode::writable_virtual)).ok() &&
           registry.register_signal(make_signal_descriptor("virtual.count", "Virtual Count", SignalType::int64, SignalAccessMode::writable_virtual)).ok() &&
           registry.register_signal(make_signal_descriptor("virtual.level", "Virtual Level", SignalType::float64, SignalAccessMode::writable_virtual)).ok() &&
           registry.register_signal(make_signal_descriptor("virtual.text", "Virtual Text", SignalType::string, SignalAccessMode::writable_virtual)).ok() &&
           registry.register_signal(make_signal_descriptor("readonly.flag", "Readonly Flag", SignalType::boolean)).ok() &&
           registry.update_signal("cond.a", SignalValue{false}, 0U).ok() &&
           registry.update_signal("cond.b", SignalValue{false}, 0U).ok() &&
           registry.update_signal("cond.c", SignalValue{false}, 0U).ok() &&
           registry.update_signal("sensor.temp", SignalValue{42.5}, 0U).ok() &&
           registry.update_signal("permit.start", SignalValue{true}, 0U).ok() &&
           registry.update_signal("permit.reset", SignalValue{true}, 0U).ok() &&
           registry.update_signal("readonly.flag", SignalValue{false}, 0U).ok() &&
           sequence_service.register_program(make_program()).ok();
  }
};

}  // namespace logic_test
