#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace controller::actuators {

enum class StepperErrorCode {
  ok,
  stepper_already_registered,
  stepper_not_found,
  stepper_invalid_descriptor,
  stepper_invalid_command,
  stepper_home_unsupported,
  stepper_homing_required,
  stepper_fault_active,
  stepper_target_out_of_range,
  stepper_signal_read_failed,
  stepper_signal_publish_failed,
  stepper_hal_command_failed,
};

struct StepperStatus {
  StepperErrorCode code{StepperErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == StepperErrorCode::ok;
  }

  static StepperStatus success() {
    return {};
  }

  static StepperStatus error(const StepperErrorCode code_value, std::string detail) {
    return StepperStatus{code_value, std::move(detail)};
  }
};

template <typename T>
struct StepperResult {
  StepperStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct StepperOperationResult {
  StepperStatus status{};

  bool ok() const {
    return status.ok();
  }
};

struct StepperValidationIssue {
  StepperErrorCode code{StepperErrorCode::ok};
  std::string field;
  std::string message;
};

struct StepperValidationResult {
  StepperStatus status{};
  std::vector<StepperValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

const char* to_string(StepperErrorCode code);

}  // namespace controller::actuators
