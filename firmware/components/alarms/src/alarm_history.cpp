#include "alarms/alarm_history.hpp"

#include <utility>

#include "alarms/alarm_result.hpp"

namespace controller::alarms {

bool is_supported_alarm_severity(const AlarmSeverity severity) {
  switch (severity) {
    case AlarmSeverity::info:
    case AlarmSeverity::warning:
    case AlarmSeverity::inhibit:
    case AlarmSeverity::trip:
    case AlarmSeverity::safety:
      return true;
  }

  return false;
}

std::uint8_t alarm_severity_rank(const AlarmSeverity severity) {
  switch (severity) {
    case AlarmSeverity::info:
      return 0U;
    case AlarmSeverity::warning:
      return 1U;
    case AlarmSeverity::inhibit:
      return 2U;
    case AlarmSeverity::trip:
      return 3U;
    case AlarmSeverity::safety:
      return 4U;
  }

  return 0U;
}

const char* to_string(const AlarmSeverity severity) {
  switch (severity) {
    case AlarmSeverity::info:
      return "info";
    case AlarmSeverity::warning:
      return "warning";
    case AlarmSeverity::inhibit:
      return "inhibit";
    case AlarmSeverity::trip:
      return "trip";
    case AlarmSeverity::safety:
      return "safety";
  }

  return "unknown";
}

const char* to_string(const AlarmEventType event_type) {
  switch (event_type) {
    case AlarmEventType::condition_raised:
      return "condition_raised";
    case AlarmEventType::condition_cleared:
      return "condition_cleared";
    case AlarmEventType::latched:
      return "latched";
    case AlarmEventType::reset:
      return "reset";
    case AlarmEventType::reset_denied:
      return "reset_denied";
  }

  return "unknown";
}

const char* to_string(const AlarmErrorCode code) {
  switch (code) {
    case AlarmErrorCode::ok:
      return "OK";
    case AlarmErrorCode::alarm_already_registered:
      return "ALARM_ALREADY_REGISTERED";
    case AlarmErrorCode::alarm_not_found:
      return "ALARM_NOT_FOUND";
    case AlarmErrorCode::alarm_invalid_descriptor:
      return "ALARM_INVALID_DESCRIPTOR";
    case AlarmErrorCode::alarm_invalid_severity:
      return "ALARM_INVALID_SEVERITY";
    case AlarmErrorCode::alarm_reset_denied:
      return "ALARM_RESET_DENIED";
    case AlarmErrorCode::alarm_already_active:
      return "ALARM_ALREADY_ACTIVE";
    case AlarmErrorCode::alarm_already_inactive:
      return "ALARM_ALREADY_INACTIVE";
    case AlarmErrorCode::alarm_signal_publish_failed:
      return "ALARM_SIGNAL_PUBLISH_FAILED";
    case AlarmErrorCode::alarm_history_full:
      return "ALARM_HISTORY_FULL";
    case AlarmErrorCode::alarm_operation_unsupported:
      return "ALARM_OPERATION_UNSUPPORTED";
  }

  return "UNKNOWN_ALARM_ERROR";
}

AlarmHistoryBuffer::AlarmHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void AlarmHistoryBuffer::append(AlarmHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<AlarmHistoryEntry> AlarmHistoryBuffer::read() const {
  return std::vector<AlarmHistoryEntry>(entries_.begin(), entries_.end());
}

void AlarmHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t AlarmHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t AlarmHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::alarms
