#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "hal/hal_common.hpp"

namespace controller::hal {

struct DisplayConfig {
  std::size_t line_count{2U};
  std::optional<std::size_t> line_width;
  bool initial_backlight_enabled{false};
};

class DisplayHal {
 public:
  virtual ~DisplayHal() = default;

  virtual HalStatus initialize() = 0;
  virtual HalStatus clear() = 0;
  virtual HalStatus write_line(std::size_t index, const std::string& text) = 0;
  virtual HalStatus set_backlight(bool enabled) = 0;
  virtual std::size_t line_count() const = 0;
  virtual std::optional<std::size_t> line_width() const = 0;
};

class MockDisplayHal final : public DisplayHal {
 public:
  explicit MockDisplayHal(DisplayConfig config = {});

  HalStatus initialize() override;
  HalStatus clear() override;
  HalStatus write_line(std::size_t index, const std::string& text) override;
  HalStatus set_backlight(bool enabled) override;
  std::size_t line_count() const override;
  std::optional<std::size_t> line_width() const override;

  HalResult<std::string> read_line(std::size_t index) const;
  HalResult<bool> get_backlight_enabled() const;

 private:
  HalStatus ensure_valid_index(std::size_t index) const;

  DisplayConfig config_;
  std::vector<std::string> lines_;
  bool backlight_enabled_{false};
  bool initialized_{false};
};

}  // namespace controller::hal
