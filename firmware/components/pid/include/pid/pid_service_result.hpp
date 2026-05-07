#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::pid {

enum class PidServiceErrorCode {
  ok,
  pid_service_already_registered,
  pid_service_not_found,
  pid_service_invalid_descriptor,
  pid_service_invalid_argument,
  pid_service_unsupported_target,
  pid_service_signal_error,
  pid_service_signal_type_error,
  pid_service_signal_not_found,
  pid_service_fault_active,
  pid_service_output_request_failed,
  pid_service_signal_publish_failed,
};

struct PidServiceStatus {
  PidServiceErrorCode code{PidServiceErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == PidServiceErrorCode::ok;
  }

  static PidServiceStatus success() {
    return {};
  }

  static PidServiceStatus error(const PidServiceErrorCode code_value, std::string detail) {
    return PidServiceStatus{code_value, std::move(detail)};
  }
};

template <typename T>
struct PidServiceResult {
  PidServiceStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct PidServiceOperationResult {
  PidServiceStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct PidServiceValidationIssue {
  PidServiceErrorCode code{PidServiceErrorCode::ok};
  std::string field;
  std::string message;
};

struct PidServiceValidationResult {
  PidServiceStatus status{};
  std::vector<PidServiceValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

const char* to_string(PidServiceErrorCode code);

}  // namespace controller::pid
