#pragma once

#include <optional>
#include <string>
#include <utility>

namespace controller::alarms {

enum class AlarmErrorCode {
  ok,
  alarm_already_registered,
  alarm_not_found,
  alarm_invalid_descriptor,
  alarm_invalid_severity,
  alarm_reset_denied,
  alarm_already_active,
  alarm_already_inactive,
  alarm_signal_publish_failed,
  alarm_history_full,
  alarm_operation_unsupported,
};

struct AlarmStatus {
  AlarmErrorCode code{AlarmErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == AlarmErrorCode::ok;
  }

  static AlarmStatus success() {
    return {};
  }

  static AlarmStatus error(AlarmErrorCode error_code, std::string detail) {
    return AlarmStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct AlarmResult {
  AlarmStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct AlarmOperationResult {
  AlarmStatus status{};

  bool ok() const {
    return status.ok();
  }
};

const char* to_string(AlarmErrorCode code);

}  // namespace controller::alarms
