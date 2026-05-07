#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/api_types.hpp"
#include "sequence/program_editor_types.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::api {

enum class ProgramEditorUiResultCode {
  program_editor_ok,
  program_editor_program_not_found,
  program_editor_save_denied,
  program_editor_delete_denied,
  program_editor_enable_denied,
  program_editor_disable_denied,
  program_editor_invalid_argument,
  program_editor_validation_failed,
  program_editor_data_unavailable,
};

using ProgramEditorDraftDto = controller::sequence::ProgramEditorDraft;
using ProgramEditorCatalogDto = controller::sequence::ProgramEditorCatalog;
using ProgramEditorPreviewDto = controller::sequence::ProgramEditorPreview;
using ProgramEditorValidationDto = controller::sequence::ProgramEditorValidationResult;
using ProgramEditorIssueDto = controller::sequence::ProgramEditorValidationIssue;

struct ProgramEditorUiStatus {
  ProgramEditorUiResultCode code{ProgramEditorUiResultCode::program_editor_ok};
  std::string message;
  std::vector<ProgramEditorIssueDto> validation_issues;

  bool ok() const {
    return code == ProgramEditorUiResultCode::program_editor_ok;
  }

  static ProgramEditorUiStatus success(std::string detail = {}) {
    return ProgramEditorUiStatus{ProgramEditorUiResultCode::program_editor_ok, std::move(detail), {}};
  }

  static ProgramEditorUiStatus error(
      const ProgramEditorUiResultCode error_code,
      std::string detail,
      std::vector<ProgramEditorIssueDto> issues = {}) {
    return ProgramEditorUiStatus{error_code, std::move(detail), std::move(issues)};
  }
};

template <typename T>
struct ProgramEditorUiResult {
  ProgramEditorUiStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct ProgramEditorProgramListItemDto {
  std::string id;
  std::string name;
  controller::sequence::SequenceProgramType type{controller::sequence::SequenceProgramType::custom};
  bool enabled{false};
  bool active{false};
  bool runtime_editable{true};
};

struct ProgramEditorRuntimeTransitionCandidateDto {
  std::string transition_id;
  std::string target_state_id;
  bool eligible{false};
  std::string reason;
  bool min_time_satisfied{true};
  std::optional<bool> condition_effective_result;
};

struct ProgramEditorRuntimeStatusDto {
  std::string program_id;
  bool active{false};
  bool runtime_editable{true};
  controller::sequence::SequenceLifecycle lifecycle{controller::sequence::SequenceLifecycle::idle};
  std::optional<std::string> current_state_id;
  std::optional<std::string> previous_state_id;
  controller::sequence::SequenceDurationMs state_elapsed_ms{0U};
  bool pending_normal_stop{false};
  bool pending_trip{false};
  bool lockout{false};
  std::string last_reason;
  std::vector<ProgramEditorRuntimeTransitionCandidateDto> transition_candidates;
};

struct ProgramEditorLoadDto {
  ProgramEditorProgramListItemDto summary;
  ProgramEditorDraftDto draft;
  ProgramEditorRuntimeStatusDto runtime_status;
  ProgramEditorPreviewDto baseline_preview;
  bool runtime_editable{true};
};

struct ProgramEditorMutationResult {
  bool accepted{false};
  ProgramEditorUiStatus status{};
  std::optional<std::string> program_id;
  std::optional<ProgramEditorLoadDto> editor;
  std::optional<std::vector<ProgramEditorProgramListItemDto>> program_list;
};

const char* to_string(ProgramEditorUiResultCode code);

}  // namespace controller::api
