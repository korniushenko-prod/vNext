#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/api_types.hpp"
#include "sequence/program_builder_types.hpp"

namespace controller::api {

enum class ProgramBuilderUiResultCode {
  builder_ui_ok,
  builder_ui_invalid_draft,
  builder_ui_create_denied,
  builder_ui_duplicate_id,
  builder_ui_data_unavailable,
  builder_ui_invalid_argument,
  builder_ui_sequence_registration_failed,
};

using ProgramBuilderDraftDto = controller::sequence::ProgramBuilderDraft;
using ProgramBuilderCatalogDto = controller::sequence::ProgramBuilderCatalog;
using ProgramBuilderPreviewDto = controller::sequence::ProgramBuilderPreview;
using ProgramBuilderValidationDto = controller::sequence::ProgramBuilderValidationResult;
using ProgramBuilderIssueDto = controller::sequence::ProgramBuilderIssue;

struct ProgramBuilderUiStatus {
  ProgramBuilderUiResultCode code{ProgramBuilderUiResultCode::builder_ui_ok};
  std::string message;
  std::vector<ProgramBuilderIssueDto> validation_issues;

  bool ok() const {
    return code == ProgramBuilderUiResultCode::builder_ui_ok;
  }

  static ProgramBuilderUiStatus success(std::string detail = {}) {
    return ProgramBuilderUiStatus{ProgramBuilderUiResultCode::builder_ui_ok, std::move(detail), {}};
  }

  static ProgramBuilderUiStatus error(
      const ProgramBuilderUiResultCode error_code,
      std::string detail,
      std::vector<ProgramBuilderIssueDto> issues = {}) {
    return ProgramBuilderUiStatus{error_code, std::move(detail), std::move(issues)};
  }
};

template <typename T>
struct ProgramBuilderUiResult {
  ProgramBuilderUiStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct CreatedProgramDto {
  std::string program_id;
  std::string program_name;
  controller::sequence::SequenceProgramType program_type{controller::sequence::SequenceProgramType::custom};
  bool created_disabled{true};
  std::size_t state_count{0U};
};

struct ProgramBuilderCreateResult {
  bool accepted{false};
  ProgramBuilderUiStatus status{};
  std::optional<CreatedProgramDto> created_program;
  std::optional<ProgramBuilderPreviewDto> preview;
};

const char* to_string(ProgramBuilderUiResultCode code);

}  // namespace controller::api
