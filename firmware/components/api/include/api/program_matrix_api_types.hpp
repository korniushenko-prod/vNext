#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/api_types.hpp"
#include "sequence/program_matrix_types.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::api {

enum class ProgramMatrixUiResultCode {
  matrix_ui_ok,
  matrix_ui_no_programs,
  matrix_ui_program_not_found,
  matrix_ui_no_active_program,
  matrix_ui_data_unavailable,
  matrix_ui_invalid_argument,
};

struct ProgramMatrixUiStatus {
  ProgramMatrixUiResultCode code{ProgramMatrixUiResultCode::matrix_ui_ok};
  std::string message;

  bool ok() const {
    return code == ProgramMatrixUiResultCode::matrix_ui_ok;
  }

  static ProgramMatrixUiStatus success(std::string detail = {}) {
    return ProgramMatrixUiStatus{ProgramMatrixUiResultCode::matrix_ui_ok, std::move(detail)};
  }

  static ProgramMatrixUiStatus error(const ProgramMatrixUiResultCode code, std::string detail) {
    return ProgramMatrixUiStatus{code, std::move(detail)};
  }
};

template <typename T>
struct ProgramMatrixUiResult {
  ProgramMatrixUiStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

using ProgramMatrixDto = controller::sequence::ProgramMatrix;
using ProgramMatrixRuntimeSummaryDto = controller::sequence::ProgramMatrixRuntimeSummary;

struct ProgramMatrixProgramListItemDto {
  std::string id;
  std::string name;
  controller::sequence::SequenceProgramType type{controller::sequence::SequenceProgramType::generic};
  bool enabled{false};
  bool active{false};
  std::optional<controller::sequence::SequenceLifecycle> lifecycle;
  std::optional<std::string> current_state_id;
  std::size_t state_count{0U};
  std::size_t actuator_count{0U};
  std::size_t issue_count{0U};
};

struct ProgramMatrixPayloadDto {
  std::optional<ProgramMatrixDto> matrix;
  ProgramMatrixRuntimeSummaryDto runtime_summary;
};

const char* to_string(ProgramMatrixUiResultCode code);

}  // namespace controller::api
