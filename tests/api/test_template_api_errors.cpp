#include <iostream>

#include "../templates/template_test_support.hpp"

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template api error context should initialize");

  const auto unknown_schema = context.api_service.get_template_schema(static_cast<controller::templates::TemplateKind>(999), 0U);
  template_test::expect_false(unknown_schema.ok(), "unknown template kind should be rejected");
  template_test::expect_equal(std::string{controller::api::to_string(unknown_schema.status.code)}, "TEMPLATE_UI_INVALID_DRAFT", "unknown template kind should map to invalid draft UI code");

  auto invalid_context = template_test::make_command_context(1U);
  invalid_context.source.clear();
  const auto invalid_apply = context.api_service.apply_template_draft(template_test::make_pressure_pump_draft(), invalid_context);
  template_test::expect_false(invalid_apply.accepted, "invalid command context should be rejected");
  template_test::expect_equal(std::string{controller::templates::to_string(invalid_apply.status.code)}, "TEMPLATE_INVALID_ARGUMENT", "invalid command context should surface invalid argument code");

  context.api_service.engine().set_fault_injection(controller::templates::TemplateEngineFaultInjection{2U, 1U});
  const auto rollback_failure = context.api_service.apply_template_draft(template_test::make_pid_pressure_pwm_pump_draft(), template_test::make_command_context(2U));
  template_test::expect_false(rollback_failure.accepted, "rollback failure scenario should reject apply");
  template_test::expect_false(rollback_failure.rollback_succeeded, "rollback failure should be surfaced through api apply");
  template_test::expect_true(template_test::contains_issue_code(rollback_failure.rollback_issues, "TEMPLATE_ROLLBACK_FAILED"), "rollback failure should expose structured rollback issues");

  if (template_test::failures != 0) {
    std::cerr << "test_template_api_errors failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_api_errors passed\n";
  return 0;
}
