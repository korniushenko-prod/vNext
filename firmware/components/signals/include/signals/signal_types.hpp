#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <utility>

namespace controller::signals {

using SignalTimestampMs = std::uint64_t;
using SignalUpdateCounter = std::uint64_t;

enum class SignalType {
  boolean,
  int64,
  float64,
  string,
};

enum class SignalAccessMode {
  read_only,
  writable_virtual,
};

enum class SignalErrorCode {
  ok,
  signal_already_registered,
  signal_not_found,
  signal_type_mismatch,
  signal_write_denied,
  signal_not_initialized,
  signal_invalid_descriptor,
  signal_invalid_path,
};

struct SignalStatus {
  SignalErrorCode code{SignalErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == SignalErrorCode::ok;
  }

  static SignalStatus success() {
    return {};
  }

  static SignalStatus error(SignalErrorCode error_code, std::string detail) {
    return SignalStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct SignalResult {
  SignalStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct SignalOperationResult {
  SignalStatus status{};

  bool ok() const {
    return status.ok();
  }
};

bool is_supported_signal_type(SignalType type);
bool is_supported_access_mode(SignalAccessMode mode);
const char* to_string(SignalType type);
const char* to_string(SignalAccessMode mode);
const char* to_string(SignalErrorCode code);

}  // namespace controller::signals
