#pragma once

#include <string>

#include "display/display_types.hpp"

namespace controller::display {

struct DisplaySnapshot {
  std::string id;
  bool enabled{true};
  DisplayScreen current_screen{DisplayScreen::main};
  bool alarm_override_active{false};
  bool auto_rotate{false};
  DisplayTimestampMs rotate_interval_ms{0U};
  DisplayTimestampMs last_render_ms{0U};
  DisplayTimestampMs last_screen_change_ms{0U};
  std::string last_reason;
  DisplayUpdateCounter update_counter{0U};
};

}  // namespace controller::display
