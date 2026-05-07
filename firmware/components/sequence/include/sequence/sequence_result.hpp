#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::sequence {

enum class SequenceErrorCode {
  ok,
  sequence_program_already_registered,
  sequence_program_not_found,
  sequence_program_disabled,
  sequence_active_program_exists,
  sequence_invalid_program,
  sequence_invalid_state_reference,
  sequence_invalid_action,
  sequence_start_denied,
  sequence_no_active_program,
  sequence_reset_denied,
  sequence_lockout_active,
  sequence_signal_publish_failed,
  sequence_actuator_request_failed,
  sequence_timer_action_failed,
  sequence_alarm_action_failed,
  sequence_virtual_signal_write_failed,
};

struct SequenceStatus {
  SequenceErrorCode code{SequenceErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == SequenceErrorCode::ok;
  }

  static SequenceStatus success() {
    return {};
  }

  static SequenceStatus error(const SequenceErrorCode error_code, std::string detail) {
    return SequenceStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct SequenceResult {
  SequenceStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct SequenceOperationResult {
  SequenceStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct SequenceValidationIssue {
  SequenceErrorCode code{SequenceErrorCode::ok};
  std::string field;
  std::string message;
};

struct SequenceValidationResult {
  SequenceStatus status{};
  std::vector<SequenceValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

const char* to_string(SequenceErrorCode code);

}  // namespace controller::sequence
