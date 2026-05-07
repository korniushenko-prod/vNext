#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::logic {

enum class LogicErrorCode {
  ok,
  logic_rule_already_registered,
  logic_rule_not_found,
  logic_invalid_rule,
  logic_invalid_action,
  logic_condition_evaluation_error,
  logic_output_request_failed,
  logic_timer_action_failed,
  logic_alarm_action_failed,
  logic_sequence_action_failed,
  logic_virtual_signal_write_failed,
  logic_rule_disabled,
  logic_signal_publish_failed,
};

struct LogicStatus {
  LogicErrorCode code{LogicErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == LogicErrorCode::ok;
  }

  static LogicStatus success() {
    return {};
  }

  static LogicStatus error(const LogicErrorCode error_code, std::string detail) {
    return LogicStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct LogicResult {
  LogicStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct LogicOperationResult {
  LogicStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct LogicValidationIssue {
  LogicErrorCode code{LogicErrorCode::ok};
  std::string field;
  std::string message;
};

struct LogicValidationResult {
  LogicStatus status{};
  std::vector<LogicValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

const char* to_string(LogicErrorCode code);

}  // namespace controller::logic
