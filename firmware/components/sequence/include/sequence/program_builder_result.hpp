#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::sequence {

enum class ProgramBuilderIssueSeverity {
  info,
  warning,
  error,
};

enum class ProgramBuilderErrorCode {
  ok,
  builder_unsupported_skeleton,
  builder_invalid_draft,
  builder_duplicate_program_id,
  builder_data_unavailable,
  builder_generation_failed,
};

struct ProgramBuilderIssue {
  std::string path;
  std::string code;
  ProgramBuilderIssueSeverity severity{ProgramBuilderIssueSeverity::error};
  std::string message;
};

struct ProgramBuilderStatus {
  ProgramBuilderErrorCode code{ProgramBuilderErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == ProgramBuilderErrorCode::ok;
  }

  static ProgramBuilderStatus success(std::string detail = {}) {
    return ProgramBuilderStatus{ProgramBuilderErrorCode::ok, std::move(detail)};
  }

  static ProgramBuilderStatus error(const ProgramBuilderErrorCode error_code, std::string detail) {
    return ProgramBuilderStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct ProgramBuilderResult {
  ProgramBuilderStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct ProgramBuilderValidationResult {
  ProgramBuilderStatus status{};
  std::vector<ProgramBuilderIssue> issues;

  bool has_errors() const {
    for (const auto& issue : issues) {
      if (issue.severity == ProgramBuilderIssueSeverity::error) {
        return true;
      }
    }
    return false;
  }

  bool ok() const {
    return status.ok() && !has_errors();
  }
};

const char* to_string(ProgramBuilderIssueSeverity severity);
const char* to_string(ProgramBuilderErrorCode code);

}  // namespace controller::sequence
