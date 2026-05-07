#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "logic/logic_service.hpp"
#include "pid/pid_service.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_registry.hpp"
#include "templates/template_binding.hpp"
#include "templates/template_bundle.hpp"
#include "templates/template_draft.hpp"
#include "templates/template_parameter.hpp"
#include "templates/template_preview.hpp"
#include "templates/template_result.hpp"
#include "templates/template_slot.hpp"
#include "templates/template_types.hpp"
#include "timers/timer_service.hpp"

namespace controller::templates {

struct TemplateCommandContext {
  TemplateTimestampMs now_ms{0U};
  std::string source;
  std::string reason;
  std::optional<std::string> actor;
};

struct TemplateDefinition {
  TemplateKind kind{TemplateKind::pressure_pump};
  std::string label;
  std::string description;
  bool supervisory_only{false};
  controller::sequence::SequenceProgramType primary_program_type{controller::sequence::SequenceProgramType::custom};
  std::vector<TemplateSlotDefinition> slot_definitions;
  std::vector<TemplateParameterDefinition> parameter_definitions;
  std::vector<std::string> preview_state_ids;
};

struct TemplateListEntry {
  TemplateKind kind{TemplateKind::pressure_pump};
  std::string label;
  std::string description;
  bool supervisory_only{false};
  std::size_t required_binding_count{0U};
  std::size_t required_parameter_count{0U};
};

struct TemplateCatalog {
  std::vector<TemplateSignalCatalogEntry> signals;
  std::vector<TemplateActuatorCatalogEntry> actuators;
  std::vector<TemplateTimerCatalogEntry> timers;
  std::vector<TemplateAlarmCatalogEntry> alarms;
  std::vector<std::string> existing_program_ids;
  std::vector<std::string> existing_rule_ids;
  std::vector<std::string> existing_pid_ids;
  std::vector<TemplateDefinition> supported_templates;
};

struct TemplateSchema {
  TemplateDefinition definition;
  std::vector<TemplateSignalCatalogEntry> signals;
  std::vector<TemplateActuatorCatalogEntry> actuators;
  std::vector<TemplateTimerCatalogEntry> timers;
  std::vector<TemplateAlarmCatalogEntry> alarms;
  std::vector<std::string> existing_program_ids;
  std::vector<std::string> existing_rule_ids;
  std::vector<std::string> existing_pid_ids;
};

struct TemplateEngineFaultInjection {
  std::optional<std::size_t> fail_apply_after_successful_registrations;
  std::optional<std::size_t> fail_rollback_after_successful_removals;
};

class TemplateEngine {
 public:
  TemplateEngine(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      controller::logic::LogicService& logic_service,
      controller::sequence::SequenceService& sequence_service,
      controller::pid::PidService& pid_service);

  std::vector<TemplateListEntry> list_templates() const;
  TemplateCatalog get_catalog() const;
  TemplateResult<TemplateSchema> get_schema(TemplateKind kind) const;
  TemplateDraft create_draft(TemplateKind kind) const;
  TemplateValidationResult validate_draft(
      const TemplateDraft& draft,
      TemplateTimestampMs now_ms,
      bool include_apply_guards = false) const;
  TemplateResult<TemplateBundle> generate_bundle(const TemplateDraft& draft) const;
  TemplateResult<TemplatePreview> preview_draft(const TemplateDraft& draft, TemplateTimestampMs now_ms) const;
  TemplateApplyResult apply_template(const TemplateDraft& draft, const TemplateCommandContext& context);
  void set_fault_injection(const TemplateEngineFaultInjection& fault_injection);

 private:
  struct GeneratedArtifactIds {
    std::vector<std::string> program_ids;
    std::vector<std::string> rule_ids;
    std::vector<std::string> alarm_ids;
    std::vector<std::string> pid_ids;
  };

  struct RollbackRecord {
    enum class Kind {
      alarm,
      pid,
      rule,
      program,
    };

    Kind kind{Kind::alarm};
    std::string id;
  };

  const TemplateDefinition* find_definition(TemplateKind kind) const;
  std::vector<TemplateDefinition> build_definitions() const;
  TemplateDraftSummary build_draft_summary(const TemplateDraft& draft, const TemplateDefinition& definition) const;
  GeneratedArtifactIds build_generated_ids(const TemplateDraft& draft) const;
  TemplateBundleSummary build_outline_summary(const TemplateDraft& draft, const TemplateDefinition& definition) const;
  TemplateBundleSummary build_bundle_summary(const TemplateBundle& bundle) const;
  TemplateValidationResult validate_common_fields(const TemplateDraft& draft) const;
  TemplateValidationResult validate_bindings_and_parameters(
      const TemplateDraft& draft,
      const TemplateDefinition& definition) const;
  TemplateValidationResult validate_collisions(const TemplateDraft& draft) const;
  void append_active_program_issue(std::vector<TemplateIssue>& issues) const;

  controller::signals::SignalRegistry& signal_registry_;
  controller::actuators::ActuatorManager& actuator_manager_;
  controller::timers::TimerService& timer_service_;
  controller::alarms::AlarmService& alarm_service_;
  controller::logic::LogicService& logic_service_;
  controller::sequence::SequenceService& sequence_service_;
  controller::pid::PidService& pid_service_;
  TemplateEngineFaultInjection fault_injection_{};
};

}  // namespace controller::templates
