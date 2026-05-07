#pragma once

#include <string>
#include <vector>

#include "sequence/sequence_types.hpp"
#include "templates/template_draft.hpp"
#include "templates/template_result.hpp"

namespace controller::templates {

struct TemplateProgramPreview {
  std::string id;
  std::string name;
  controller::sequence::SequenceProgramType program_type{controller::sequence::SequenceProgramType::custom};
  bool enabled{false};
  std::vector<std::string> state_ids;
};

struct TemplateRulePreview {
  std::string id;
  std::string name;
  bool enabled{false};
  std::string description;
};

struct TemplateAlarmPreview {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string description;
};

struct TemplatePidPreview {
  std::string id;
  std::string name;
  bool enabled{false};
  std::string pv_signal_path;
  std::string output_target_id;
};

struct TemplateBundleSummary {
  std::vector<TemplateProgramPreview> generated_programs;
  std::vector<TemplateRulePreview> generated_rules;
  std::vector<TemplateAlarmPreview> generated_alarms;
  std::vector<TemplatePidPreview> generated_pids;
};

struct TemplatePreview {
  TemplateDraftSummary draft_summary;
  std::vector<TemplateIssue> validation_issues;
  TemplateBundleSummary bundle_summary;
  std::vector<std::string> warnings;
  bool preview_valid{false};
  bool apply_allowed{false};
  bool will_create_disabled{true};
};

}  // namespace controller::templates
