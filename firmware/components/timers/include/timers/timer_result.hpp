#pragma once

#include <optional>
#include <string>
#include <utility>

namespace controller::timers {

enum class TimerErrorCode {
  ok,
  timer_already_registered,
  timer_not_found,
  timer_invalid_descriptor,
  timer_invalid_duration,
  timer_operation_unsupported,
  timer_type_mismatch,
  timer_not_armed,
  timer_already_armed,
  timer_not_active,
  timer_already_expired,
  timer_internal_state_error,
  timer_signal_publish_failed,
};

struct TimerStatus {
  TimerErrorCode code{TimerErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == TimerErrorCode::ok;
  }

  static TimerStatus success() {
    return {};
  }

  static TimerStatus error(const TimerErrorCode error_code, std::string detail) {
    return TimerStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct TimerResult {
  TimerStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct TimerOperationResult {
  TimerStatus status{};

  bool ok() const {
    return status.ok();
  }
};

const char* to_string(TimerErrorCode code);

}  // namespace controller::timers
