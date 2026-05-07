#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "display/display_types.hpp"

namespace controller::display {

struct DisplayDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  std::size_t line_count{8U};
  std::size_t chars_per_line{21U};
  bool auto_rotate{true};
  DisplayTimestampMs rotate_interval_ms{5000U};
  bool alarm_override_enabled{true};
  std::optional<std::string> preferred_flow_id;
  std::optional<std::string> preferred_pid_id;
  std::vector<DisplayScreen> enabled_screens{
      DisplayScreen::main,
      DisplayScreen::program,
      DisplayScreen::flow,
      DisplayScreen::pid,
      DisplayScreen::alarms,
      DisplayScreen::mqtt,
  };
};

}  // namespace controller::display
