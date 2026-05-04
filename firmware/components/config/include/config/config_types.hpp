#pragma once

#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <vector>

namespace controller::config {

enum class InputKind { disabled, di, ai, pulse, flow_source };

enum class ActuatorRole { generic, fan, fuel, ignition, pump, valve, alarm, heater, damper, motor };

enum class SafeState { off, on, hold };

enum class AlarmSeverity { info, warning, inhibit, trip, safety };

enum class ProgramType { generic, pump, compressor, burner, incinerator, dosing, custom };

enum class ProgramStateType { generic, wait, action, purge, ignition, run, stop, cooldown, lockout, custom };

enum class PidMode { manual, auto_mode };

struct ConfigIdentity {
  std::string id;
  std::string name;
  bool enabled{false};
};

struct DeviceInfoConfig : ConfigIdentity {
  std::string description;
};

struct BoardPinBindingConfig : ConfigIdentity {
  std::string target_id;
  std::optional<int> gpio;
};

struct BoardStepperPinConfig : ConfigIdentity {
  std::string target_id;
  std::optional<int> step_gpio;
  std::optional<int> dir_gpio;
  std::optional<int> enable_gpio;
};

struct BoardDisplayPinConfig : ConfigIdentity {
  std::string bus_name;
  std::optional<int> sda_gpio;
  std::optional<int> scl_gpio;
};

struct BoardConfig : ConfigIdentity {
  std::string module_name;
  std::vector<BoardPinBindingConfig> input_pins;
  std::vector<BoardPinBindingConfig> relay_pins;
  std::vector<BoardPinBindingConfig> pwm_pins;
  std::vector<BoardPinBindingConfig> pulse_input_pins;
  std::vector<BoardStepperPinConfig> stepper_pins;
  std::vector<BoardPinBindingConfig> motor_pins;
  std::vector<BoardDisplayPinConfig> display_pins;
};

struct DigitalInputSettings {
  bool inverted{false};
  bool pullup_enabled{false};
};

struct AnalogInputSettings {
  double raw_min{0.0};
  double raw_max{0.0};
  double engineering_min{0.0};
  double engineering_max{0.0};
  std::string unit;
};

struct InputPulseSettings {
  std::uint32_t debounce_us{0};
  double max_frequency_hz{0.0};
  bool count_rising_edge{true};
};

struct InputConfig : ConfigIdentity {
  InputKind kind{InputKind::disabled};
  std::string signal_path;
  std::optional<DigitalInputSettings> di;
  std::optional<AnalogInputSettings> ai;
  std::optional<InputPulseSettings> pulse;
};

struct RelayConfig : ConfigIdentity {
  ActuatorRole role{ActuatorRole::generic};
  SafeState safe_state{SafeState::off};
  std::optional<std::string> interlock_group;
};

struct PwmOutputConfig : ConfigIdentity {
  ActuatorRole role{ActuatorRole::generic};
  SafeState safe_state{SafeState::off};
  double output_min{0.0};
  double output_max{1.0};
  std::optional<std::string> interlock_group;
};

struct PulseInputConfig : ConfigIdentity {
  std::string source_input_id;
  std::uint32_t debounce_us{0};
  bool count_rising_edge{true};
  double scale{1.0};
};

struct FlowmeterConfig : ConfigIdentity {
  std::string pulse_input_id;
  double k_factor{0.0};
  std::uint32_t averaging_window_ms{0};
  bool protected_lifetime_pulse_total{false};
  bool protected_lifetime_volume_total{false};
  std::optional<double> batch_target_volume;
};

struct PidControllerConfig : ConfigIdentity {
  PidMode mode{PidMode::manual};
  std::string pv_source;
  std::string output_target_id;
  std::uint32_t sample_time_ms{0};
  double output_min{0.0};
  double output_max{0.0};
  std::optional<double> integral_min;
  std::optional<double> integral_max;
  double kp{0.0};
  double ki{0.0};
  double kd{0.0};
};

struct StepperConfig : ConfigIdentity {
  ActuatorRole role{ActuatorRole::generic};
  SafeState safe_state{SafeState::off};
  std::optional<std::string> interlock_group;
  double max_speed_steps_per_second{0.0};
  double max_accel_steps_per_second_sq{0.0};
};

struct MotorConfig : ConfigIdentity {
  ActuatorRole role{ActuatorRole::generic};
  SafeState safe_state{SafeState::off};
  std::optional<std::string> interlock_group;
  double output_min{0.0};
  double output_max{1.0};
};

struct TimerConfig : ConfigIdentity {
  std::uint32_t duration_ms{0};
  bool auto_restart{false};
};

struct AlarmConfig : ConfigIdentity {
  AlarmSeverity severity{AlarmSeverity::warning};
  std::vector<std::string> condition_paths;
  std::optional<std::string> latch_timer_id;
};

struct RuleConditionConfig : ConfigIdentity {
  std::string signal_path;
  std::string operation;
  std::string compare_value;
};

struct RuleActionConfig : ConfigIdentity {
  std::string target_id;
  std::string command;
  std::optional<double> numeric_value;
};

struct RuleConfig : ConfigIdentity {
  std::vector<RuleConditionConfig> conditions;
  std::vector<RuleActionConfig> actions;
};

struct ProgramActionConfig : ConfigIdentity {
  std::string target_actuator_id;
  std::string command;
  std::optional<double> numeric_value;
};

struct ProgramTransitionConfig : ConfigIdentity {
  std::string to;
  std::string condition_path;
};

struct ProgramStateConfig : ConfigIdentity {
  ProgramStateType type{ProgramStateType::generic};
  bool non_skippable{false};
  std::optional<std::uint32_t> min_time_ms;
  std::optional<std::uint32_t> max_time_ms;
  std::optional<std::string> on_timeout;
  std::optional<std::string> on_fault;
  std::vector<ProgramActionConfig> entry_actions;
  std::vector<ProgramActionConfig> active_actions;
  std::vector<ProgramActionConfig> exit_actions;
  std::vector<ProgramTransitionConfig> transitions;
};

struct ProgramConfig : ConfigIdentity {
  ProgramType type{ProgramType::generic};
  std::string initial_state;
  std::string normal_stop_state;
  std::string trip_state;
  std::string lockout_state;
  std::vector<ProgramStateConfig> states;
};

struct TemplateBindingConfig : ConfigIdentity {
  std::string template_type_id;
  std::optional<std::string> object_id;
  std::map<std::string, std::string> bindings;
};

struct NetworkConfig : ConfigIdentity {
  std::string hostname;
  std::string ssid;
  std::string password;
  bool dhcp_enabled{true};
};

struct DisplayConfig : ConfigIdentity {
  std::string driver;
  std::optional<int> width;
  std::optional<int> height;
};

struct StorageConfig : ConfigIdentity {
  bool protect_lifetime_totalizers{true};
  std::optional<std::uint32_t> save_every_pulses;
  std::optional<std::uint32_t> save_every_seconds;
};

struct DeviceConfig {
  std::uint32_t schema_version{0};
  std::uint32_t config_version{0};
  DeviceInfoConfig device;
  BoardConfig board;
  std::vector<InputConfig> inputs;
  std::vector<RelayConfig> relays;
  std::vector<PwmOutputConfig> pwm_outputs;
  std::vector<PulseInputConfig> pulse_inputs;
  std::vector<FlowmeterConfig> flowmeters;
  std::vector<PidControllerConfig> pid_controllers;
  std::vector<StepperConfig> steppers;
  std::vector<MotorConfig> motors;
  std::vector<TimerConfig> timers;
  std::vector<AlarmConfig> alarms;
  std::vector<RuleConfig> rules;
  std::vector<ProgramConfig> programs;
  std::vector<TemplateBindingConfig> templates;
  NetworkConfig network;
  DisplayConfig display;
  StorageConfig storage;
};

}  // namespace controller::config
