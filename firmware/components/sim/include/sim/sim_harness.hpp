#pragma once

#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "actuators/motor_service.hpp"
#include "actuators/stepper_service.hpp"
#include "alarms/alarm_service.hpp"
#include "api/flow_api_service.hpp"
#include "api/sequence_api_service.hpp"
#include "display/display_service.hpp"
#include "flow/flow_service.hpp"
#include "hal/display_hal.hpp"
#include "hal/pulse_input_hal.hpp"
#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "hal/stepper_hal.hpp"
#include "logic/logic_service.hpp"
#include "mqtt/mqtt_service.hpp"
#include "pid/pid_service.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_registry.hpp"
#include "sim/sim_result.hpp"
#include "storage/storage_backend.hpp"
#include "storage/storage_service.hpp"
#include "templates/template_engine.hpp"
#include "timers/timer_service.hpp"

namespace controller::sim {

struct SimHarnessOptions {
  std::size_t history_capacity{32U};
  controller::hal::DisplayConfig display_config{6U, 16U, false};
};

class SimHarness {
 public:
  explicit SimHarness(SimHarnessOptions options = {});

  SimStatus initialize();

  SimStatus tick_pre_plants(SimTimestampMs now_ms, SimDurationMs dt_ms);
  SimStatus tick_post_plants(SimTimestampMs now_ms, SimDurationMs dt_ms);
  SimStatus tick(SimTimestampMs now_ms, SimDurationMs dt_ms);

  SimStatus apply_template(
      const controller::templates::TemplateDraft& draft,
      SimTimestampMs now_ms,
      const std::string& source = "sim",
      const std::string& reason = "apply");
  SimStatus set_rule_enabled(const std::string& id, bool enabled, SimTimestampMs now_ms);
  SimStatus set_program_enabled(const std::string& id, bool enabled, SimTimestampMs now_ms);
  SimStatus start_program(
      const std::string& id,
      SimTimestampMs now_ms,
      const std::string& source = "sim",
      const std::string& reason = "start_program");
  SimStatus request_normal_stop(
      SimTimestampMs now_ms,
      const std::string& source = "sim",
      const std::string& reason = "normal_stop");
  SimStatus request_trip_stop(
      SimTimestampMs now_ms,
      const std::string& source = "sim",
      const std::string& reason = "trip_stop");
  SimStatus reset_active_program(
      SimTimestampMs now_ms,
      const std::string& source = "sim",
      const std::string& reason = "reset_program");
  SimStatus set_pid_enabled(const std::string& id, bool enabled, SimTimestampMs now_ms);
  SimStatus set_pid_mode(const std::string& id, controller::pid::PidServiceMode mode, SimTimestampMs now_ms);
  SimStatus set_pid_setpoint(const std::string& id, double value, SimTimestampMs now_ms);
  SimStatus set_pid_manual_output(const std::string& id, double value, SimTimestampMs now_ms);
  SimStatus reset_pid_integral(const std::string& id, SimTimestampMs now_ms);
  SimStatus start_batch(
      const std::string& id,
      SimTimestampMs now_ms,
      std::optional<double> target_override_units = std::nullopt,
      const std::string& source = "sim",
      const std::string& reason = "start_batch");
  SimStatus stop_batch(
      const std::string& id,
      SimTimestampMs now_ms,
      const std::string& source = "sim",
      const std::string& reason = "stop_batch");

  double actuator_drive_fraction(const std::optional<std::string>& relay_target_id, const std::optional<std::string>& pwm_target_id) const;
  double pwm_duty_fraction(const std::string& pwm_target_id) const;
  bool relay_is_on(const std::string& relay_target_id) const;

  signals::SignalRegistry registry;
  controller::hal::MockRelayHal relay_hal;
  controller::hal::MockPwmHal pwm_hal;
  controller::hal::MockPulseInputHal pulse_input_hal;
  controller::hal::MockStepperHal stepper_hal;
  controller::hal::MockDisplayHal display_hal;
  controller::storage::InMemoryStorageBackend storage_backend;
  controller::storage::StorageService storage_service;
  controller::actuators::ActuatorManager actuator_manager;
  controller::timers::TimerService timer_service;
  controller::alarms::AlarmService alarm_service;
  controller::sequence::SequenceService sequence_service;
  controller::logic::LogicService logic_service;
  controller::flow::FlowService flow_service;
  controller::pid::PidService pid_service;
  controller::actuators::MotorService motor_service;
  controller::actuators::StepperService stepper_service;
  controller::api::SequenceApiService sequence_api;
  controller::api::FlowApiService flow_api;
  controller::mqtt::MockMqttClientBackend mqtt_backend;
  controller::mqtt::MqttService mqtt_service;
  controller::display::DisplayService display_service;
  controller::templates::TemplateEngine template_engine;

 private:
  SimStatus register_standard_signals();
  SimStatus register_standard_actuators();
  SimStatus register_standard_timers();
  SimStatus register_standard_alarms();
  SimStatus register_default_mqtt_bridge();
  SimStatus register_default_display();

  SimStatus ensure_bool_signal(const std::string& path, const std::string& name, bool initial_value);
  SimStatus ensure_double_signal(const std::string& path, const std::string& name, double initial_value);
  SimStatus ensure_signal(
      const controller::signals::SignalDescriptor& descriptor,
      std::optional<controller::signals::SignalValue> initial_value = std::nullopt);
  static SimStatus map_status(bool ok, SimErrorCode code, std::string message);

  SimHarnessOptions options_;
  bool initialized_{false};
};

}  // namespace controller::sim
