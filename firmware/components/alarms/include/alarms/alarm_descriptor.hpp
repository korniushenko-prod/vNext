#pragma once

#include <string>

#include "alarms/alarm_result.hpp"
#include "alarms/alarm_types.hpp"

namespace controller::alarms {

struct AlarmDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  AlarmSeverity severity{AlarmSeverity::warning};
  bool latching{false};
  std::string description;
  std::string source_module;
  bool publish_signals{true};
  bool visible{true};
  bool auto_acknowledge{false};
  bool history_enabled{true};
};

AlarmOperationResult validate_alarm_descriptor(const AlarmDescriptor& descriptor);

}  // namespace controller::alarms
