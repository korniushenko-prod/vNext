#pragma once

#include <optional>
#include <string>
#include <utility>

namespace controller::display {

enum class DisplayErrorCode {
  ok,
  display_already_registered,
  display_not_found,
  display_invalid_descriptor,
  display_no_enabled_screens,
  display_screen_unavailable,
  display_render_failed,
  display_signal_publish_failed,
  display_data_unavailable,
};

struct DisplayStatus {
  DisplayErrorCode code{DisplayErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == DisplayErrorCode::ok;
  }

  static DisplayStatus success() {
    return {};
  }

  static DisplayStatus error(DisplayErrorCode error_code, std::string detail) {
    return DisplayStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct DisplayResult {
  DisplayStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct DisplayOperationResult {
  DisplayStatus status{};

  bool ok() const {
    return status.ok();
  }
};

const char* to_string(DisplayErrorCode code);

}  // namespace controller::display
