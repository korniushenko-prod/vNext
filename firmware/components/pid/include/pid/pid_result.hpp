#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::pid {

enum class PidStatusCode {
  PID_OK,
  PID_NOT_UPDATED,
  PID_INVALID_CONFIG,
  PID_INVALID_ARGUMENT,
  PID_INPUT_INVALID,
  PID_MODE_UNSUPPORTED,
  PID_NOT_INITIALIZED,
  PID_INTERNAL_ERROR,
};

struct PidStatus {
  PidStatusCode code{PidStatusCode::PID_OK};
  std::string message;

  bool ok() const {
    return code == PidStatusCode::PID_OK;
  }

  static PidStatus success() {
    return {};
  }

  static PidStatus error(const PidStatusCode code_value, std::string detail) {
    return PidStatus{code_value, std::move(detail)};
  }
};

template <typename T>
struct PidResult {
  PidStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }

  bool has_value() const {
    return value.has_value();
  }
};

struct PidOperationResult {
  PidStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct PidValidationIssue {
  PidStatusCode code{PidStatusCode::PID_OK};
  std::string field;
  std::string message;
};

struct PidValidationResult {
  PidStatus status{};
  std::vector<PidValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

const char* to_string(PidStatusCode code);

}  // namespace controller::pid
