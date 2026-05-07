#include <iostream>

#include "api_test_support.hpp"

int main() {
  using namespace api_test;

  {
    ProgramMatrixApiTestContext context;
    expect_true(context.initialize(), "program matrix list context should initialize");

    auto first = make_program("pump.alpha", "Pump Alpha", controller::sequence::SequenceProgramType::pump);
    auto second = make_program("burner.beta", "Burner Beta", controller::sequence::SequenceProgramType::burner);

    expect_true(context.sequence.sequence_service.register_program(first).ok(), "first matrix program should register");
    expect_true(context.sequence.sequence_service.register_program(second).ok(), "second matrix program should register");

    const auto listed = context.api_service.list_programs(0U);
    expect_true(listed.ok(), "matrix list should succeed");
    if (listed.ok()) {
      expect_true(listed.value->size() == 2U, "matrix list should contain both programs");
      expect_true((*listed.value)[0].id == "pump.alpha", "program list ordering should stay deterministic");
      expect_true((*listed.value)[1].id == "burner.beta", "program list ordering should preserve registration order");
    }
  }

  {
    ProgramMatrixApiTestContext context;
    expect_true(context.initialize(), "no-programs matrix list context should initialize");

    const auto listed = context.api_service.list_programs(0U);
    expect_true(!listed.status.ok(), "no-programs list should return a structured non-ok status");
    expect_true(
        listed.status.code == controller::api::ProgramMatrixUiResultCode::matrix_ui_no_programs,
        "no-programs list should surface MATRIX_UI_NO_PROGRAMS");
    expect_true(listed.value.has_value() && listed.value->empty(), "no-programs list should still return an empty vector");
  }

  if (failures != 0) {
    std::cerr << "test_program_matrix_api_list failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_program_matrix_api_list passed\n";
  return 0;
}
