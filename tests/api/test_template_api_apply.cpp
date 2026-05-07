#include <iostream>

#include "../templates/template_test_support.hpp"

int main() {
  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "template api apply context should initialize");
    const auto result = context.api_service.apply_template_draft(template_test::make_burner_supervisory_draft(), template_test::make_command_context(1U));
    template_test::expect_true(result.accepted, "valid burner supervisory draft should apply through api");
    template_test::expect_equal(result.created_programs.size(), std::size_t{1}, "api apply should summarize created programs");
    template_test::expect_true(context.sequence.sequence_service.has_program("burner.supervisor_1.program.main"), "api apply should register generated program");
    template_test::expect_true(context.logic_service.has_rule("burner.supervisor_1.rule.air_fault"), "api apply should register generated rules");
    template_test::expect_true(context.sequence.alarm_service.has_alarm("burner.supervisor_1.alarm.air_fault"), "api apply should register generated alarms");
  }

  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "template api invalid context should initialize");
    auto invalid = template_test::make_pressure_pump_draft();
    invalid.bindings.erase("primary_output");
    const auto result = context.api_service.apply_template_draft(invalid, template_test::make_command_context(2U));
    template_test::expect_false(result.accepted, "invalid draft should be denied through api");
    template_test::expect_equal(std::string{controller::templates::to_string(result.status.code)}, "TEMPLATE_INVALID_DRAFT", "invalid api apply should return invalid draft code");
  }

  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "template api active-program context should initialize");
    auto program = sequence_test::make_basic_program();
    template_test::expect_true(context.sequence.sequence_service.register_program(program).ok(), "blocking program should register");
    template_test::expect_true(context.sequence.sequence_service.start_program(program.id, 3U, "template_test", "activate blocker").ok(), "blocking program should start");
    const auto result = context.api_service.apply_template_draft(template_test::make_pressure_pump_draft(), template_test::make_command_context(4U));
    template_test::expect_false(result.accepted, "api apply should be denied while a program is active");
    template_test::expect_equal(std::string{controller::templates::to_string(result.status.code)}, "TEMPLATE_ACTIVE_PROGRAM_PRESENT", "active program api apply should return stable code");
  }

  if (template_test::failures != 0) {
    std::cerr << "test_template_api_apply failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_api_apply passed\n";
  return 0;
}
