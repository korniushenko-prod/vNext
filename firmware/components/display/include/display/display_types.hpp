#pragma once

#include <cstdint>

namespace controller::display {

using DisplayTimestampMs = std::uint64_t;
using DisplayUpdateCounter = std::uint64_t;
using DisplayHistorySequenceNumber = std::uint64_t;

enum class DisplayScreen {
  main,
  program,
  flow,
  pid,
  alarms,
  mqtt,
};

enum class DisplayHistoryEventType {
  registered,
  enabled,
  disabled,
  screen_selected,
  screen_rotated,
  alarm_override_entered,
  alarm_override_cleared,
  rendered,
  render_failed,
};

const char* to_string(DisplayScreen screen);
const char* to_string(DisplayHistoryEventType event_type);

}  // namespace controller::display
