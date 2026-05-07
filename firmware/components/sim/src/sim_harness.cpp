#include "sim/sim_harness.hpp"

#include <algorithm>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "alarms/alarm_descriptor.hpp"
#include "display/display_descriptor.hpp"
#include "display/display_types.hpp"
#include "mqtt/mqtt_descriptor.hpp"
#include "signals/signal_descriptor.hpp"
#include "timers/timer_descriptor.hpp"

namespace controller::sim {

namespace {

using controller::actuators::ActuatorRole;
using controller::actuators::PwmActuatorTarget;
using controller::actuators::RelayActuatorTarget;
using controller::alarms::AlarmDescriptor;
using controller::alarms::AlarmSeverity;
using controller::display::DisplayDescriptor;
using controller::display::DisplayScreen;
using controller::mqtt::MqttDescriptor;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::timers::TimerDescriptor;
using controller::timers::TimerKind;

SignalDescriptor make_signal_descriptor(
    std::string path,
    std::string name,
    const SignalType type,
    const SignalAccessMode access_mode = SignalAccessMode::read_only) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "sim harness signal",
      type,
      "",
      "sim_harness",
      access_mode,
      0U,
      true,
      true,
  };
}

TimerDescriptor make_timer_descriptor(
    std::string id,
    std::string name,
    const TimerKind kind,
    const controller::timers::TimerDurationMs duration_ms) {
  return TimerDescriptor{
      std::move(id),
      std::move(name),
      "sim harness timer",
      true,
      kind,
      duration_ms,
      "sim_harness",
      true,
      false,
      true,
  };
}

AlarmDescriptor make_alarm_descriptor(
    std::string id,
    std::string name,
    const AlarmSeverity severity,
    const bool latching) {
  return AlarmDescriptor{
      std::move(id),
      std::move(name),
      true,
      severity,
      latching,
      "sim harness alarm",
      "sim_harness",
      true,
      true,
      false,
      true,
  };
}

}  // namespace

const char* to_string(const SimErrorCode code) {
  switch (code) {
    case SimErrorCode::ok:
      return "SIM_OK";
    case SimErrorCode::sim_invalid_configuration:
      return "SIM_INVALID_CONFIGURATION";
    case SimErrorCode::sim_scenario_failed:
      return "SIM_SCENARIO_FAILED";
    case SimErrorCode::sim_event_error:
      return "SIM_EVENT_ERROR";
    case SimErrorCode::sim_assertion_failed:
      return "SIM_ASSERTION_FAILED";
    case SimErrorCode::sim_plant_error:
      return "SIM_PLANT_ERROR";
    case SimErrorCode::sim_service_error:
      return "SIM_SERVICE_ERROR";
    case SimErrorCode::sim_not_found:
      return "SIM_NOT_FOUND";
    case SimErrorCode::sim_duplicate_id:
      return "SIM_DUPLICATE_ID";
    case SimErrorCode::sim_invalid_argument:
      return "SIM_INVALID_ARGUMENT";
  }
  return "SIM_UNKNOWN";
}

SimHarness::SimHarness(SimHarnessOptions options)
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
      pulse_input_hal({
          controller::hal::PulseInputChannelConfig{"pulse.flow1", 0U, 0.0, true},
          controller::hal::PulseInputChannelConfig{"pulse.flow2", 0U, 0.0, true},
          controller::hal::PulseInputChannelConfig{"pulse.batch", 0U, 0.0, true},
      }),
      stepper_hal({
          controller::hal::StepperChannelConfig{"stepper.main", controller::hal::StepperDirection::forward, false, false, controller::hal::StepperStopMode::hold, 0.0},
      }),
      display_hal(options.display_config),
      storage_service(storage_backend),
      actuator_manager(relay_hal, pwm_hal, &registry),
      timer_service(&registry),
      alarm_service(&registry, options.history_capacity),
      sequence_service(registry, actuator_manager, timer_service, alarm_service, options.history_capacity),
      logic_service(registry, actuator_manager, timer_service, alarm_service, sequence_service, options.history_capacity),
      flow_service(pulse_input_hal, storage_service, registry, options.history_capacity),
      pid_service(registry, actuator_manager, options.history_capacity),
      motor_service(registry, actuator_manager, options.history_capacity),
      stepper_service(stepper_hal, registry, options.history_capacity),
      sequence_api(sequence_service, alarm_service, actuator_manager),
      flow_api(flow_service),
      mqtt_service(options.history_capacity),
      display_service(display_hal, registry, options.history_capacity),
      template_engine(registry, actuator_manager, timer_service, alarm_service, logic_service, sequence_service, pid_service),
      options_(std::move(options)) {
  mqtt_service.bind_backend(mqtt_backend);
  mqtt_service.bind_sequence_api(sequence_api);
  mqtt_service.bind_flow_api(flow_api);
  mqtt_service.bind_pid_service(pid_service);
  mqtt_service.bind_alarm_service(alarm_service);
  mqtt_service.bind_actuator_manager(actuator_manager);

  display_service.bind_sequence_api(sequence_api);
  display_service.bind_flow_api(flow_api);
  display_service.bind_pid_service(pid_service);
  display_service.bind_alarm_service(alarm_service);
  display_service.bind_mqtt_service(mqtt_service);
}

SimStatus SimHarness::map_status(const bool ok, const SimErrorCode code, std::string message) {
  return ok ? SimStatus::success() : SimStatus::error(code, std::move(message));
}

SimStatus SimHarness::ensure_signal(
    const SignalDescriptor& descriptor,
    const std::optional<controller::signals::SignalValue> initial_value) {
  if (registry.has_signal(descriptor.path)) {
    return SimStatus::success();
  }

  const auto result = registry.register_signal(descriptor, initial_value, 0U, true, false);
  if (!result.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_invalid_configuration,
        "Failed to register signal '" + descriptor.path + "': " + result.status.message);
  }
  return SimStatus::success();
}

SimStatus SimHarness::ensure_bool_signal(const std::string& path, const std::string& name, const bool initial_value) {
  auto status = ensure_signal(make_signal_descriptor(path, name, SignalType::boolean), controller::signals::SignalValue{initial_value});
  if (!status.ok()) {
    return status;
  }
  const auto update = registry.update_signal(path, controller::signals::SignalValue{initial_value}, 0U);
  return update.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to seed boolean signal '" + path + "': " + update.status.message);
}

SimStatus SimHarness::ensure_double_signal(const std::string& path, const std::string& name, const double initial_value) {
  auto status = ensure_signal(make_signal_descriptor(path, name, SignalType::float64), controller::signals::SignalValue{initial_value});
  if (!status.ok()) {
    return status;
  }
  const auto update = registry.update_signal(path, controller::signals::SignalValue{initial_value}, 0U);
  return update.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to seed numeric signal '" + path + "': " + update.status.message);
}

SimStatus SimHarness::register_standard_signals() {
  std::vector<SimStatus> results;
  results.push_back(ensure_bool_signal("permit.start", "Permit Start", true));
  results.push_back(ensure_bool_signal("permit.reset", "Permit Reset", false));
  results.push_back(ensure_bool_signal("transition.ready", "Transition Ready", false));
  results.push_back(ensure_bool_signal("guard.ok", "Guard OK", true));
  results.push_back(ensure_bool_signal("signal.pressure_low", "Pressure Low", false));
  results.push_back(ensure_bool_signal("signal.pressure_high", "Pressure High", false));
  results.push_back(ensure_bool_signal("signal.flame", "Flame", false));
  results.push_back(ensure_bool_signal("signal.air_ok", "Air OK", false));
  results.push_back(ensure_bool_signal("signal.sludge_ready", "Sludge Ready", false));
  results.push_back(ensure_bool_signal("signal.fault", "Fault", false));
  results.push_back(ensure_bool_signal("signal.batch_done", "Batch Done", false));
  results.push_back(ensure_signal(
      make_signal_descriptor("virtual.sequence_flag", "Virtual Flag", SignalType::boolean, SignalAccessMode::writable_virtual),
      controller::signals::SignalValue{false}));
  results.push_back(ensure_double_signal("signal.pressure", "Pressure", 0.0));
  results.push_back(ensure_double_signal("signal.flow_rate", "Flow Rate", 0.0));
  results.push_back(ensure_double_signal("signal.temperature", "Temperature", 20.0));
  results.push_back(ensure_double_signal("signal.chamber_temp", "Chamber Temp", 25.0));
  results.push_back(ensure_double_signal("pid.pv", "PID PV", 0.0));

  for (const auto& result : results) {
    if (!result.ok()) {
      return result;
    }
  }
  return SimStatus::success();
}

SimStatus SimHarness::register_standard_actuators() {
  const auto register_relay = [&](const RelayActuatorTarget& target) -> SimStatus {
    if (actuator_manager.has_target(target.id)) {
      return SimStatus::success();
    }
    const auto result = actuator_manager.register_relay_target(target, 0U);
    return result.ok() ? SimStatus::success()
                       : SimStatus::error(
                             SimErrorCode::sim_invalid_configuration,
                             "Failed to register relay target '" + target.id + "': " + result.status.message);
  };
  const auto register_pwm = [&](const PwmActuatorTarget& target) -> SimStatus {
    if (actuator_manager.has_target(target.id)) {
      return SimStatus::success();
    }
    const auto result = actuator_manager.register_pwm_target(target, 0U);
    return result.ok() ? SimStatus::success()
                       : SimStatus::error(
                             SimErrorCode::sim_invalid_configuration,
                             "Failed to register PWM target '" + target.id + "': " + result.status.message);
  };

  std::vector<SimStatus> results;
  results.push_back(register_relay(RelayActuatorTarget{"relay.main", "Main Pump", true, ActuatorRole::pump, controller::hal::RelayState::off, std::nullopt}));
  results.push_back(register_relay(RelayActuatorTarget{"relay.trip", "Trip Output", true, ActuatorRole::alarm, controller::hal::RelayState::off, std::nullopt}));
  results.push_back(register_relay(RelayActuatorTarget{"relay.fan", "Fan Output", true, ActuatorRole::fan, controller::hal::RelayState::off, std::nullopt}));
  results.push_back(register_relay(RelayActuatorTarget{"relay.ignition", "Ignition Output", true, ActuatorRole::ignition, controller::hal::RelayState::off, std::nullopt}));
  results.push_back(register_relay(RelayActuatorTarget{"relay.fuel", "Fuel Output", true, ActuatorRole::fuel, controller::hal::RelayState::off, std::nullopt}));
  results.push_back(register_relay(RelayActuatorTarget{"relay.diesel", "Diesel Output", true, ActuatorRole::fuel, controller::hal::RelayState::off, std::nullopt}));
  results.push_back(register_relay(RelayActuatorTarget{"relay.valve", "Valve Output", true, ActuatorRole::valve, controller::hal::RelayState::off, std::nullopt}));
  results.push_back(register_pwm(PwmActuatorTarget{"pwm.main", "PWM Main", true, ActuatorRole::pump, 0.0, 100.0, 0.0}));
  results.push_back(register_pwm(PwmActuatorTarget{"pwm.fan", "PWM Fan", true, ActuatorRole::fan, 0.0, 100.0, 0.0}));
  results.push_back(register_pwm(PwmActuatorTarget{"pwm.valve", "PWM Valve", true, ActuatorRole::valve, 0.0, 100.0, 0.0}));

  for (const auto& result : results) {
    if (!result.ok()) {
      return result;
    }
  }
  return SimStatus::success();
}

SimStatus SimHarness::register_standard_timers() {
  const std::vector<TimerDescriptor> timers = {
      make_timer_descriptor("timer.sequence", "Sequence Timer", TimerKind::state_min_time, 1000U),
      make_timer_descriptor("timer.sequence_exit", "Sequence Exit Timer", TimerKind::state_min_time, 1000U),
      make_timer_descriptor("timer.startup_bypass", "Startup Bypass", TimerKind::state_min_time, 500U),
      make_timer_descriptor("timer.cooldown", "Cooldown Timer", TimerKind::state_min_time, 500U),
  };

  for (const auto& timer : timers) {
    if (timer_service.has_timer(timer.id)) {
      continue;
    }
    const auto result = timer_service.register_timer(timer);
    if (!result.ok()) {
      return SimStatus::error(
          SimErrorCode::sim_invalid_configuration,
          "Failed to register timer '" + timer.id + "': " + result.status.message);
    }
  }
  return SimStatus::success();
}

SimStatus SimHarness::register_standard_alarms() {
  const std::vector<AlarmDescriptor> alarms = {
      make_alarm_descriptor("alarm.sequence", "Sequence Alarm", AlarmSeverity::trip, false),
      make_alarm_descriptor("alarm.trip", "Trip Alarm", AlarmSeverity::trip, false),
  };

  for (const auto& alarm : alarms) {
    if (alarm_service.has_alarm(alarm.id)) {
      continue;
    }
    const auto result = alarm_service.register_alarm(alarm);
    if (!result.ok()) {
      return SimStatus::error(
          SimErrorCode::sim_invalid_configuration,
          "Failed to register alarm '" + alarm.id + "': " + result.status.message);
    }
  }
  return SimStatus::success();
}

SimStatus SimHarness::register_default_mqtt_bridge() {
  if (mqtt_service.has_bridge()) {
    return SimStatus::success();
  }

  MqttDescriptor descriptor;
  descriptor.id = "bridge.main";
  descriptor.name = "Main MQTT Bridge";
  descriptor.enabled = true;
  descriptor.topic_prefix = "plant/controller";
  descriptor.status_publish_interval_ms = 1000U;
  descriptor.retain_status = true;
  descriptor.publish_sequence_status = true;
  descriptor.publish_flow_status = true;
  descriptor.publish_pid_status = true;
  descriptor.publish_alarm_status = true;
  descriptor.publish_actuator_status = true;

  const auto result = mqtt_service.register_bridge(descriptor);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_invalid_configuration,
                           "Failed to register default MQTT bridge: " + result.status.message);
}

SimStatus SimHarness::register_default_display() {
  if (display_service.has_display("display.main")) {
    return SimStatus::success();
  }

  DisplayDescriptor descriptor;
  descriptor.id = "display.main";
  descriptor.name = "Main Display";
  descriptor.enabled = true;
  descriptor.line_count = options_.display_config.line_count;
  descriptor.chars_per_line = options_.display_config.line_width.value_or(16U);
  descriptor.auto_rotate = true;
  descriptor.rotate_interval_ms = 1000U;
  descriptor.alarm_override_enabled = true;
  descriptor.enabled_screens = {
      DisplayScreen::main,
      DisplayScreen::program,
      DisplayScreen::flow,
      DisplayScreen::pid,
      DisplayScreen::alarms,
      DisplayScreen::mqtt,
  };

  const auto result = display_service.register_display(descriptor);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_invalid_configuration,
                           "Failed to register default display: " + result.status.message);
}

SimStatus SimHarness::initialize() {
  if (initialized_) {
    return SimStatus::success();
  }

  if (!relay_hal.initialize().ok()) {
    return SimStatus::error(SimErrorCode::sim_invalid_configuration, "MockRelayHal failed to initialize.");
  }
  if (!pwm_hal.initialize().ok()) {
    return SimStatus::error(SimErrorCode::sim_invalid_configuration, "MockPwmHal failed to initialize.");
  }
  if (!pulse_input_hal.initialize().ok()) {
    return SimStatus::error(SimErrorCode::sim_invalid_configuration, "MockPulseInputHal failed to initialize.");
  }
  if (!stepper_hal.initialize().ok()) {
    return SimStatus::error(SimErrorCode::sim_invalid_configuration, "MockStepperHal failed to initialize.");
  }

  auto status = register_standard_signals();
  if (!status.ok()) {
    return status;
  }
  status = register_standard_actuators();
  if (!status.ok()) {
    return status;
  }
  status = register_standard_timers();
  if (!status.ok()) {
    return status;
  }
  status = register_standard_alarms();
  if (!status.ok()) {
    return status;
  }
  status = register_default_mqtt_bridge();
  if (!status.ok()) {
    return status;
  }
  status = register_default_display();
  if (!status.ok()) {
    return status;
  }

  initialized_ = true;
  return SimStatus::success();
}

SimStatus SimHarness::tick_pre_plants(const SimTimestampMs now_ms, const SimDurationMs) {
  if (!initialized_) {
    return SimStatus::error(SimErrorCode::sim_service_error, "SimHarness must be initialized before tick_pre_plants().");
  }

  const auto timer_tick = timer_service.tick(now_ms);
  if (!timer_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "TimerService tick failed: " + timer_tick.status.message);
  }

  const auto stepper_tick = stepper_service.tick(now_ms);
  if (!stepper_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "StepperService tick failed: " + stepper_tick.status.message);
  }

  const auto motor_tick = motor_service.tick(now_ms);
  if (!motor_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "MotorService tick failed: " + motor_tick.status.message);
  }

  const auto sequence_tick = sequence_service.tick(now_ms);
  if (!sequence_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "SequenceService tick failed: " + sequence_tick.status.message);
  }

  const auto logic_tick = logic_service.tick(now_ms);
  if (!logic_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "LogicService tick failed: " + logic_tick.status.message);
  }

  const auto pid_tick = pid_service.tick(now_ms);
  if (!pid_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "PidService tick failed: " + pid_tick.status.message);
  }

  return SimStatus::success();
}

SimStatus SimHarness::tick_post_plants(const SimTimestampMs now_ms, const SimDurationMs) {
  if (!initialized_) {
    return SimStatus::error(SimErrorCode::sim_service_error, "SimHarness must be initialized before tick_post_plants().");
  }

  const auto flow_tick = flow_service.tick(now_ms);
  if (!flow_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "FlowService tick failed: " + flow_tick.status.message);
  }

  const auto mqtt_tick = mqtt_service.tick(now_ms);
  if (!mqtt_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "MqttService tick failed: " + mqtt_tick.status.message);
  }

  const auto display_tick = display_service.tick(now_ms);
  if (!display_tick.ok()) {
    return SimStatus::error(SimErrorCode::sim_service_error, "DisplayService tick failed: " + display_tick.status.message);
  }

  return SimStatus::success();
}

SimStatus SimHarness::tick(const SimTimestampMs now_ms, const SimDurationMs dt_ms) {
  auto status = tick_pre_plants(now_ms, dt_ms);
  if (!status.ok()) {
    return status;
  }
  return tick_post_plants(now_ms, dt_ms);
}

SimStatus SimHarness::apply_template(
    const controller::templates::TemplateDraft& draft,
    const SimTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  const auto result =
      template_engine.apply_template(draft, controller::templates::TemplateCommandContext{now_ms, source, reason, std::string{"sim"}});
  if (!result.accepted) {
    return SimStatus::error(
        SimErrorCode::sim_scenario_failed,
        "Template apply failed for instance '" + draft.instance_id + "': " + result.status.message);
  }
  return SimStatus::success();
}

SimStatus SimHarness::set_rule_enabled(const std::string& id, const bool enabled, const SimTimestampMs now_ms) {
  const auto result = logic_service.set_rule_enabled(id, enabled, now_ms);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to change rule '" + id + "' enable state: " + result.status.message);
}

SimStatus SimHarness::set_program_enabled(const std::string& id, const bool enabled, const SimTimestampMs now_ms) {
  const auto result = sequence_service.set_program_enabled(id, enabled, now_ms);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to change program '" + id + "' enable state: " + result.status.message);
}

SimStatus SimHarness::start_program(
    const std::string& id,
    const SimTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  const auto result = sequence_service.start_program(id, now_ms, source, reason);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to start program '" + id + "': " + result.status.message);
}

SimStatus SimHarness::request_normal_stop(
    const SimTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  const auto result = sequence_service.request_normal_stop(now_ms, source, reason);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to request normal stop: " + result.status.message);
}

SimStatus SimHarness::request_trip_stop(
    const SimTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  const auto result = sequence_service.request_trip_stop(now_ms, source, reason);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to request trip stop: " + result.status.message);
}

SimStatus SimHarness::reset_active_program(
    const SimTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  const auto result = sequence_service.reset_active_program(now_ms, source, reason);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to reset active program: " + result.status.message);
}

SimStatus SimHarness::set_pid_enabled(const std::string& id, const bool enabled, const SimTimestampMs now_ms) {
  const auto result = pid_service.set_enabled(id, enabled, now_ms);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to change PID '" + id + "' enable state: " + result.status.message);
}

SimStatus SimHarness::set_pid_mode(
    const std::string& id,
    const controller::pid::PidServiceMode mode,
    const SimTimestampMs now_ms) {
  const auto result = pid_service.set_requested_mode(id, mode, now_ms);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to change PID '" + id + "' mode: " + result.status.message);
}

SimStatus SimHarness::set_pid_setpoint(const std::string& id, const double value, const SimTimestampMs now_ms) {
  const auto result = pid_service.set_constant_setpoint(id, value, now_ms);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to set PID '" + id + "' setpoint: " + result.status.message);
}

SimStatus SimHarness::set_pid_manual_output(const std::string& id, const double value, const SimTimestampMs now_ms) {
  const auto result = pid_service.set_manual_output(id, value, now_ms);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to set PID '" + id + "' manual output: " + result.status.message);
}

SimStatus SimHarness::reset_pid_integral(const std::string& id, const SimTimestampMs now_ms) {
  const auto result = pid_service.reset_integral(id, now_ms);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to reset PID '" + id + "' integral term: " + result.status.message);
}

SimStatus SimHarness::start_batch(
    const std::string& id,
    const SimTimestampMs now_ms,
    const std::optional<double> target_override_units,
    const std::string& source,
    const std::string& reason) {
  const auto result = flow_service.start_batch(id, now_ms, target_override_units, source, reason);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to start batch for flow '" + id + "': " + result.status.message);
}

SimStatus SimHarness::stop_batch(
    const std::string& id,
    const SimTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  const auto result = flow_service.stop_batch(id, now_ms, source, reason);
  return result.ok() ? SimStatus::success()
                     : SimStatus::error(
                           SimErrorCode::sim_service_error,
                           "Failed to stop batch for flow '" + id + "': " + result.status.message);
}

double SimHarness::pwm_duty_fraction(const std::string& pwm_target_id) const {
  const auto enabled = pwm_hal.get_enabled(pwm_target_id);
  const auto duty = pwm_hal.get_duty_percent(pwm_target_id);
  if (!enabled.ok() || !enabled.value.has_value() || !*enabled.value || !duty.ok() || !duty.value.has_value()) {
    return 0.0;
  }
  return *duty.value / 100.0;
}

bool SimHarness::relay_is_on(const std::string& relay_target_id) const {
  const auto state = relay_hal.get_state(relay_target_id);
  return state.ok() && state.value.has_value() && *state.value == controller::hal::RelayState::on;
}

double SimHarness::actuator_drive_fraction(
    const std::optional<std::string>& relay_target_id,
    const std::optional<std::string>& pwm_target_id) const {
  double fraction = 0.0;
  if (relay_target_id.has_value() && relay_is_on(*relay_target_id)) {
    fraction = 1.0;
  }
  if (pwm_target_id.has_value()) {
    fraction = std::max(fraction, pwm_duty_fraction(*pwm_target_id));
  }
  return fraction;
}

}  // namespace controller::sim
