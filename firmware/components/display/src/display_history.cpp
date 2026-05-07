#include "display/display_history.hpp"

#include <utility>

#include "display/display_result.hpp"

namespace controller::display {

const char* to_string(const DisplayErrorCode code) {
  switch (code) {
    case DisplayErrorCode::ok:
      return "OK";
    case DisplayErrorCode::display_already_registered:
      return "DISPLAY_ALREADY_REGISTERED";
    case DisplayErrorCode::display_not_found:
      return "DISPLAY_NOT_FOUND";
    case DisplayErrorCode::display_invalid_descriptor:
      return "DISPLAY_INVALID_DESCRIPTOR";
    case DisplayErrorCode::display_no_enabled_screens:
      return "DISPLAY_NO_ENABLED_SCREENS";
    case DisplayErrorCode::display_screen_unavailable:
      return "DISPLAY_SCREEN_UNAVAILABLE";
    case DisplayErrorCode::display_render_failed:
      return "DISPLAY_RENDER_FAILED";
    case DisplayErrorCode::display_signal_publish_failed:
      return "DISPLAY_SIGNAL_PUBLISH_FAILED";
    case DisplayErrorCode::display_data_unavailable:
      return "DISPLAY_DATA_UNAVAILABLE";
  }

  return "DISPLAY_UNKNOWN_ERROR";
}

const char* to_string(const DisplayScreen screen) {
  switch (screen) {
    case DisplayScreen::main:
      return "main";
    case DisplayScreen::program:
      return "program";
    case DisplayScreen::flow:
      return "flow";
    case DisplayScreen::pid:
      return "pid";
    case DisplayScreen::alarms:
      return "alarms";
    case DisplayScreen::mqtt:
      return "mqtt";
  }

  return "unknown";
}

const char* to_string(const DisplayHistoryEventType event_type) {
  switch (event_type) {
    case DisplayHistoryEventType::registered:
      return "registered";
    case DisplayHistoryEventType::enabled:
      return "enabled";
    case DisplayHistoryEventType::disabled:
      return "disabled";
    case DisplayHistoryEventType::screen_selected:
      return "screen_selected";
    case DisplayHistoryEventType::screen_rotated:
      return "screen_rotated";
    case DisplayHistoryEventType::alarm_override_entered:
      return "alarm_override_entered";
    case DisplayHistoryEventType::alarm_override_cleared:
      return "alarm_override_cleared";
    case DisplayHistoryEventType::rendered:
      return "rendered";
    case DisplayHistoryEventType::render_failed:
      return "render_failed";
  }

  return "unknown";
}

DisplayHistoryBuffer::DisplayHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void DisplayHistoryBuffer::append(DisplayHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<DisplayHistoryEntry> DisplayHistoryBuffer::read() const {
  return std::vector<DisplayHistoryEntry>(entries_.begin(), entries_.end());
}

void DisplayHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t DisplayHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t DisplayHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::display
