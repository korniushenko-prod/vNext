#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  ProgramBuilderApiTestContext context;
  expect_true(context.initialize(), "web program builder view model context should initialize");

  controller::api::ProgramBuilderWizardSourceData source;
  source.catalog = *context.api_service.get_builder_catalog(0U).value;
  source.draft = make_pump_builder_draft();
  source.preview = context.api_service.preview_draft(source.draft, 0U).value;

  const auto view_model = controller::api::WebProgramBuilderAdapter::build_view_model(source);
  expect_true(!view_model.skeleton_options.empty(), "view model should keep skeleton options");
  expect_true(view_model.binding_fields.front().required, "view model should expose required binding indicators");
  expect_true(!view_model.binding_fields.front().available_options.empty(), "view model should expose matching catalog options for bindings");
  expect_true(view_model.will_create_disabled, "view model should represent the create-disabled note");
  expect_true(view_model.create_allowed, "valid preview should enable create");

  auto invalid_source = source;
  invalid_source.preview = context.api_service.preview_draft(
      [&]() {
        auto draft = make_pump_builder_draft();
        draft.parameters.erase("min_run_time_ms");
        return draft;
      }(),
      0U)
                             .value;
  const auto invalid_view_model = controller::api::WebProgramBuilderAdapter::build_view_model(invalid_source);
  expect_true(!invalid_view_model.preview_valid, "invalid preview should be represented as invalid");
  expect_true(!invalid_view_model.issues.empty(), "invalid preview issues should be surfaced in the view model");

  if (failures != 0) {
    std::cerr << "test_web_program_builder_view_model failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_web_program_builder_view_model passed\n";
  return 0;
}
