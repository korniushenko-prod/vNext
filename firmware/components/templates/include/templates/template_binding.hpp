#pragma once

#include <map>
#include <string>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "alarms/alarm_types.hpp"
#include "signals/signal_types.hpp"
#include "timers/timer_types.hpp"

namespace controller::templates {

using TemplateBindingMap = std::map<std::string, std::string>;

struct TemplateSignalCatalogEntry {
  std::string path;
  controller::signals::SignalType type{controller::signals::SignalType::boolean};
  std::string unit;
  std::string source_module;
};

struct TemplateActuatorCatalogEntry {
  std::string id;
  controller::actuators::ActuatorTargetKind kind{controller::actuators::ActuatorTargetKind::relay};
  controller::actuators::ActuatorRole role{controller::actuators::ActuatorRole::generic};
};

struct TemplateTimerCatalogEntry {
  std::string id;
  std::string name;
  controller::timers::TimerKind kind{controller::timers::TimerKind::ton};
  bool enabled{true};
};

struct TemplateAlarmCatalogEntry {
  std::string id;
  std::string name;
  controller::alarms::AlarmSeverity severity{controller::alarms::AlarmSeverity::warning};
  bool enabled{true};
};

}  // namespace controller::templates
