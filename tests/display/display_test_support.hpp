#pragma once

#include <cmath>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/flow_api_service.hpp"
#include "api/sequence_api_service.hpp"
#include "display/display_service.hpp"
#include "flow/flow_descriptor.hpp"
#include "flow/flow_service.hpp"
#include "hal/display_hal.hpp"
#include "hal/pulse_input_hal.hpp"
#include "mqtt/mqtt_descriptor.hpp"
#include "mqtt/mqtt_service.hpp"
#include "mqtt/mqtt_topic_mapper.hpp"
#include "pid/pid_service.hpp"
#include "sequence_test_support.hpp"
#include "storage/storage_backend.hpp"
#include "storage/storage_service.hpp"

namespace display_test {

inline int failures = 0;

inline void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

inline bool contains_text(const std::string& value, const std::string& expected_fragment) {
  return value.find(expected_fragment) != std::string::npos;
}

inline controller::display::DisplayDescriptor make_display_descriptor(
    std::string id = "local.oled",
    std::string name = "Local OLED",
    const std::size_t line_count = 6U,
    const std::size_t chars_per_line = 16U) {
  controller::display::DisplayDescriptor descriptor;
  descriptor.id = std::move(id);
  descriptor.name = std::move(name);
  descriptor.enabled = true;
  descriptor.line_count = line_count;
  descriptor.chars_per_line = chars_per_line;
  descriptor.auto_rotate = true;
  descriptor.rotate_interval_ms = 1000U;
  descriptor.alarm_override_enabled = true;
  descriptor.enabled_screens = {
      controller::display::DisplayScreen::main,
      controller::display::DisplayScreen::program,
      controller::display::DisplayScreen::flow,
      controller::display::DisplayScreen::pid,
      controller::display::DisplayScreen::alarms,
      controller::display::DisplayScreen::mqtt,
  };
  return descriptor;
}

inline controller::flow::FlowDescriptor make_flow_descriptor(
    std::string id = "flow1",
    std::string name = "Flow 1",
    std::string pulse_input_id = "pulse.flow1") {
  controller::flow::FlowDescriptor descriptor;
  descriptor.id = std::move(id);
  descriptor.name = std::move(name);
  descriptor.enabled = true;
  descriptor.pulse_input_id = std::move(pulse_input_id);
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = controller::flow::FlowRateMode::time_window;
  descriptor.time_window_ms = 60000U;
  descriptor.avg_last_n_pulses = 3U;
  descriptor.no_flow_timeout_ms = 1000U;
  descriptor.batch_target_default = 2.0;
  descriptor.save_every_pulses = 100U;
  descriptor.trend_enabled = true;
  descriptor.trend_bucket_ms = 1000U;
  descriptor.trend_bucket_count = 8U;
  descriptor.protected_lifetime_totals = true;
  return descriptor;
}

inline controller::pid::PidServiceDescriptor make_pid_descriptor(
    std::string id = "loop1",
    std::string name = "Loop 1",
    std::string pv_signal_path = "pid.pv",
    std::string output_target_id = "pwm.main") {
  controller::pid::PidServiceDescriptor descriptor;
  descriptor.id = std::move(id);
  descriptor.name = std::move(name);
  descriptor.enabled = true;
  descriptor.core_config.id = descriptor.id;
  descriptor.core_config.name = descriptor.name;
  descriptor.core_config.kp = 2.0;
  descriptor.core_config.ki = 0.5;
  descriptor.core_config.kd = 0.0;
  descriptor.core_config.sample_time_ms = 100U;
  descriptor.core_config.mode = controller::pid::PidMode::manual;
  descriptor.core_config.output_min = 0.0;
  descriptor.core_config.output_max = 100.0;
  descriptor.core_config.integral_min = -100.0;
  descriptor.core_config.integral_max = 100.0;
  descriptor.core_config.manual_output = 25.0;
  descriptor.pv_signal_path = std::move(pv_signal_path);
  descriptor.setpoint_source_kind = controller::pid::PidSetpointSourceKind::constant;
  descriptor.constant_setpoint = 50.0;
  descriptor.output_target_id = std::move(output_target_id);
  descriptor.output_target_kind = controller::actuators::ActuatorTargetKind::pwm;
  descriptor.stale_as_fault = true;
  descriptor.invalid_as_fault = true;
  descriptor.fault_clears_output = true;
  descriptor.publish_signals = true;
  return descriptor;
}

inline controller::mqtt::MqttDescriptor make_mqtt_descriptor() {
  controller::mqtt::MqttDescriptor descriptor;
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
  return descriptor;
}

struct TestContext {
  sequence_test::SequenceTestContext sequence;
  controller::hal::MockDisplayHal display_hal;
  controller::hal::MockPulseInputHal flow_hal;
  controller::storage::InMemoryStorageBackend storage_backend;
  controller::storage::StorageService storage_service;
  controller::flow::FlowService flow_service;
  controller::api::FlowApiService flow_api;
  controller::pid::PidService pid_service;
  controller::api::SequenceApiService sequence_api;
  controller::mqtt::MockMqttClientBackend mqtt_backend;
  controller::mqtt::MqttService mqtt_service;
  controller::display::DisplayService display_service;

  explicit TestContext(
      const std::size_t history_capacity = 16U,
      const controller::hal::DisplayConfig display_config = controller::hal::DisplayConfig{6U, 16U, false})
      : sequence(history_capacity),
        display_hal(display_config),
        flow_hal({
            controller::hal::PulseInputChannelConfig{"pulse.flow1", 0U, 0.0, true},
            controller::hal::PulseInputChannelConfig{"pulse.flow2", 0U, 0.0, true},
        }),
        storage_service(storage_backend),
        flow_service(flow_hal, storage_service, sequence.registry, history_capacity),
        flow_api(flow_service),
        pid_service(sequence.registry, sequence.actuator_manager, history_capacity),
        sequence_api(sequence.sequence_service, sequence.alarm_service, sequence.actuator_manager),
        mqtt_service(history_capacity),
        display_service(display_hal, sequence.registry, history_capacity) {}

  bool initialize() {
    if (!sequence.initialize()) {
      return false;
    }
    if (!flow_hal.initialize().ok()) {
      return false;
    }
    if (!sequence.registry.has_signal("pid.pv") &&
        !sequence.registry.register_signal(
             sequence_test::make_signal_descriptor("pid.pv", "PID PV", controller::signals::SignalType::float64))
             .ok()) {
      return false;
    }
    if (!sequence.registry.update_signal("pid.pv", controller::signals::SignalValue{20.0}, 0U).ok()) {
      return false;
    }

    mqtt_service.bind_backend(mqtt_backend);
    mqtt_service.bind_sequence_api(sequence_api);
    mqtt_service.bind_flow_api(flow_api);
    mqtt_service.bind_pid_service(pid_service);
    mqtt_service.bind_alarm_service(sequence.alarm_service);
    mqtt_service.bind_actuator_manager(sequence.actuator_manager);

    display_service.bind_sequence_api(sequence_api);
    display_service.bind_flow_api(flow_api);
    display_service.bind_pid_service(pid_service);
    display_service.bind_alarm_service(sequence.alarm_service);
    display_service.bind_mqtt_service(mqtt_service);
    return true;
  }
};

inline controller::sequence::SequenceProgram make_program(
    std::string id = "pump1",
    std::string name = "Pump 1") {
  auto program = sequence_test::make_basic_program();
  program.id = std::move(id);
  program.name = std::move(name);
  return program;
}

}  // namespace display_test
