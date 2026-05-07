#pragma once

#include <optional>
#include <string>
#include <utility>

namespace controller::api {

enum class ApiErrorCode {
  ok,
  api_program_not_found,
  api_no_active_program,
  api_program_inactive,
  api_start_denied,
  api_stop_denied,
  api_trip_denied,
  api_reset_denied,
  api_sequence_service_error,
  api_invalid_argument,
  api_history_unavailable,
  api_internal_mapping_error,
};

struct ApiStatus {
  ApiErrorCode code{ApiErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == ApiErrorCode::ok;
  }

  static ApiStatus success() {
    return {};
  }

  static ApiStatus error(const ApiErrorCode error_code, std::string detail) {
    return ApiStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct ApiResult {
  ApiStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

inline const char* to_string(const ApiErrorCode code) {
  switch (code) {
    case ApiErrorCode::ok:
      return "OK";
    case ApiErrorCode::api_program_not_found:
      return "API_PROGRAM_NOT_FOUND";
    case ApiErrorCode::api_no_active_program:
      return "API_NO_ACTIVE_PROGRAM";
    case ApiErrorCode::api_program_inactive:
      return "API_PROGRAM_INACTIVE";
    case ApiErrorCode::api_start_denied:
      return "API_START_DENIED";
    case ApiErrorCode::api_stop_denied:
      return "API_STOP_DENIED";
    case ApiErrorCode::api_trip_denied:
      return "API_TRIP_DENIED";
    case ApiErrorCode::api_reset_denied:
      return "API_RESET_DENIED";
    case ApiErrorCode::api_sequence_service_error:
      return "API_SEQUENCE_SERVICE_ERROR";
    case ApiErrorCode::api_invalid_argument:
      return "API_INVALID_ARGUMENT";
    case ApiErrorCode::api_history_unavailable:
      return "API_HISTORY_UNAVAILABLE";
    case ApiErrorCode::api_internal_mapping_error:
      return "API_INTERNAL_MAPPING_ERROR";
  }

  return "UNKNOWN_API_ERROR";
}

}  // namespace controller::api
