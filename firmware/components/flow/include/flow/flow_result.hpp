#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::flow {

enum class FlowErrorCode {
  ok,
  flow_already_registered,
  flow_not_found,
  flow_invalid_descriptor,
  flow_invalid_k_factor,
  flow_invalid_mode_parameters,
  flow_pulse_source_error,
  flow_storage_read_failed,
  flow_storage_write_failed,
  flow_batch_already_active,
  flow_batch_not_active,
  flow_signal_publish_failed,
  flow_invalid_argument,
  flow_trend_unavailable,
  flow_not_initialized,
};

struct FlowStatus {
  FlowErrorCode code{FlowErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == FlowErrorCode::ok;
  }

  static FlowStatus success() {
    return {};
  }

  static FlowStatus error(const FlowErrorCode error_code, std::string detail) {
    return FlowStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct FlowResult {
  FlowStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct FlowOperationResult {
  FlowStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct FlowValidationIssue {
  FlowErrorCode code{FlowErrorCode::ok};
  std::string field;
  std::string message;
};

struct FlowValidationResult {
  FlowStatus status{};
  std::vector<FlowValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

const char* to_string(FlowErrorCode code);

}  // namespace controller::flow
