#include <iostream>

#include "template_test_support.hpp"

int main() {
  template_test::TemplateTestContext context;
  template_test::expect_true(context.initialize(), "template validation context should initialize");

  {
    auto draft = template_test::make_pressure_pump_draft();
    draft.template_kind = static_cast<controller::templates::TemplateKind>(999);
    const auto validation = context.engine.validate_draft(draft, 0U, true);
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_UNSUPPORTED_KIND"), "unsupported template kind should be rejected");
  }

  {
    auto draft = template_test::make_pressure_pump_draft();
    draft.bindings.erase("primary_output");
    const auto validation = context.engine.validate_draft(draft, 0U, true);
    template_test::expect_true(validation.has_errors(), "missing required binding should fail validation");
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_MISSING_REQUIRED_BINDING"), "missing required binding should use stable code");
  }

  {
    auto draft = template_test::make_pressure_pump_draft();
    draft.bindings["pressure_signal"] = "signal.fault";
    const auto validation = context.engine.validate_draft(draft, 0U, true);
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_WRONG_SIGNAL_TYPE"), "wrong signal type should be rejected");
  }

  {
    auto draft = template_test::make_pressure_pump_draft();
    draft.bindings["primary_output"] = "pwm.main";
    const auto validation = context.engine.validate_draft(draft, 0U, true);
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_WRONG_ACTUATOR_KIND"), "wrong actuator kind should be rejected");
  }

  {
    auto draft = template_test::make_pressure_pump_draft();
    draft.parameters.erase("start_threshold");
    const auto validation = context.engine.validate_draft(draft, 0U, true);
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_MISSING_REQUIRED_PARAMETER"), "missing required parameter should be rejected");
  }

  {
    auto draft = template_test::make_pressure_pump_draft();
    draft.parameters["stop_threshold"] = 1.0;
    const auto validation = context.engine.validate_draft(draft, 0U, true);
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_INVALID_PARAMETER_RANGE"), "invalid parameter range should be rejected");
  }

  {
    auto draft = template_test::make_pressure_pump_draft();
    draft.create_disabled = false;
    const auto validation = context.engine.validate_draft(draft, 0U, true);
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_UNSAFE_CREATE_ENABLE_REQUEST"), "unsafe create-enabled request should be rejected");
  }

  {
    const auto apply = context.engine.apply_template(template_test::make_pressure_pump_draft(), {1U, "template_test", "apply", std::string{"tester"}});
    template_test::expect_true(apply.accepted, "first pressure pump apply should succeed for duplicate-id test");
    const auto validation = context.engine.validate_draft(template_test::make_pressure_pump_draft(), 2U, true);
    template_test::expect_true(template_test::contains_issue_code(validation.issues, "TEMPLATE_DUPLICATE_RESULTING_ID"), "duplicate resulting ids should be rejected");
  }
  if (template_test::failures != 0) {
    std::cerr << "test_template_engine_validation failed with " << template_test::failures << " issue(s)\n";
    return 1;
  }
  std::cout << "test_template_engine_validation passed\n";
  return 0;
}
