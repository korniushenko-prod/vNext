#include <iostream>

#include "template_test_support.hpp"

int main() {
  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "template rollback context should initialize");
    context.engine.set_fault_injection(controller::templates::TemplateEngineFaultInjection{2U, std::nullopt});
    const auto result = context.engine.apply_template(template_test::make_pid_pressure_pwm_pump_draft(), {1U, "template_test", "apply", std::string{"tester"}});
    template_test::expect_false(result.accepted, "injected mid-apply failure should reject apply");
    template_test::expect_true(result.rollback_attempted, "rollback should be attempted after partial apply failure");
    template_test::expect_true(result.rollback_succeeded, "rollback should complete cleanly when removal hooks succeed");
    template_test::expect_false(context.sequence.alarm_service.has_alarm("pid.pressure_1.alarm.high_pressure_trip"), "rollback should remove generated alarms");
    template_test::expect_false(context.pid_service.has_pid("pid.pressure_1.pid.main"), "rollback should remove generated pids");
    template_test::expect_false(context.logic_service.has_rule("pid.pressure_1.rule.high_pressure_trip"), "rollback should remove generated rules");
  }

  {
    template_test::TemplateTestContext context;
    template_test::expect_true(context.initialize(), "rollback-order context should initialize");
    context.engine.set_fault_injection(controller::templates::TemplateEngineFaultInjection{4U, 1U});
    const auto result = context.engine.apply_template(template_test::make_burner_supervisory_draft(), {2U, "template_test", "apply", std::string{"tester"}});
    template_test::expect_false(result.accepted, "rollback failure scenario should reject apply");
    template_test::expect_false(result.rollback_succeeded, "injected rollback failure should surface");
    template_test::expect_true(template_test::contains_issue_code(result.rollback_issues, "TEMPLATE_ROLLBACK_FAILED"), "rollback failure should produce structured rollback issue");
    template_test::expect_false(context.sequence.alarm_service.has_alarm("burner.supervisor_1.alarm.air_fault"), "reverse rollback should continue and remove earlier alarms after a later rule rollback failure");
    template_test::expect_false(context.sequence.alarm_service.has_alarm("burner.supervisor_1.alarm.flame_fault"), "reverse rollback should remove both generated alarms");
    template_test::expect_false(context.logic_service.has_rule("burner.supervisor_1.rule.flame_fault"), "reverse rollback should remove the last-registered rule first");
    template_test::expect_true(context.logic_service.has_rule("burner.supervisor_1.rule.air_fault"), "reverse rollback ordering should leave the next rule behind when its removal is the injected failure");
  }

  if (template_test::failures != 0) {
    std::cerr << "test_template_engine_rollback failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_engine_rollback passed\n";
  return 0;
}
