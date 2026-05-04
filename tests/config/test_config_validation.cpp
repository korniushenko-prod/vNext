#include <iostream>
#include <string>

#include "config/config_defaults.hpp"
#include "config/config_types.hpp"
#include "config/config_validation.hpp"

using namespace controller::config;

namespace {

int failures = 0;

void expect_true(bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

bool has_issue_code(const ValidationResult& result, const std::string& code) {
  for (const auto& issue : result.issues) {
    if (issue.code == code) {
      return true;
    }
  }
  return false;
}

}  // namespace

int main() {
  {
    auto config = factory_default_config();
    config.relays.push_back(config.relays.front());
    config.relays.back().name = "Relay Copy";
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "DUPLICATE_ID"), "duplicate ids must fail");
  }

  {
    auto config = factory_default_config();
    config.relays.front().name = "";
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "EMPTY_NAME"), "empty names must fail");
  }

  {
    auto config = factory_default_config();
    config.pulse_inputs.push_back(PulseInputConfig{"pulse_1", "Pulse 1", true, "missing_input", 100U, true, 1.0});
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "UNKNOWN_REFERENCE"), "unknown pulse input source must fail");
  }

  {
    auto config = factory_default_config();
    config.inputs.push_back(InputConfig{
        "input_1",
        "Input 1",
        true,
        InputKind::pulse,
        "signals.input_1",
        std::nullopt,
        std::nullopt,
        InputPulseSettings{100U, 1000.0, true}});
    config.pulse_inputs.push_back(PulseInputConfig{"pulse_1", "Pulse 1", true, "input_1", 100U, true, 1.0});
    config.flowmeters.push_back(FlowmeterConfig{"flow_1", "Flow 1", true, "missing_pulse", 100.0, 1000U, true, true, std::nullopt});
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "UNKNOWN_REFERENCE"), "unknown flowmeter pulse input must fail");
  }

  {
    auto config = factory_default_config();
    config.pid_controllers.push_back(PidControllerConfig{
        "pid_1", "PID 1", true, PidMode::auto_mode, "signals.temperature", "missing_output", 1000U, 0.0, 1.0, std::nullopt, std::nullopt, 1.0, 0.1, 0.0});
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "INVALID_PID_TARGET"), "unknown PID output target must fail");
  }

  {
    auto config = factory_default_config();
    config.pwm_outputs.push_back(PwmOutputConfig{"pwm_1", "PWM 1", true, ActuatorRole::generic, SafeState::off, 1.0, 0.0, std::nullopt});
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "INVALID_RANGE"), "invalid PWM range must fail");
  }

  {
    auto config = factory_default_config();
    config.inputs.push_back(InputConfig{
        "input_1",
        "Input 1",
        true,
        InputKind::pulse,
        "signals.input_1",
        std::nullopt,
        std::nullopt,
        InputPulseSettings{100U, 1000.0, true}});
    config.pulse_inputs.push_back(PulseInputConfig{"pulse_1", "Pulse 1", true, "input_1", 100U, true, 1.0});
    config.flowmeters.push_back(FlowmeterConfig{"flow_1", "Flow 1", true, "pulse_1", 0.0, 1000U, true, true, std::nullopt});
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "INVALID_K_FACTOR"), "invalid K-factor must fail");
  }

  {
    auto config = factory_default_config();
    ProgramConfig program{};
    program.id = "program_1";
    program.name = "Program 1";
    program.enabled = true;
    program.type = ProgramType::generic;
    program.normal_stop_state = "stop";
    program.trip_state = "trip";
    program.lockout_state = "lockout";
    program.states.push_back(ProgramStateConfig{"stop", "Stop", true, ProgramStateType::stop, false, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, {}, {}, {}});
    config.programs.push_back(program);
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "MISSING_REQUIRED_FIELD"), "missing program initial state must fail");
  }

  {
    auto config = factory_default_config();
    ProgramTransitionConfig transition{"transition_1", "Go", true, "missing_state", "signals.start"};
    ProgramStateConfig state{"run", "Run", true, ProgramStateType::run, false, std::nullopt, std::nullopt, std::nullopt, std::nullopt, {}, {}, {}, {transition}};
    ProgramConfig program{};
    program.id = "program_1";
    program.name = "Program 1";
    program.enabled = true;
    program.type = ProgramType::generic;
    program.initial_state = "run";
    program.normal_stop_state = "run";
    program.trip_state = "run";
    program.lockout_state = "run";
    program.states.push_back(state);
    config.programs.push_back(program);
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "INVALID_PROGRAM_STATE_TARGET"), "transition to unknown state must fail");
  }

  {
    auto config = factory_default_config();
    config.relays.front().enabled = true;
    config.relays.front().role = ActuatorRole::fuel;
    config.relays.front().safe_state = SafeState::on;
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "INVALID_SAFE_STATE"), "fuel output without safe OFF must fail");
  }

  {
    auto config = factory_default_config();
    config.templates.push_back(TemplateBindingConfig{"tpl_1", "Template 1", true, "smart_relay", "missing_object", {}});
    const auto result = validate_config(config);
    expect_true(has_issue_code(result, "UNKNOWN_REFERENCE"), "unknown template-bound object must fail");
  }

  {
    auto config = factory_default_config();
    config.relays[1].id = config.relays[0].id;
    config.relays[2].name = "";
    config.pwm_outputs.push_back(PwmOutputConfig{"pwm_1", "PWM 1", true, ActuatorRole::generic, SafeState::off, 1.0, 0.0, std::nullopt});
    const auto result = validate_config(config);
    expect_true(result.issues.size() >= 3, "validation must aggregate multiple issues in one run");
    expect_true(result.has_errors(), "aggregated issues must be reported as errors");
  }

  if (failures != 0) {
    std::cerr << "test_config_validation failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_config_validation passed\n";
  return 0;
}
