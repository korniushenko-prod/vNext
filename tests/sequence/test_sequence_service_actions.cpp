#include <cmath>
#include <iostream>

#include "sequence_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::hal::RelayState;

namespace {

bool almost_equal(const double lhs, const double rhs) {
  return std::fabs(lhs - rhs) < 0.000001;
}

}  // namespace

int main() {
  using namespace sequence_test;

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "actions context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));
    program.states[1].active_actions = {relay_action("run_relay", "relay.main", RelayState::on, "run relay")};

    expect_true(context.sequence_service.register_program(program).ok(), "register relay program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start relay program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick to run");

    const auto actuator_snapshot = context.actuator_manager.get_snapshot("relay.main");
    expect_true(actuator_snapshot.ok(), "relay actuator snapshot should be available");
    expect_true(
        actuator_snapshot.ok() && actuator_snapshot.value->priority == ActuatorPriority::sequence &&
            actuator_snapshot.value->owner == "program:pump1:state:run",
        "relay active_action should create Sequence-priority request in ActuatorManager");

    expect_true(context.registry.update_signal("transition.ready", controller::signals::SignalValue{true}, 2U).ok(), "raise ready");
    expect_true(context.sequence_service.tick(2U).ok(), "tick to stop");

    const auto cleared_snapshot = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        cleared_snapshot.ok() && cleared_snapshot.value->owner == "safe_fallback",
        "state exit should clear old owner requests");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "pwm context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));
    program.states[1].active_actions = {pwm_action("run_pwm", "pwm.main", 55.0, true, "run pwm")};

    expect_true(context.sequence_service.register_program(program).ok(), "register pwm program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start pwm program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick to run");

    const auto pwm_snapshot = context.actuator_manager.get_snapshot("pwm.main");
    expect_true(
        pwm_snapshot.ok() && std::get<controller::actuators::PwmEffectiveState>(pwm_snapshot.value->effective).enabled &&
            almost_equal(std::get<controller::actuators::PwmEffectiveState>(pwm_snapshot.value->effective).duty_percent, 55.0),
        "pwm active_action should work");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "command context should initialize");

    auto program = make_basic_program();
    program.states[0].entry_actions = {
        timer_start_action("start_timer", "timer.sequence"),
        alarm_action("alarm_raise", "alarm.sequence", true),
        virtual_signal_action("write_virtual", "virtual.sequence_flag", controller::signals::SignalValue{true}),
    };
    program.states[0].exit_actions = {timer_stop_action("stop_timer", "timer.sequence")};
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));

    expect_true(context.sequence_service.register_program(program).ok(), "register command program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start command program");

    const auto timer_started = context.timer_service.get_snapshot("timer.sequence", 0U);
    const auto alarm_snapshot = context.alarm_service.get_snapshot("alarm.sequence");
    const auto virtual_signal = context.registry.read_bool("virtual.sequence_flag", 0U);
    expect_true(timer_started.ok() && timer_started.value->armed, "timer_start entry action should work");
    expect_true(alarm_snapshot.ok() && alarm_snapshot.value->state.active, "alarm_set_condition command action should work");
    expect_true(virtual_signal.ok() && virtual_signal.value.value(), "write_virtual_signal action should work");

    expect_true(context.sequence_service.tick(1U).ok(), "tick to run");
    const auto timer_stopped = context.timer_service.get_snapshot("timer.sequence", 1U);
    expect_true(timer_stopped.ok() && !timer_stopped.value->armed, "timer_stop exit action should work");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "invalid action context should initialize");

    auto program = make_basic_program();
    program.states[0].entry_actions = {timer_start_action("bad_timer", "timer.missing")};
    const auto register_result = context.sequence_service.register_program(program);
    expect_true(!register_result.ok(), "invalid action target should be rejected by validator");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_service_actions failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_actions passed\n";
  return 0;
}
