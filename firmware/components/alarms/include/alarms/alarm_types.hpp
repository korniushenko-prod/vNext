#pragma once

#include <cstdint>

namespace controller::alarms {

using AlarmTimestampMs = std::uint64_t;
using AlarmUpdateCounter = std::uint64_t;
using AlarmActivationCount = std::uint64_t;
using AlarmHistorySequenceNumber = std::uint64_t;

enum class AlarmSeverity {
  info,
  warning,
  inhibit,
  trip,
  safety,
};

enum class AlarmEventType {
  condition_raised,
  condition_cleared,
  latched,
  reset,
  reset_denied,
};

bool is_supported_alarm_severity(AlarmSeverity severity);
std::uint8_t alarm_severity_rank(AlarmSeverity severity);
const char* to_string(AlarmSeverity severity);
const char* to_string(AlarmEventType event_type);

}  // namespace controller::alarms
