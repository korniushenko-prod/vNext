#pragma once

#include <string>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "signals/signal_types.hpp"
#include "templates/template_types.hpp"
#include "timers/timer_types.hpp"

namespace controller::templates {

struct TemplateSlotDefinition {
  std::string slot_id;
  std::string label;
  TemplateSlotKind slot_kind{TemplateSlotKind::signal};
  bool required{true};
  std::vector<controller::signals::SignalType> allowed_signal_types;
  std::vector<controller::actuators::ActuatorTargetKind> allowed_actuator_kinds;
  std::vector<controller::actuators::ActuatorRole> preferred_actuator_roles;
  bool allow_generic_role_fallback{false};
  std::vector<controller::timers::TimerKind> allowed_timer_kinds;
  std::string description;
};

}  // namespace controller::templates
