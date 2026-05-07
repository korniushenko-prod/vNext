#pragma once

#include <optional>
#include <string>
#include <utility>
#include <variant>

#include "hal/pwm_hal.hpp"
#include "hal/relay_hal.hpp"
#include "signals/signal_types.hpp"

namespace controller::actuators {

enum class ActuatorTargetKind { relay, pwm };

enum class ActuatorRole {
  generic,
  fan,
  fuel,
  ignition,
  pump,
  valve,
  alarm,
  heater,
  damper,
  motor,
};

enum class ActuatorPriority {
  default_priority = 0,
  schedule = 1,
  auto_rule = 2,
  pid = 3,
  sequence = 4,
  manual = 5,
  service = 6,
  inhibit = 7,
  trip = 8,
  safety = 9,
};

enum class ActuatorErrorCode {
  ok,
  actuator_already_registered,
  actuator_not_found,
  actuator_signal_already_registered,
  invalid_target,
  invalid_request,
  invalid_range,
  request_type_mismatch,
  hal_error,
  signal_error,
};

struct ActuatorStatus {
  ActuatorErrorCode code{ActuatorErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == ActuatorErrorCode::ok;
  }

  static ActuatorStatus success() {
    return {};
  }

  static ActuatorStatus error(ActuatorErrorCode error_code, std::string detail) {
    return ActuatorStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct ActuatorResult {
  ActuatorStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct ActuatorOperationResult {
  ActuatorStatus status{};

  bool ok() const {
    return status.ok();
  }
};

const char* to_string(ActuatorTargetKind kind);
const char* to_string(ActuatorRole role);
const char* to_string(ActuatorPriority priority);
const char* to_string(ActuatorErrorCode code);

bool is_fail_safe_off_role(ActuatorRole role);

struct RelayActuatorTarget {
  std::string id;
  std::string name;
  bool enabled{true};
  ActuatorRole role{ActuatorRole::generic};
  hal::RelayState safe_state{hal::RelayState::off};
  std::optional<std::string> interlock_group;
};

struct PwmActuatorTarget {
  std::string id;
  std::string name;
  bool enabled{true};
  ActuatorRole role{ActuatorRole::generic};
  double duty_min{0.0};
  double duty_max{100.0};
  double duty_safe{0.0};
};

struct RelayActuatorCommand {
  hal::RelayState state{hal::RelayState::off};
};

struct PwmActuatorCommand {
  double duty_percent{0.0};
  bool enabled{false};
};

using ActuatorCommand = std::variant<RelayActuatorCommand, PwmActuatorCommand>;

struct ActuatorRequest {
  std::string target_id;
  std::string owner;
  std::string reason;
  ActuatorPriority priority{ActuatorPriority::default_priority};
  signals::SignalTimestampMs issued_at_ms{0U};
  std::optional<signals::SignalTimestampMs> expires_at_ms;
  ActuatorCommand command{RelayActuatorCommand{}};
};

struct RelayEffectiveState {
  hal::RelayState state{hal::RelayState::off};
};

struct PwmEffectiveState {
  double duty_percent{0.0};
  bool enabled{false};
};

using ActuatorEffectiveState = std::variant<RelayEffectiveState, PwmEffectiveState>;

struct ActuatorSnapshot {
  std::string target_id;
  ActuatorTargetKind kind{ActuatorTargetKind::relay};
  ActuatorRole role{ActuatorRole::generic};
  ActuatorPriority priority{ActuatorPriority::default_priority};
  std::string owner;
  std::string reason;
  bool safe_fallback{true};
  bool interlock_blocked{false};
  ActuatorEffectiveState effective{RelayEffectiveState{}};
};

}  // namespace controller::actuators
