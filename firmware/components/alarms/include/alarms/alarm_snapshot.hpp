#pragma once

#include <optional>
#include <string>

#include "alarms/alarm_descriptor.hpp"

namespace controller::alarms {

struct RuntimeAlarmState {
  bool initialized{false};
  bool condition_active{false};
  bool active{false};
  bool latched{false};
  bool acknowledged{false};
  bool reset_allowed{false};
  AlarmTimestampMs first_activated_ms{0U};
  AlarmTimestampMs last_changed_ms{0U};
  AlarmActivationCount activation_count{0U};
  AlarmUpdateCounter update_counter{0U};
  std::string last_source;
  std::string last_reason;
};

struct AlarmSnapshot {
  AlarmDescriptor descriptor;
  RuntimeAlarmState state;
};

struct AggregateAlarmStatus {
  bool any_active{false};
  bool info_active{false};
  bool warning_active{false};
  bool inhibit_active{false};
  bool trip_active{false};
  bool safety_active{false};
  std::uint64_t active_count{0U};
  std::optional<AlarmSeverity> highest_severity;
  std::optional<std::string> highest_severity_alarm_id;
  AlarmUpdateCounter update_counter{0U};
};

}  // namespace controller::alarms
