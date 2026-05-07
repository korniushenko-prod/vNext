#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::actuators {

enum class MotorErrorCode {
  ok,
  motor_already_registered,
  motor_not_found,
  motor_invalid_descriptor,
  motor_invalid_command,
  motor_reverse_not_allowed,
  motor_direction_unsupported,
  motor_fault_active,
  motor_output_request_failed,
  motor_signal_publish_failed,
  motor_signal_read_failed,
};

struct MotorStatus {
  MotorErrorCode code{MotorErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == MotorErrorCode::ok;
  }

  static MotorStatus success() {
    return {};
  }

  static MotorStatus error(const MotorErrorCode code_value, std::string detail) {
    return MotorStatus{code_value, std::move(detail)};
  }
};

template <typename T>
struct MotorResult {
  MotorStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct MotorOperationResult {
  MotorStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct MotorValidationIssue {
  MotorErrorCode code{MotorErrorCode::ok};
  std::string field;
  std::string message;
};

struct MotorValidationResult {
  MotorStatus status{};
  std::vector<MotorValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

const char* to_string(MotorErrorCode code);

}  // namespace controller::actuators
