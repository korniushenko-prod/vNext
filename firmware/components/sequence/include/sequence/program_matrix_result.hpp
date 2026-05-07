#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::sequence {

enum class ProgramMatrixIssueSeverity {
  info,
  warning,
  error,
};

enum class ProgramMatrixErrorCode {
  ok,
  program_matrix_invalid_argument,
  program_matrix_data_unavailable,
  program_matrix_build_failed,
};

struct ProgramMatrixIssue {
  std::string path;
  std::string code;
  ProgramMatrixIssueSeverity severity{ProgramMatrixIssueSeverity::warning};
  std::string message;
};

struct ProgramMatrixStatus {
  ProgramMatrixErrorCode code{ProgramMatrixErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == ProgramMatrixErrorCode::ok;
  }

  static ProgramMatrixStatus success(std::string detail = {}) {
    return ProgramMatrixStatus{ProgramMatrixErrorCode::ok, std::move(detail)};
  }

  static ProgramMatrixStatus error(const ProgramMatrixErrorCode error_code, std::string detail) {
    return ProgramMatrixStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct ProgramMatrixResult {
  ProgramMatrixStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct ProgramMatrixValidationResult {
  ProgramMatrixStatus status{};
  std::vector<ProgramMatrixIssue> issues;

  bool has_errors() const {
    for (const auto& issue : issues) {
      if (issue.severity == ProgramMatrixIssueSeverity::error) {
        return true;
      }
    }
    return false;
  }

  bool ok() const {
    return status.ok() && !has_errors();
  }
};

const char* to_string(ProgramMatrixIssueSeverity severity);
const char* to_string(ProgramMatrixErrorCode code);

}  // namespace controller::sequence
