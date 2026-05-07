#include <iostream>

#include "template_test_support.hpp"

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template apply context should initialize");
  {
    const auto result = context.engine.apply_template(template_test::make_pid_pressure_pwm_pump_draft(), {1U, "template_test", "apply", std::string{"tester"}});
    template_test::expect_true(result.accepted, "valid pid pressure template should apply");
    template_test::expect_true(context.sequence.sequence_service.list_programs().empty(), "pid pressure template should not auto-create programs");
    template_test::expect_true(context.sequence.alarm_service.has_alarm("pid.pressure_1.alarm.high_pressure_trip"), "generated alarm should be registered");
    template_test::expect_true(context.pid_service.has_pid("pid.pressure_1.pid.main"), "generated pid should be registered");
    template_test::expect_true(context.logic_service.has_rule("pid.pressure_1.rule.high_pressure_trip"), "generated rule should be registered");
    template_test::expect_equal(result.created_alarms.size(), std::size_t{1}, "apply result should summarize created alarms");
    template_test::expect_equal(result.created_pids.size(), std::size_t{1}, "apply result should summarize created pids");
    template_test::expect_equal(result.created_rules.size(), std::size_t{1}, "apply result should summarize created rules");
    template_test::expect_true(result.created_alarms.front().enabled, "generated alarms may remain enabled by default");
    template_test::expect_false(result.created_pids.front().enabled, "generated pid should be disabled by default");
    template_test::expect_false(result.created_rules.front().enabled, "generated rule should be disabled by default");
  }

  {
    template_test::TemplateTestContext blocking_context;
    template_test::expect_true(blocking_context.initialize(), "blocking context should initialize");
    auto program = sequence_test::make_basic_program();
    template_test::expect_true(blocking_context.sequence.sequence_service.register_program(program).ok(), "blocking test program should register");
    template_test::expect_true(blocking_context.sequence.sequence_service.start_program(program.id, 10U, "template_test", "activate blocker").ok(), "blocking test program should start");
    const auto blocked = blocking_context.engine.apply_template(template_test::make_pressure_pump_draft(), {11U, "template_test", "apply", std::string{"tester"}});
    template_test::expect_false(blocked.accepted, "apply should be denied while a program is active");
    template_test::expect_equal(std::string{controller::templates::to_string(blocked.status.code)}, "TEMPLATE_ACTIVE_PROGRAM_PRESENT", "active program denial should use stable code");
  }
  if (template_test::failures != 0) {
    std::cerr << "test_template_engine_apply failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_engine_apply passed\n";
  return 0;
}
