#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::sequence {

enum class ProgramEditorIssueSeverity {
  info,
  warning,
  error,
};

enum class ProgramEditorErrorCode {
  ok,
  program_editor_invalid_draft,
  program_editor_program_not_found,
  program_editor_save_denied,
  program_editor_delete_denied,
  program_editor_data_unavailable,
};

struct ProgramEditorValidationIssue {
  std::string path;
  std::string code;
  ProgramEditorIssueSeverity severity{ProgramEditorIssueSeverity::error};
  std::string message;
};

struct ProgramEditorStatus {
  ProgramEditorErrorCode code{ProgramEditorErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == ProgramEditorErrorCode::ok;
  }

  static ProgramEditorStatus success(std::string detail = {}) {
    return ProgramEditorStatus{ProgramEditorErrorCode::ok, std::move(detail)};
  }

  static ProgramEditorStatus error(const ProgramEditorErrorCode error_code, std::string detail) {
    return ProgramEditorStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct ProgramEditorResult {
  ProgramEditorStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct ProgramEditorValidationResult {
  ProgramEditorStatus status{};
  std::vector<ProgramEditorValidationIssue> issues;

  bool has_errors() const {
    for (const auto& issue : issues) {
      if (issue.severity == ProgramEditorIssueSeverity::error) {
        return true;
      }
    }
    return false;
  }

  bool ok() const {
    return status.ok() && !has_errors();
  }
};

const char* to_string(ProgramEditorIssueSeverity severity);
const char* to_string(ProgramEditorErrorCode code);

}  // namespace controller::sequence
