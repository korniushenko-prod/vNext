#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "display/display_types.hpp"

namespace controller::display {

struct DisplayFrame {
  std::string display_id;
  DisplayScreen screen{DisplayScreen::main};
  std::string title;
  std::vector<std::string> lines;
  std::optional<std::string> footer;
  std::optional<std::size_t> highlighted_row;
  bool alarm_override_active{false};
  DisplayTimestampMs build_timestamp_ms{0U};
  std::optional<std::string> warning;
};

}  // namespace controller::display
