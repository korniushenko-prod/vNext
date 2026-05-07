#include "hal/display_hal.hpp"

#include <optional>

namespace controller::hal {

namespace {

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "MockDisplayHal is not initialized");
}

}  // namespace

MockDisplayHal::MockDisplayHal(DisplayConfig config)
    : config_(config),
      lines_(config.line_count, std::string{}),
      backlight_enabled_(config.initial_backlight_enabled) {}

HalStatus MockDisplayHal::initialize() {
  lines_.assign(config_.line_count, std::string{});
  backlight_enabled_ = config_.initial_backlight_enabled;
  initialized_ = true;
  return HalStatus::success();
}

HalStatus MockDisplayHal::clear() {
  if (!initialized_) {
    return not_initialized_status();
  }

  for (auto& line : lines_) {
    line.clear();
  }
  return HalStatus::success();
}

HalStatus MockDisplayHal::write_line(std::size_t index, const std::string& text) {
  if (!initialized_) {
    return not_initialized_status();
  }

  const auto status = ensure_valid_index(index);
  if (!status.ok()) {
    return status;
  }

  if (config_.line_width.has_value() && text.size() > config_.line_width.value()) {
    lines_[index] = text.substr(0U, config_.line_width.value());
  } else {
    lines_[index] = text;
  }
  return HalStatus::success();
}

HalStatus MockDisplayHal::set_backlight(bool enabled) {
  if (!initialized_) {
    return not_initialized_status();
  }

  backlight_enabled_ = enabled;
  return HalStatus::success();
}

std::size_t MockDisplayHal::line_count() const {
  return lines_.size();
}

std::optional<std::size_t> MockDisplayHal::line_width() const {
  return config_.line_width;
}

HalResult<std::string> MockDisplayHal::read_line(std::size_t index) const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  const auto status = ensure_valid_index(index);
  if (!status.ok()) {
    return {status, std::nullopt};
  }

  return {HalStatus::success(), lines_[index]};
}

HalResult<bool> MockDisplayHal::get_backlight_enabled() const {
  if (!initialized_) {
    return {not_initialized_status(), std::nullopt};
  }

  return {HalStatus::success(), backlight_enabled_};
}

HalStatus MockDisplayHal::ensure_valid_index(std::size_t index) const {
  if (index >= lines_.size()) {
    return HalStatus::error(HalErrorCode::invalid_range, "display line index is out of range");
  }
  return HalStatus::success();
}

}  // namespace controller::hal
