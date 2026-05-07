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
#include "sequence/sequence_action.hpp"
#include "sequence/sequence_program.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_descriptor.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_descriptor.hpp"
#include "timers/timer_service.hpp"

namespace sequence_test {

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
      "sequence test signal",
      type,
      "",
      "sequence_tests",
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

inline controller::sequence::SequenceAction relay_action(
    const std::string& id,
    const std::string& target_id,
    const controller::hal::RelayState state,
    const std::string& reason = "") {
  using controller::sequence::SequenceAction;
  using controller::sequence::SequenceActionKind;
  using controller::sequence::SequenceRelayRequestAction;

  return SequenceAction{id, id, SequenceActionKind::relay_request, SequenceRelayRequestAction{target_id, state, reason}};
}

inline controller::sequence::SequenceAction pwm_action(
    const std::string& id,
    const std::string& target_id,
    const double duty_percent,
    const bool enabled,
    const std::string& reason = "") {
  using controller::sequence::SequenceAction;
  using controller::sequence::SequenceActionKind;
  using controller::sequence::SequencePwmRequestAction;

  return SequenceAction{
      id,
      id,
      SequenceActionKind::pwm_request,
      SequencePwmRequestAction{target_id, duty_percent, enabled, reason}};
}

inline controller::sequence::SequenceAction timer_start_action(const std::string& id, const std::string& timer_id) {
  using controller::sequence::SequenceAction;
  using controller::sequence::SequenceActionKind;
  using controller::sequence::SequenceTimerStartAction;

  return SequenceAction{id, id, SequenceActionKind::timer_start, SequenceTimerStartAction{timer_id}};
}

inline controller::sequence::SequenceAction timer_stop_action(const std::string& id, const std::string& timer_id) {
  using controller::sequence::SequenceAction;
  using controller::sequence::SequenceActionKind;
  using controller::sequence::SequenceTimerStopAction;

  return SequenceAction{id, id, SequenceActionKind::timer_stop, SequenceTimerStopAction{timer_id}};
}

inline controller::sequence::SequenceAction alarm_action(
    const std::string& id,
    const std::string& alarm_id,
    const bool condition_active) {
  using controller::sequence::SequenceAction;
  using controller::sequence::SequenceActionKind;
  using controller::sequence::SequenceAlarmSetConditionAction;

  return SequenceAction{
      id,
      id,
      SequenceActionKind::alarm_set_condition,
      SequenceAlarmSetConditionAction{alarm_id, condition_active}};
}

inline controller::sequence::SequenceAction virtual_signal_action(
    const std::string& id,
    const std::string& signal_path,
    const controller::signals::SignalValue& value) {
  using controller::sequence::SequenceAction;
  using controller::sequence::SequenceActionKind;
  using controller::sequence::SequenceWriteVirtualSignalAction;

  return SequenceAction{
      id,
      id,
      SequenceActionKind::write_virtual_signal,
      SequenceWriteVirtualSignalAction{signal_path, value}};
}

inline controller::sequence::SequenceTransition transition(
    const std::string& id,
    const std::string& target_state_id,
    std::optional<controller::conditions::ConditionTree> condition = std::nullopt,
    const bool require_min_time_done = false) {
  return controller::sequence::SequenceTransition{id, id, target_state_id, std::move(condition), require_min_time_done, true};
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

struct SequenceTestContext {
  controller::signals::SignalRegistry registry;
  controller::hal::MockRelayHal relay_hal;
  controller::hal::MockPwmHal pwm_hal;
  controller::actuators::ActuatorManager actuator_manager;
  controller::timers::TimerService timer_service;
  controller::alarms::AlarmService alarm_service;
  controller::sequence::SequenceService sequence_service;

  explicit SequenceTestContext(const std::size_t history_capacity = 8U)
      : relay_hal({
            controller::hal::RelayChannelConfig{"relay.main", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.trip", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.fan", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.ignition", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.fuel", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.diesel", controller::hal::RelayState::off, controller::hal::RelayState::off},
            controller::hal::RelayChannelConfig{"relay.valve", controller::hal::RelayState::off, controller::hal::RelayState::off},
        }),
        pwm_hal({
            controller::hal::PwmOutputChannelConfig{"pwm.main", {0.0, 100.0, 0.0}, 0.0, false, false},
            controller::hal::PwmOutputChannelConfig{"pwm.fan", {0.0, 100.0, 0.0}, 0.0, false, false},
            controller::hal::PwmOutputChannelConfig{"pwm.valve", {0.0, 100.0, 0.0}, 0.0, false, false},
        }),
        actuator_manager(relay_hal, pwm_hal, &registry),
        timer_service(&registry),
        alarm_service(&registry),
        sequence_service(registry, actuator_manager, timer_service, alarm_service, history_capacity) {}

  bool initialize() {
    using controller::actuators::ActuatorRole;
    using controller::actuators::PwmActuatorTarget;
    using controller::actuators::RelayActuatorTarget;
    using controller::alarms::AlarmDescriptor;
    using controller::alarms::AlarmSeverity;
    using controller::signals::SignalAccessMode;
    using controller::signals::SignalType;
    using controller::timers::TimerDescriptor;
    using controller::timers::TimerKind;

    return relay_hal.initialize().ok() &&
           pwm_hal.initialize().ok() &&
           actuator_manager.register_relay_target(
               RelayActuatorTarget{"relay.main", "Relay Main", true, ActuatorRole::generic, controller::hal::RelayState::off, std::nullopt},
               0U)
               .ok() &&
           actuator_manager.register_relay_target(
               RelayActuatorTarget{"relay.trip", "Relay Trip", true, ActuatorRole::fuel, controller::hal::RelayState::off, std::nullopt},
               0U)
               .ok() &&
           actuator_manager.register_relay_target(
               RelayActuatorTarget{"relay.fan", "Relay Fan", true, ActuatorRole::fan, controller::hal::RelayState::off, std::nullopt},
               0U)
               .ok() &&
           actuator_manager.register_relay_target(
               RelayActuatorTarget{"relay.ignition", "Relay Ignition", true, ActuatorRole::ignition, controller::hal::RelayState::off, std::nullopt},
               0U)
               .ok() &&
           actuator_manager.register_relay_target(
               RelayActuatorTarget{"relay.fuel", "Relay Fuel", true, ActuatorRole::fuel, controller::hal::RelayState::off, std::nullopt},
               0U)
               .ok() &&
           actuator_manager.register_relay_target(
               RelayActuatorTarget{"relay.diesel", "Relay Diesel", true, ActuatorRole::fuel, controller::hal::RelayState::off, std::nullopt},
               0U)
               .ok() &&
           actuator_manager.register_relay_target(
               RelayActuatorTarget{"relay.valve", "Relay Valve", true, ActuatorRole::valve, controller::hal::RelayState::off, std::nullopt},
               0U)
               .ok() &&
           actuator_manager.register_pwm_target(
               PwmActuatorTarget{"pwm.main", "PWM Main", true, ActuatorRole::generic, 0.0, 100.0, 0.0},
               0U)
               .ok() &&
           actuator_manager.register_pwm_target(
               PwmActuatorTarget{"pwm.fan", "PWM Fan", true, ActuatorRole::fan, 0.0, 100.0, 0.0},
               0U)
               .ok() &&
           actuator_manager.register_pwm_target(
               PwmActuatorTarget{"pwm.valve", "PWM Valve", true, ActuatorRole::valve, 0.0, 100.0, 0.0},
               0U)
               .ok() &&
           timer_service
               .register_timer(TimerDescriptor{
                   "timer.sequence",
                   "Sequence Timer",
                   "sequence timer",
                   true,
                   TimerKind::state_min_time,
                   1000U,
                   "sequence_tests",
                   true,
                   false,
                   true,
               })
               .ok() &&
           timer_service
               .register_timer(TimerDescriptor{
                   "timer.sequence_exit",
                   "Sequence Exit Timer",
                   "sequence exit timer",
                   true,
                   TimerKind::state_min_time,
                   1000U,
                   "sequence_tests",
                   true,
                   false,
                   true,
               })
               .ok() &&
           timer_service
               .register_timer(TimerDescriptor{
                   "timer.startup_bypass",
                   "Startup Bypass",
                   "builder startup bypass timer",
                   true,
                   TimerKind::state_min_time,
                   500U,
                   "sequence_tests",
                   true,
                   false,
                   true,
               })
               .ok() &&
           timer_service
               .register_timer(TimerDescriptor{
                   "timer.cooldown",
                   "Cooldown Timer",
                   "builder cooldown timer",
                   true,
                   TimerKind::state_min_time,
                   500U,
                   "sequence_tests",
                   true,
                   false,
                   true,
               })
               .ok() &&
           alarm_service
               .register_alarm(AlarmDescriptor{
                   "alarm.sequence",
                   "Sequence Alarm",
                   true,
                   AlarmSeverity::trip,
                   false,
                   "sequence alarm",
                   "sequence_tests",
                   true,
                   true,
                   false,
                   true,
               })
               .ok() &&
           alarm_service
               .register_alarm(AlarmDescriptor{
                   "alarm.trip",
                   "Trip Alarm",
                   true,
                   AlarmSeverity::trip,
                   false,
                   "builder trip alarm",
                   "sequence_tests",
                   true,
                   true,
                   false,
                   true,
               })
               .ok() &&
           registry.register_signal(make_signal_descriptor("permit.start", "Permit Start", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("permit.reset", "Permit Reset", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("transition.ready", "Transition Ready", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("guard.ok", "Guard OK", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.pressure_low", "Pressure Low", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.pressure_high", "Pressure High", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.flame", "Flame", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.air_ok", "Air OK", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.sludge_ready", "Sludge Ready", SignalType::boolean)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.flow_rate", "Flow Rate", SignalType::float64)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.temperature", "Temperature", SignalType::float64)).ok() &&
           registry.register_signal(make_signal_descriptor("signal.chamber_temp", "Chamber Temp", SignalType::float64)).ok() &&
           registry.register_signal(make_signal_descriptor("virtual.sequence_flag", "Virtual Flag", SignalType::boolean, SignalAccessMode::writable_virtual)).ok() &&
           registry.update_signal("permit.start", controller::signals::SignalValue{true}, 0U).ok() &&
           registry.update_signal("permit.reset", controller::signals::SignalValue{false}, 0U).ok() &&
           registry.update_signal("transition.ready", controller::signals::SignalValue{false}, 0U).ok() &&
           registry.update_signal("guard.ok", controller::signals::SignalValue{true}, 0U).ok() &&
           registry.update_signal("signal.pressure_low", controller::signals::SignalValue{false}, 0U).ok() &&
           registry.update_signal("signal.pressure_high", controller::signals::SignalValue{false}, 0U).ok() &&
           registry.update_signal("signal.flame", controller::signals::SignalValue{false}, 0U).ok() &&
           registry.update_signal("signal.air_ok", controller::signals::SignalValue{true}, 0U).ok() &&
           registry.update_signal("signal.sludge_ready", controller::signals::SignalValue{true}, 0U).ok() &&
           registry.update_signal("signal.flow_rate", controller::signals::SignalValue{0.0}, 0U).ok() &&
           registry.update_signal("signal.temperature", controller::signals::SignalValue{20.0}, 0U).ok() &&
           registry.update_signal("signal.chamber_temp", controller::signals::SignalValue{25.0}, 0U).ok();
  }
};

inline controller::sequence::SequenceProgram make_basic_program() {
  using controller::sequence::SequenceProgram;
  using controller::sequence::SequenceProgramType;
  using controller::sequence::SequenceStateType;

  SequenceProgram program;
  program.id = "pump1";
  program.name = "Pump 1";
  program.enabled = true;
  program.type = SequenceProgramType::pump;
  program.initial_state_id = "start";
  program.normal_stop_state_id = "stop";
  program.trip_state_id = "trip";
  program.lockout_state_id = "lockout";
  program.start_condition = make_bool_signal_tree("start_tree", "permit.start", true);
  program.reset_condition = make_bool_signal_tree("reset_tree", "permit.reset", true);

  auto start = state("start", SequenceStateType::action);
  auto run = state("run", SequenceStateType::run);
  auto stop = state("stop", SequenceStateType::stop);
  auto trip = state("trip", SequenceStateType::stop);
  auto lockout = state("lockout", SequenceStateType::lockout);

  start.transitions.push_back(transition("to_run", "run"));
  run.active_actions.push_back(relay_action("run_relay", "relay.main", controller::hal::RelayState::on, "run relay"));
  run.transitions.push_back(transition("to_stop", "stop", make_bool_signal_tree("ready_tree", "transition.ready", true)));
  trip.transitions.push_back(transition("to_lockout", "lockout"));

  program.states = {start, run, stop, trip, lockout};
  return program;
}

}  // namespace sequence_test
