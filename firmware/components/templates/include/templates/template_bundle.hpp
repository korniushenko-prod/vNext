#pragma once

#include <string>
#include <vector>

#include "alarms/alarm_descriptor.hpp"
#include "logic/rule_descriptor.hpp"
#include "pid/pid_service_descriptor.hpp"
#include "sequence/sequence_program.hpp"
#include "templates/template_types.hpp"

namespace controller::templates {

struct TemplateBundle {
  TemplateKind template_kind{TemplateKind::pressure_pump};
  std::string instance_id;
  std::vector<controller::sequence::SequenceProgram> generated_programs;
  std::vector<controller::logic::RuleDescriptor> generated_rules;
  std::vector<controller::alarms::AlarmDescriptor> generated_alarms;
  std::vector<controller::pid::PidServiceDescriptor> generated_pids;
  std::vector<std::string> warnings;
};

}  // namespace controller::templates
