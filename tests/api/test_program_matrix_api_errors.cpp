#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  {
    ProgramMatrixApiTestContext context;
    expect_true(context.initialize(), "unknown program matrix context should initialize");

    const auto loaded = context.api_service.get_program_matrix("missing", 0U);
    expect_true(!loaded.status.ok(), "unknown program matrix should be rejected");
    expect_true(
        loaded.status.code == controller::api::ProgramMatrixUiResultCode::matrix_ui_program_not_found,
        "unknown program matrix should surface MATRIX_UI_PROGRAM_NOT_FOUND");
  }

  {
    ProgramMatrixApiTestContext context;
    expect_true(context.initialize(), "invalid argument matrix context should initialize");

    const auto loaded = context.api_service.get_program_matrix("", 0U);
    expect_true(!loaded.status.ok(), "empty program id should be rejected");
    expect_true(
        loaded.status.code == controller::api::ProgramMatrixUiResultCode::matrix_ui_invalid_argument,
        "empty program id should surface MATRIX_UI_INVALID_ARGUMENT");
  }

  {
    ProgramMatrixApiTestContext context;
    expect_true(context.initialize(), "missing matrix data context should initialize");

    const auto listed = context.api_service.list_programs(0U);
    expect_true(!listed.status.ok(), "missing programs should surface a clean matrix list status");
    expect_true(
        listed.status.code == controller::api::ProgramMatrixUiResultCode::matrix_ui_no_programs,
        "missing matrix data should surface MATRIX_UI_NO_PROGRAMS cleanly");
  }

  if (failures != 0) {
    std::cerr << "test_program_matrix_api_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_matrix_api_errors passed\n";
  return 0;
}
