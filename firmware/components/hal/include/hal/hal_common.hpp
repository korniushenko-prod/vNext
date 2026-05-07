#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <utility>

namespace controller::hal {

enum class HalErrorCode {
  ok,
  not_initialized,
  unknown_id,
  invalid_range,
  fault,
  write_denied,
  unsupported,
};

struct HalStatus {
  HalErrorCode code{HalErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == HalErrorCode::ok;
  }

  static HalStatus success() {
    return {};
  }

  static HalStatus error(HalErrorCode error_code, std::string detail) {
    return HalStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct HalResult {
  HalStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

enum class RelayState { off, on };

enum class SafeState { off, on, hold };

enum class InputValidity { valid, invalid, faulted };

enum class InputPolarity { active_high, active_low };

enum class StepperDirection { forward, reverse };

enum class StepperStopMode { hold, coast, emergency };

using MonotonicTimeMs = std::uint64_t;
using PwmDutyPercent = double;
using PulseCount = std::uint64_t;
using AnalogRawValue = std::int32_t;
using AnalogEngineeringValue = double;

struct AnalogScaling {
  AnalogRawValue raw_min{0};
  AnalogRawValue raw_max{100};
  AnalogEngineeringValue engineering_min{0.0};
  AnalogEngineeringValue engineering_max{100.0};
};

}  // namespace controller::hal
