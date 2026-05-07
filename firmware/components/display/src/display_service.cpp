#include "display/display_service.hpp"

#include <algorithm>
#include <array>
#include <cctype>
#include <cstdint>
#include <iomanip>
#include <limits>
#include <optional>
#include <sstream>
#include <utility>

#include "alarms/alarm_service.hpp"
#include "alarms/alarm_snapshot.hpp"
#include "alarms/alarm_types.hpp"
#ifndef CONTROLLER_STAGE27_MINIMAL_DISPLAY
#include "api/flow_api_service.hpp"
#include "api/flow_api_types.hpp"
#endif
#include "api/sequence_api_service.hpp"
#include "api/sequence_api_types.hpp"
#ifndef CONTROLLER_STAGE27_MINIMAL_DISPLAY
#include "mqtt/mqtt_service.hpp"
#include "mqtt/mqtt_types.hpp"
#include "pid/pid_service.hpp"
#include "pid/pid_service_snapshot.hpp"
#endif
#include "sequence/sequence_types.hpp"
#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::display {

namespace {

using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::signals::SignalValue;

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](const unsigned char ch) {
    return !std::isspace(ch);
  });
}

std::int64_t to_signal_int64(const std::uint64_t value) {
  constexpr auto max_value = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

std::string compact_double(const double value, const int precision = 1) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(precision) << value;
  auto text = stream.str();
  while (!text.empty() && text.back() == '0') {
    text.pop_back();
  }
  if (!text.empty() && text.back() == '.') {
    text.pop_back();
  }
  return text.empty() ? "0" : text;
}

std::string format_duration_ms(const DisplayTimestampMs value_ms) {
  if (value_ms >= 60000U) {
    return compact_double(static_cast<double>(value_ms) / 60000.0, 1) + "m";
  }
  if (value_ms >= 1000U) {
    return compact_double(static_cast<double>(value_ms) / 1000.0, 1) + "s";
  }
  return std::to_string(value_ms) + "ms";
}

std::string join_two(std::string left, const std::string& right, const std::string& separator = " ") {
  if (left.empty()) {
    return right;
  }
  if (right.empty()) {
    return left;
  }
  left += separator;
  left += right;
  return left;
}

[[maybe_unused]] std::string severity_summary(const controller::alarms::AggregateAlarmStatus& aggregate) {
  if (!aggregate.any_active) {
    return "No alarms";
  }

  std::string summary = std::to_string(aggregate.active_count);
  if (aggregate.highest_severity.has_value()) {
    summary = join_two(std::move(summary), controller::alarms::to_string(*aggregate.highest_severity));
  }
  return summary;
}

std::string severity_summary(const controller::api::AlarmSummaryDto& aggregate) {
  if (!aggregate.any_active) {
    return "No alarms";
  }

  std::string summary = std::to_string(aggregate.active_count);
  if (aggregate.highest_severity.has_value()) {
    summary = join_two(std::move(summary), controller::alarms::to_string(*aggregate.highest_severity));
  }
  return summary;
}

std::string program_name_or_id(const controller::api::ProgramStatusDto& status) {
  if (has_text(status.name)) {
    return status.name;
  }
  return status.program_id.value_or("Program");
}

[[maybe_unused]] std::string bool_marker(const bool value, const char true_marker, const char false_marker) {
  return std::string(1U, value ? true_marker : false_marker);
}

DisplayScreen default_screen() {
  return DisplayScreen::main;
}

SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type) {
  return SignalDescriptor{
      path,
      name,
      "Display service runtime signal",
      type,
      "",
      "display_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

DisplayStatus wrap_signal_error(const controller::signals::SignalStatus& status, const std::string& context) {
  return DisplayStatus::error(
      DisplayErrorCode::display_signal_publish_failed,
      context + ": " + status.message);
}

DisplayStatus register_signal_if_missing(
    controller::signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const DisplayTimestampMs now_ms) {
  if (registry.has_signal(descriptor.path)) {
    return DisplayStatus::success();
  }

  const auto result = registry.register_signal(descriptor, initial_value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to register signal '" + descriptor.path + "'");
  }
  return DisplayStatus::success();
}

DisplayStatus update_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const SignalValue& value,
    const DisplayTimestampMs now_ms) {
  const auto result = registry.update_signal(path, value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to update signal '" + path + "'");
  }
  return DisplayStatus::success();
}

}  // namespace

DisplayService::DisplayService(
    controller::hal::DisplayHal& display_hal,
    controller::signals::SignalRegistry& signal_registry,
    const std::size_t history_capacity)
    : display_hal_(display_hal),
      signal_registry_(signal_registry),
      history_(history_capacity) {}

void DisplayService::bind_sequence_api(controller::api::SequenceApiService& sequence_api) {
  sequence_api_ = &sequence_api;
}

void DisplayService::bind_flow_api(controller::api::FlowApiService& flow_api) {
  flow_api_ = &flow_api;
}

void DisplayService::bind_pid_service(controller::pid::PidService& pid_service) {
  pid_service_ = &pid_service;
}

void DisplayService::bind_alarm_service(controller::alarms::AlarmService& alarm_service) {
  alarm_service_ = &alarm_service;
}

void DisplayService::bind_mqtt_service(controller::mqtt::MqttService& mqtt_service) {
  mqtt_service_ = &mqtt_service;
}

DisplayStatus DisplayService::validate_descriptor(const DisplayDescriptor& descriptor) const {
  if (!has_text(descriptor.id)) {
    return DisplayStatus::error(DisplayErrorCode::display_invalid_descriptor, "Display id must not be empty.");
  }
  if (!controller::signals::is_valid_signal_path(descriptor.id)) {
    return DisplayStatus::error(
        DisplayErrorCode::display_invalid_descriptor,
        "Display id '" + descriptor.id + "' must be a valid dot-separated signal-style id.");
  }
  if (!has_text(descriptor.name)) {
    return DisplayStatus::error(DisplayErrorCode::display_invalid_descriptor, "Display name must not be empty.");
  }
  if (descriptor.line_count == 0U) {
    return DisplayStatus::error(DisplayErrorCode::display_invalid_descriptor, "Display line_count must be greater than zero.");
  }
  if (descriptor.chars_per_line == 0U) {
    return DisplayStatus::error(
        DisplayErrorCode::display_invalid_descriptor,
        "Display chars_per_line must be greater than zero.");
  }
  if (descriptor.auto_rotate && descriptor.rotate_interval_ms == 0U) {
    return DisplayStatus::error(
        DisplayErrorCode::display_invalid_descriptor,
        "Display rotate_interval_ms must be greater than zero when auto_rotate is enabled.");
  }
  return DisplayStatus::success();
}

std::vector<DisplayScreen> DisplayService::enabled_screens_for(const DisplayDescriptor& descriptor) const {
  std::vector<DisplayScreen> screens;
  std::array<bool, 6U> seen{false, false, false, false, false, false};

  auto append_unique = [&](const DisplayScreen screen) {
    const auto index = static_cast<std::size_t>(screen);
    if (index < seen.size() && !seen[index]) {
      seen[index] = true;
      screens.push_back(screen);
    }
  };

  for (const auto screen : descriptor.enabled_screens) {
    append_unique(screen);
  }

  return screens;
}

std::optional<DisplayScreen> DisplayService::choose_next_screen(
    const std::vector<DisplayScreen>& screens,
    const DisplayScreen current,
    const bool forward,
    const std::size_t steps) const {
  if (screens.empty()) {
    return std::nullopt;
  }

  const auto current_it = std::find(screens.begin(), screens.end(), current);
  if (current_it == screens.end()) {
    return screens.front();
  }

  const std::size_t size = screens.size();
  const std::size_t current_index = static_cast<std::size_t>(std::distance(screens.begin(), current_it));
  const std::size_t offset = steps % size;
  const std::size_t next_index =
      forward ? (current_index + offset) % size : (current_index + size - offset) % size;
  return screens[next_index];
}

DisplayOperationResult DisplayService::register_display(const DisplayDescriptor& descriptor) {
  if (displays_by_id_.count(descriptor.id) != 0U) {
    return {DisplayStatus::error(
        DisplayErrorCode::display_already_registered,
        "Display '" + descriptor.id + "' is already registered.")};
  }

  const auto validation = validate_descriptor(descriptor);
  if (!validation.ok()) {
    return {validation};
  }

  DisplayRecord record;
  record.descriptor = descriptor;
  record.snapshot.id = descriptor.id;
  record.snapshot.enabled = descriptor.enabled;
  record.snapshot.auto_rotate = descriptor.auto_rotate;
  record.snapshot.rotate_interval_ms = descriptor.rotate_interval_ms;
  record.snapshot.current_screen = default_screen();
  record.snapshot.last_reason = "display_registered";
  record.snapshot.update_counter = 1U;

  const auto screens = enabled_screens_for(descriptor);
  if (!screens.empty()) {
    record.selected_screen = screens.front();
    record.snapshot.current_screen = screens.front();
  }

  const auto signal_status = ensure_display_signals_registered(descriptor);
  if (!signal_status.ok()) {
    return {signal_status};
  }

  displays_by_id_.emplace(descriptor.id, record);
  display_order_.push_back(descriptor.id);
  record_history(descriptor.id, DisplayHistoryEventType::registered, 0U, "display_service", "registered");

  auto& stored = displays_by_id_.at(descriptor.id);
  const auto publish_status = publish_snapshot_signals(stored, 0U);
  if (!publish_status.ok()) {
    displays_by_id_.erase(descriptor.id);
    display_order_.pop_back();
    return {publish_status};
  }

  return {DisplayStatus::success()};
}

bool DisplayService::has_display(const std::string& id) const {
  return displays_by_id_.count(id) != 0U;
}

DisplayResult<DisplayDescriptor> DisplayService::get_descriptor(const std::string& id) const {
  DisplayResult<DisplayDescriptor> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.");
    return result;
  }

  result.status = DisplayStatus::success();
  result.value = record->descriptor;
  return result;
}

std::vector<DisplayDescriptor> DisplayService::list_descriptors() const {
  std::vector<DisplayDescriptor> descriptors;
  descriptors.reserve(display_order_.size());
  for (const auto& id : display_order_) {
    descriptors.push_back(displays_by_id_.at(id).descriptor);
  }
  return descriptors;
}

DisplayOperationResult DisplayService::set_enabled(const std::string& id, const bool enabled, const DisplayTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.")};
  }

  if (record->descriptor.enabled != enabled) {
    record->descriptor.enabled = enabled;
    record->snapshot.enabled = enabled;
    record->snapshot.last_reason = enabled ? "display_enabled" : "display_disabled";
    ++record->snapshot.update_counter;
    record_history(
        id,
        enabled ? DisplayHistoryEventType::enabled : DisplayHistoryEventType::disabled,
        now_ms,
        "display_service",
        record->snapshot.last_reason);
  }

  const auto publish_status = publish_snapshot_signals(*record, now_ms);
  if (!publish_status.ok()) {
    return {publish_status};
  }

  return {DisplayStatus::success()};
}

DisplayOperationResult DisplayService::set_auto_rotate(
    const std::string& id,
    const bool enabled,
    const DisplayTimestampMs now_ms) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.")};
  }

  record->descriptor.auto_rotate = enabled;
  record->snapshot.auto_rotate = enabled;
  record->snapshot.last_reason = enabled ? "auto_rotate_enabled" : "auto_rotate_disabled";
  ++record->snapshot.update_counter;

  const auto publish_status = publish_snapshot_signals(*record, now_ms);
  if (!publish_status.ok()) {
    return {publish_status};
  }

  return {DisplayStatus::success()};
}

DisplayOperationResult DisplayService::select_screen(
    const std::string& id,
    const DisplayScreen screen,
    const DisplayTimestampMs now_ms,
    std::string source,
    std::string reason) {
  auto* record = find_record(id);
  if (record == nullptr) {
    return {DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.")};
  }

  const auto screens = enabled_screens_for(record->descriptor);
  if (screens.empty()) {
    return {DisplayStatus::error(DisplayErrorCode::display_no_enabled_screens, "Display '" + id + "' has no enabled screens.")};
  }
  if (std::find(screens.begin(), screens.end(), screen) == screens.end()) {
    return {DisplayStatus::error(
        DisplayErrorCode::display_screen_unavailable,
        "Screen '" + std::string(to_string(screen)) + "' is not enabled for display '" + id + "'.")};
  }

  const auto previous_selected = record->selected_screen;
  record->selected_screen = screen;
  if (!record->snapshot.alarm_override_active) {
    record->snapshot.current_screen = screen;
  }
  record->snapshot.last_screen_change_ms = now_ms;
  record->snapshot.last_reason = has_text(reason) ? std::move(reason) : "screen_selected";
  ++record->snapshot.update_counter;
  record_history(
      id,
      DisplayHistoryEventType::screen_selected,
      now_ms,
      has_text(source) ? std::move(source) : "display_service",
      record->snapshot.last_reason,
      previous_selected,
      screen);

  const auto publish_status = publish_snapshot_signals(*record, now_ms);
  if (!publish_status.ok()) {
    return {publish_status};
  }

  return {DisplayStatus::success()};
}

DisplayOperationResult DisplayService::next_screen(
    const std::string& id,
    const DisplayTimestampMs now_ms,
    std::string source,
    std::string reason) {
  const auto* record = find_record(id);
  if (record == nullptr) {
    return {DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.")};
  }

  const auto screens = enabled_screens_for(record->descriptor);
  if (screens.empty()) {
    return {DisplayStatus::error(DisplayErrorCode::display_no_enabled_screens, "Display '" + id + "' has no enabled screens.")};
  }

  return select_screen(id, choose_next_screen(screens, record->selected_screen, true).value_or(screens.front()), now_ms, std::move(source), std::move(reason));
}

DisplayOperationResult DisplayService::previous_screen(
    const std::string& id,
    const DisplayTimestampMs now_ms,
    std::string source,
    std::string reason) {
  const auto* record = find_record(id);
  if (record == nullptr) {
    return {DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.")};
  }

  const auto screens = enabled_screens_for(record->descriptor);
  if (screens.empty()) {
    return {DisplayStatus::error(DisplayErrorCode::display_no_enabled_screens, "Display '" + id + "' has no enabled screens.")};
  }

  return select_screen(id, choose_next_screen(screens, record->selected_screen, false).value_or(screens.front()), now_ms, std::move(source), std::move(reason));
}

DisplayOperationResult DisplayService::tick(const DisplayTimestampMs now_ms) {
  DisplayStatus first_error = DisplayStatus::success();

  for (const auto& id : display_order_) {
    auto& record = displays_by_id_.at(id);

    if (!record.descriptor.enabled) {
      const auto publish_status = publish_snapshot_signals(record, now_ms);
      if (!publish_status.ok() && first_error.ok()) {
        first_error = publish_status;
      }
      continue;
    }

    const auto screens = enabled_screens_for(record.descriptor);
    if (screens.empty()) {
      record.snapshot.last_reason = "no_enabled_screens";
      ++record.snapshot.update_counter;
      record_history(id, DisplayHistoryEventType::render_failed, now_ms, "display_service", record.snapshot.last_reason);
      const auto publish_status = publish_snapshot_signals(record, now_ms);
      if (!publish_status.ok() && first_error.ok()) {
        first_error = publish_status;
      }
      if (first_error.ok()) {
        first_error = DisplayStatus::error(
            DisplayErrorCode::display_no_enabled_screens,
            "Display '" + id + "' has no enabled screens.");
      }
      continue;
    }

    if (std::find(screens.begin(), screens.end(), record.selected_screen) == screens.end()) {
      record.selected_screen = screens.front();
    }

    if (record.descriptor.auto_rotate && !record.snapshot.alarm_override_active && record.descriptor.rotate_interval_ms > 0U) {
      if (now_ms >= record.snapshot.last_screen_change_ms + record.descriptor.rotate_interval_ms) {
        const auto elapsed = now_ms - record.snapshot.last_screen_change_ms;
        const auto steps = static_cast<std::size_t>(elapsed / record.descriptor.rotate_interval_ms);
        const auto next = choose_next_screen(screens, record.selected_screen, true, steps);
        if (next.has_value() && *next != record.selected_screen) {
          const auto previous = record.selected_screen;
          record.selected_screen = *next;
          record.snapshot.current_screen = *next;
          record.snapshot.last_screen_change_ms = now_ms;
          record.snapshot.last_reason = "screen_rotated";
          ++record.snapshot.update_counter;
          record_history(
              id,
              DisplayHistoryEventType::screen_rotated,
              now_ms,
              "display_service",
              record.snapshot.last_reason,
              previous,
              *next);
        }
      }
    }

    const auto previous_actual = record.snapshot.current_screen;
    const auto aggregate =
        alarm_service_ != nullptr ? alarm_service_->get_aggregate_status() : controller::alarms::AggregateAlarmStatus{};
    const bool override_active =
        record.descriptor.alarm_override_enabled && (aggregate.trip_active || aggregate.safety_active);

    if (override_active && !record.snapshot.alarm_override_active) {
      record.snapshot.alarm_override_active = true;
      record.snapshot.current_screen = DisplayScreen::alarms;
      record.snapshot.last_screen_change_ms = now_ms;
      record.snapshot.last_reason = "alarm_override_entered";
      ++record.snapshot.update_counter;
      record_history(
          id,
          DisplayHistoryEventType::alarm_override_entered,
          now_ms,
          "alarm_service",
          aggregate.highest_severity_alarm_id.value_or("alarm_override"),
          previous_actual,
          DisplayScreen::alarms);
    } else if (!override_active && record.snapshot.alarm_override_active) {
      record.snapshot.alarm_override_active = false;
      record.snapshot.current_screen = record.selected_screen;
      record.snapshot.last_screen_change_ms = now_ms;
      record.snapshot.last_reason = "alarm_override_cleared";
      ++record.snapshot.update_counter;
      record_history(
          id,
          DisplayHistoryEventType::alarm_override_cleared,
          now_ms,
          "alarm_service",
          "alarm_override_cleared",
          DisplayScreen::alarms,
          record.selected_screen);
    } else if (!record.snapshot.alarm_override_active) {
      record.snapshot.current_screen = record.selected_screen;
    }

    const auto effective_screen = record.snapshot.alarm_override_active ? DisplayScreen::alarms : record.selected_screen;
    auto build_result = build_frame(record, effective_screen, now_ms);
    build_result.frame.alarm_override_active = record.snapshot.alarm_override_active;
    build_result.frame = normalize_frame(record.descriptor, std::move(build_result.frame));
    if (display_hal_.line_count() < record.descriptor.line_count && !build_result.frame.warning.has_value()) {
      build_result.frame.warning =
          "HAL rows " + std::to_string(display_hal_.line_count()) + "/" + std::to_string(record.descriptor.line_count);
    }
    const auto hal_width = display_hal_.line_width();
    if (hal_width.has_value() && hal_width.value() < record.descriptor.chars_per_line && !build_result.frame.warning.has_value()) {
      build_result.frame.warning =
          "HAL cols " + std::to_string(hal_width.value()) + "/" + std::to_string(record.descriptor.chars_per_line);
    }
    record.current_frame = build_result.frame;

    const auto render_status = render_frame(record.descriptor, *record.current_frame);
    if (!render_status.ok()) {
      record.snapshot.last_reason = render_status.message;
      ++record.snapshot.update_counter;
      record_history(id, DisplayHistoryEventType::render_failed, now_ms, "display_hal", render_status.message);
      const auto publish_status = publish_snapshot_signals(record, now_ms);
      if (!publish_status.ok() && first_error.ok()) {
        first_error = publish_status;
      }
      if (first_error.ok()) {
        first_error = render_status;
      }
      continue;
    }

    record.snapshot.last_render_ms = now_ms;
    record.snapshot.last_reason = build_result.status.ok()
                                      ? record.current_frame->warning.value_or("rendered")
                                      : build_result.status.message;
    ++record.snapshot.update_counter;
    record_history(id, DisplayHistoryEventType::rendered, now_ms, "display_service", record.snapshot.last_reason);

    if (!build_result.status.ok() && first_error.ok()) {
      first_error = build_result.status;
    }

    const auto publish_status = publish_snapshot_signals(record, now_ms);
    if (!publish_status.ok() && first_error.ok()) {
      first_error = publish_status;
    }
  }

  return {first_error};
}

DisplayResult<DisplaySnapshot> DisplayService::get_snapshot(const std::string& id) const {
  DisplayResult<DisplaySnapshot> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.");
    return result;
  }

  result.status = DisplayStatus::success();
  result.value = record->snapshot;
  return result;
}

DisplayResult<DisplayFrame> DisplayService::get_current_frame(const std::string& id) const {
  DisplayResult<DisplayFrame> result;
  const auto* record = find_record(id);
  if (record == nullptr) {
    result.status = DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + id + "' is not registered.");
    return result;
  }
  if (!record->current_frame.has_value()) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "Display '" + id + "' has not produced a frame yet.");
    return result;
  }

  result.status = DisplayStatus::success();
  result.value = *record->current_frame;
  return result;
}

std::vector<DisplayFrame> DisplayService::list_frames() const {
  std::vector<DisplayFrame> frames;
  for (const auto& id : display_order_) {
    const auto& record = displays_by_id_.at(id);
    if (record.current_frame.has_value()) {
      frames.push_back(*record.current_frame);
    }
  }
  return frames;
}

DisplayResult<std::vector<DisplayHistoryEntry>> DisplayService::read_history(const std::optional<std::string> id) const {
  DisplayResult<std::vector<DisplayHistoryEntry>> result;
  if (id.has_value() && !has_display(*id)) {
    result.status = DisplayStatus::error(DisplayErrorCode::display_not_found, "Display '" + *id + "' is not registered.");
    return result;
  }

  const auto entries = history_.read();
  if (!id.has_value()) {
    result.status = DisplayStatus::success();
    result.value = entries;
    return result;
  }

  std::vector<DisplayHistoryEntry> filtered;
  for (const auto& entry : entries) {
    if (entry.display_id == *id) {
      filtered.push_back(entry);
    }
  }

  result.status = DisplayStatus::success();
  result.value = std::move(filtered);
  return result;
}

void DisplayService::clear_history() {
  history_.clear();
}

DisplayService::DisplayRecord* DisplayService::find_record(const std::string& id) {
  const auto it = displays_by_id_.find(id);
  return it == displays_by_id_.end() ? nullptr : &it->second;
}

const DisplayService::DisplayRecord* DisplayService::find_record(const std::string& id) const {
  const auto it = displays_by_id_.find(id);
  return it == displays_by_id_.end() ? nullptr : &it->second;
}

DisplayStatus DisplayService::ensure_display_signals_registered(const DisplayDescriptor& descriptor) {
  const std::string base = "display." + descriptor.id;

  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".enabled", descriptor.name + " enabled", SignalType::boolean),
      SignalValue{descriptor.enabled},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".current_screen", descriptor.name + " current screen", SignalType::string),
      SignalValue{std::string(to_string(default_screen()))},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".alarm_override_active", descriptor.name + " alarm override", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".auto_rotate", descriptor.name + " auto rotate", SignalType::boolean),
      SignalValue{descriptor.auto_rotate},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_render_ms", descriptor.name + " last render", SignalType::int64),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_reason", descriptor.name + " last reason", SignalType::string),
      SignalValue{std::string{}},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".update_counter", descriptor.name + " update counter", SignalType::int64),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return status;
  }

  return DisplayStatus::success();
}

DisplayStatus DisplayService::publish_snapshot_signals(const DisplayRecord& record, const DisplayTimestampMs now_ms) {
  const std::string base = "display." + record.descriptor.id;

  auto status = update_signal(signal_registry_, base + ".enabled", SignalValue{record.snapshot.enabled}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(
      signal_registry_,
      base + ".current_screen",
      SignalValue{std::string(to_string(record.snapshot.current_screen))},
      now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(
      signal_registry_,
      base + ".alarm_override_active",
      SignalValue{record.snapshot.alarm_override_active},
      now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".auto_rotate", SignalValue{record.snapshot.auto_rotate}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(
      signal_registry_,
      base + ".last_render_ms",
      SignalValue{to_signal_int64(record.snapshot.last_render_ms)},
      now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(signal_registry_, base + ".last_reason", SignalValue{record.snapshot.last_reason}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(
      signal_registry_,
      base + ".update_counter",
      SignalValue{to_signal_int64(record.snapshot.update_counter)},
      now_ms);
  if (!status.ok()) {
    return status;
  }

  return DisplayStatus::success();
}

void DisplayService::record_history(
    const std::string& display_id,
    const DisplayHistoryEventType event_type,
    const DisplayTimestampMs now_ms,
    std::string source,
    std::string reason,
    const std::optional<DisplayScreen> from_screen,
    const std::optional<DisplayScreen> to_screen) {
  history_.append(DisplayHistoryEntry{
      0U,
      display_id,
      event_type,
      now_ms,
      std::move(source),
      std::move(reason),
      from_screen,
      to_screen,
  });
}

DisplayFrame DisplayService::normalize_frame(const DisplayDescriptor& descriptor, DisplayFrame frame) const {
  auto truncate = [&](std::string text) {
    if (text.size() > descriptor.chars_per_line) {
      text.resize(descriptor.chars_per_line);
    }
    return text;
  };

  frame.title = truncate(std::move(frame.title));
  for (auto& line : frame.lines) {
    line = truncate(std::move(line));
  }
  if (frame.footer.has_value()) {
    frame.footer = truncate(std::move(*frame.footer));
  }

  const auto max_body_lines =
      descriptor.line_count > 1U
          ? (frame.footer.has_value() ? descriptor.line_count - 2U : descriptor.line_count - 1U)
          : 0U;
  if (frame.lines.size() > max_body_lines) {
    frame.lines.resize(max_body_lines);
  }

  return frame;
}

DisplayStatus DisplayService::render_frame(const DisplayDescriptor& descriptor, const DisplayFrame& frame) {
  if (!hal_initialized_) {
    const auto initialize_status = display_hal_.initialize();
    if (!initialize_status.ok()) {
      return DisplayStatus::error(
          DisplayErrorCode::display_render_failed,
          "DisplayHAL initialize failed: " + initialize_status.message);
    }
    hal_initialized_ = true;
  }

  auto status = display_hal_.clear();
  if (!status.ok()) {
    return DisplayStatus::error(DisplayErrorCode::display_render_failed, "DisplayHAL clear failed: " + status.message);
  }

  std::vector<std::string> render_lines;
  render_lines.reserve(descriptor.line_count);
  render_lines.push_back(frame.title);
  render_lines.insert(render_lines.end(), frame.lines.begin(), frame.lines.end());
  if (frame.footer.has_value()) {
    while (render_lines.size() + 1U < descriptor.line_count) {
      render_lines.push_back({});
    }
    render_lines.push_back(*frame.footer);
  }
  if (render_lines.size() < descriptor.line_count) {
    render_lines.resize(descriptor.line_count);
  }

  const auto hal_line_count = display_hal_.line_count();
  const auto renderable_line_count = std::min(hal_line_count, render_lines.size());
  for (std::size_t index = 0; index < renderable_line_count; ++index) {
    status = display_hal_.write_line(index, render_lines[index]);
    if (!status.ok()) {
      return DisplayStatus::error(
          DisplayErrorCode::display_render_failed,
          "DisplayHAL write_line(" + std::to_string(index) + ") failed: " + status.message);
    }
  }

  return DisplayStatus::success();
}

DisplayService::FrameBuildResult DisplayService::build_frame(
    DisplayRecord& record,
    const DisplayScreen screen,
    const DisplayTimestampMs now_ms) const {
  switch (screen) {
    case DisplayScreen::main:
      return build_main_frame(record, now_ms);
    case DisplayScreen::program:
      return build_program_frame(record, now_ms);
    case DisplayScreen::flow:
      return build_flow_frame(record, now_ms);
    case DisplayScreen::pid:
      return build_pid_frame(record, now_ms);
    case DisplayScreen::alarms:
      return build_alarms_frame(record, now_ms);
    case DisplayScreen::mqtt:
      return build_mqtt_frame(record, now_ms);
  }

  FrameBuildResult result;
  result.status = DisplayStatus::error(DisplayErrorCode::display_screen_unavailable, "Unknown display screen.");
  result.frame.display_id = record.descriptor.id;
  result.frame.screen = screen;
  result.frame.title = "DISPLAY";
  result.frame.lines = {"Unknown screen"};
  result.frame.build_timestamp_ms = now_ms;
  result.frame.warning = result.status.message;
  return result;
}

DisplayService::FrameBuildResult DisplayService::build_main_frame(
    const DisplayRecord& record,
    const DisplayTimestampMs now_ms) const {
  FrameBuildResult result;
  result.status = DisplayStatus::success();
  result.frame.display_id = record.descriptor.id;
  result.frame.screen = DisplayScreen::main;
  result.frame.title = "MAIN";
  result.frame.build_timestamp_ms = now_ms;

  if (sequence_api_ == nullptr) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "SequenceApiService is not bound.");
    result.frame.lines = {"Sequence API", "unavailable"};
    result.frame.warning = result.status.message;
    return result;
  }

  const auto program_status = sequence_api_->get_active_program_status(now_ms);
  if (!program_status.ok()) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "Failed to read program status: " + program_status.status.message);
    result.frame.lines = {"Program data", "unavailable"};
    result.frame.warning = result.status.message;
    return result;
  }

  const auto& status = *program_status.value;
  result.frame.lines.push_back(
      std::string("Life ") +
      (status.is_active ? controller::sequence::to_string(status.lifecycle) : "Idle"));
  result.frame.lines.push_back(
      status.is_active
          ? "Prog " + program_name_or_id(status)
          : "Program not active");
  result.frame.lines.push_back(std::string("Alm ") + severity_summary(status.active_alarms));

  std::string output_summary = "Outputs safe";
  for (const auto& actuator : status.actuators) {
    const bool relay_active =
        actuator.relay_state.has_value() && *actuator.relay_state == controller::hal::RelayState::on;
    const bool pwm_active = actuator.pwm_enabled.value_or(false);
    if (relay_active || pwm_active || !actuator.safe_fallback) {
      output_summary = actuator.id + " " + actuator.owner;
      if (has_text(actuator.reason)) {
        output_summary = join_two(std::move(output_summary), actuator.reason);
      }
      break;
    }
  }
  result.frame.lines.push_back(output_summary);

#ifndef CONTROLLER_STAGE27_MINIMAL_DISPLAY
  if (mqtt_service_ != nullptr && mqtt_service_->has_bridge()) {
    const auto mqtt = mqtt_service_->get_snapshot();
    result.frame.footer = std::string("MQTT ") + (mqtt.connected ? "UP" : "DOWN");
  } else {
    result.frame.footer = status.last_reason.empty() ? "Ready" : status.last_reason;
  }
#else
  result.frame.footer = status.last_reason.empty() ? "Ready" : status.last_reason;
#endif

  return result;
}

DisplayService::FrameBuildResult DisplayService::build_program_frame(
    const DisplayRecord& record,
    const DisplayTimestampMs now_ms) const {
  FrameBuildResult result;
  result.status = DisplayStatus::success();
  result.frame.display_id = record.descriptor.id;
  result.frame.screen = DisplayScreen::program;
  result.frame.title = "PROGRAM";
  result.frame.build_timestamp_ms = now_ms;

  if (sequence_api_ == nullptr) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "SequenceApiService is not bound.");
    result.frame.lines = {"Sequence API", "unavailable"};
    result.frame.warning = result.status.message;
    return result;
  }

  const auto program_status = sequence_api_->get_active_program_status(now_ms);
  if (!program_status.ok()) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "Failed to read program status: " + program_status.status.message);
    result.frame.lines = {"Program data", "unavailable"};
    result.frame.warning = result.status.message;
    return result;
  }

  const auto& status = *program_status.value;
  if (!status.is_active) {
    result.frame.lines = {"Program not active", "Lifecycle Idle", "Lockout N"};
    result.frame.footer = "No active program";
    return result;
  }

  result.frame.lines.push_back(program_name_or_id(status));
  result.frame.lines.push_back(
      std::string("State ") + status.current_state_id.value_or("-") + " " + format_duration_ms(status.state_elapsed_ms));
  result.frame.lines.push_back(std::string("Life ") + controller::sequence::to_string(status.lifecycle));
  result.frame.lines.push_back(std::string("Lockout ") + (status.lockout ? "YES" : "NO"));
  result.frame.footer = status.last_reason.empty() ? "Running" : status.last_reason;
  return result;
}

DisplayService::FrameBuildResult DisplayService::build_flow_frame(
    const DisplayRecord& record,
    const DisplayTimestampMs now_ms) const {
  FrameBuildResult result;
  result.status = DisplayStatus::success();
  result.frame.display_id = record.descriptor.id;
  result.frame.screen = DisplayScreen::flow;
  result.frame.title = "FLOW";
  result.frame.build_timestamp_ms = now_ms;

#ifdef CONTROLLER_STAGE27_MINIMAL_DISPLAY
  result.frame.lines = {"Flow not configured", "Stage 27 bring-up"};
  result.frame.footer = "Deferred";
  return result;
#else
  if (flow_api_ == nullptr) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "FlowApiService is not bound.");
    result.frame.lines = {"Flow API", "unavailable"};
    result.frame.warning = result.status.message;
    return result;
  }

  std::optional<controller::api::FlowStatusDto> status;
  if (record.descriptor.preferred_flow_id.has_value()) {
    const auto preferred = flow_api_->get_flowmeter_status(*record.descriptor.preferred_flow_id, now_ms);
    if (preferred.ok()) {
      status = *preferred.value;
    }
  }

  if (!status.has_value()) {
    const auto list = flow_api_->list_flowmeters(now_ms);
    if (!list.ok()) {
      result.status = DisplayStatus::error(
          DisplayErrorCode::display_data_unavailable,
          "Failed to list flowmeters: " + list.status.message);
      result.frame.lines = {"Flow data", "unavailable"};
      result.frame.warning = result.status.message;
      return result;
    }
    if (list.value->empty()) {
      result.frame.lines = {"No flowmeters", "Safe default"};
      result.frame.footer = "Bind pulse input";
      return result;
    }

    const auto detail = flow_api_->get_flowmeter_status(list.value->front().id, now_ms);
    if (!detail.ok()) {
      result.status = DisplayStatus::error(
          DisplayErrorCode::display_data_unavailable,
          "Failed to read flowmeter status: " + detail.status.message);
      result.frame.lines = {"Flow data", "unavailable"};
      result.frame.warning = result.status.message;
      return result;
    }
    status = *detail.value;
  }

  result.frame.lines.push_back(status->name + " " + status->id);
  result.frame.lines.push_back("Rate " + compact_double(status->current_rate, 1) + status->unit + "/m");
  result.frame.lines.push_back("Life " + compact_double(status->lifetime_total, 1) + status->unit);
  result.frame.lines.push_back("Batch " + compact_double(status->batch_total, 1) + " " + bool_marker(status->batch_active, 'A', '-'));

  std::string footer = "NF " + bool_marker(status->no_flow, 'Y', 'N');
  footer = join_two(std::move(footer), "HF " + bool_marker(status->high_flow, 'Y', 'N'));
  if (status->batch_done) {
    footer = join_two(std::move(footer), "DONE");
  }
  result.frame.footer = footer;
  return result;
#endif
}

DisplayService::FrameBuildResult DisplayService::build_pid_frame(
    const DisplayRecord& record,
    const DisplayTimestampMs now_ms) const {
  FrameBuildResult result;
  result.status = DisplayStatus::success();
  result.frame.display_id = record.descriptor.id;
  result.frame.screen = DisplayScreen::pid;
  result.frame.title = "PID";
  result.frame.build_timestamp_ms = now_ms;

#ifdef CONTROLLER_STAGE27_MINIMAL_DISPLAY
  result.frame.lines = {"PID not configured", "Stage 27 bring-up"};
  result.frame.footer = "Deferred";
  return result;
#else
  if (pid_service_ == nullptr) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "PidService is not bound.");
    result.frame.lines = {"PID service", "unavailable"};
    result.frame.warning = result.status.message;
    return result;
  }

  std::optional<controller::pid::PidServiceSnapshot> snapshot;
  if (record.descriptor.preferred_pid_id.has_value()) {
    const auto preferred = pid_service_->get_snapshot(*record.descriptor.preferred_pid_id);
    if (preferred.ok()) {
      snapshot = *preferred.value;
    }
  }

  if (!snapshot.has_value()) {
    const auto descriptors = pid_service_->list_descriptors();
    if (descriptors.empty()) {
      result.frame.lines = {"No PID controllers"};
      result.frame.footer = "Register PID";
      return result;
    }

    const auto detail = pid_service_->get_snapshot(descriptors.front().id);
    if (!detail.ok()) {
      result.status = DisplayStatus::error(
          DisplayErrorCode::display_data_unavailable,
          "Failed to read PID snapshot: " + detail.status.message);
      result.frame.lines = {"PID data", "unavailable"};
      result.frame.warning = result.status.message;
      return result;
    }
    snapshot = *detail.value;
  }

  result.frame.lines.push_back(snapshot->name + " " + snapshot->id);
  result.frame.lines.push_back(
      std::string("Mode ") + controller::pid::to_string(snapshot->requested_mode) + "/" +
      controller::pid::to_string(snapshot->effective_mode));
  result.frame.lines.push_back(
      std::string("PV ") + (snapshot->pv.has_value() ? compact_double(*snapshot->pv, 1) : "-") +
      " SP " + (snapshot->sp.has_value() ? compact_double(*snapshot->sp, 1) : "-"));
  result.frame.lines.push_back("Out " + compact_double(snapshot->output, 1));

  std::string footer = snapshot->fault ? "FAULT" : "OK";
  if (snapshot->saturated_high) {
    footer = join_two(std::move(footer), "SAT_H");
  }
  if (snapshot->saturated_low) {
    footer = join_two(std::move(footer), "SAT_L");
  }
  if (snapshot->fault && has_text(snapshot->fault_reason)) {
    footer = snapshot->fault_reason;
  }
  result.frame.footer = footer;
  return result;
#endif
}

DisplayService::FrameBuildResult DisplayService::build_alarms_frame(
    const DisplayRecord& record,
    const DisplayTimestampMs now_ms) const {
  FrameBuildResult result;
  result.status = DisplayStatus::success();
  result.frame.display_id = record.descriptor.id;
  result.frame.screen = DisplayScreen::alarms;
  result.frame.title = "ALARMS";
  result.frame.build_timestamp_ms = now_ms;

  if (alarm_service_ == nullptr) {
    result.status = DisplayStatus::error(
        DisplayErrorCode::display_data_unavailable,
        "AlarmService is not bound.");
    result.frame.lines = {"Alarm service", "unavailable"};
    result.frame.warning = result.status.message;
    return result;
  }

  const auto aggregate = alarm_service_->get_aggregate_status();
  if (!aggregate.any_active) {
    result.frame.lines = {"No active alarms"};
    result.frame.footer = "Trip N Safety N";
    return result;
  }

  result.frame.lines.push_back("Count " + std::to_string(aggregate.active_count));
  result.frame.lines.push_back(
      std::string("High ") +
      (aggregate.highest_severity.has_value() ? controller::alarms::to_string(*aggregate.highest_severity) : "-"));

  std::size_t shown = 0U;
  for (const auto& snapshot : alarm_service_->list_snapshots()) {
    if (!snapshot.state.active || shown >= 2U) {
      continue;
    }
    result.frame.lines.push_back(snapshot.descriptor.id);
    ++shown;
  }
  result.frame.highlighted_row = result.frame.lines.size() > 2U ? std::optional<std::size_t>{2U} : std::nullopt;
  result.frame.footer = std::string("Trip ") + (aggregate.trip_active ? "Y" : "N") + " Safety " +
                        (aggregate.safety_active ? "Y" : "N");
  return result;
}

DisplayService::FrameBuildResult DisplayService::build_mqtt_frame(
    const DisplayRecord& record,
    const DisplayTimestampMs now_ms) const {
  FrameBuildResult result;
  result.status = DisplayStatus::success();
  result.frame.display_id = record.descriptor.id;
  result.frame.screen = DisplayScreen::mqtt;
  result.frame.title = "MQTT";
  result.frame.build_timestamp_ms = now_ms;

#ifdef CONTROLLER_STAGE27_MINIMAL_DISPLAY
  result.frame.lines = {"MQTT not configured", "Stage 27 bring-up"};
  result.frame.footer = "Deferred";
  return result;
#else
  if (mqtt_service_ == nullptr || !mqtt_service_->has_bridge()) {
    result.frame.lines = {"MQTT not configured"};
    result.frame.footer = "Bridge missing";
    return result;
  }

  const auto snapshot = mqtt_service_->get_snapshot();
  result.frame.lines.push_back(snapshot.connected ? "Connected" : "Disconnected");
  result.frame.lines.push_back("Prefix " + snapshot.topic_prefix);
  result.frame.lines.push_back(
      std::string("Cmd ") +
      (snapshot.last_command_result_code.has_value() ? controller::mqtt::to_string(*snapshot.last_command_result_code) : "none"));
  result.frame.lines.push_back(
      "Pub " + std::to_string(snapshot.publish_counter) + " Cmd " + std::to_string(snapshot.command_counter));
  result.frame.footer = snapshot.last_reason.empty() ? "Availability unknown" : snapshot.last_reason;
  return result;
#endif
}

}  // namespace controller::display
