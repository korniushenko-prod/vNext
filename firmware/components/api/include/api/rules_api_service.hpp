#pragma once

#include <string>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "api/rules_api_types.hpp"
#include "logic/logic_service.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_service.hpp"

namespace controller::api {

class RulesApiService {
 public:
  RulesApiService(
      controller::logic::LogicService& logic_service,
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      controller::sequence::SequenceService& sequence_service);

  RulesUiResult<std::vector<RuleCardDto>> list_rules(ApiTimestampMs now_ms) const;
  RulesUiResult<RuleDetailDto> get_rule(const std::string& rule_id, ApiTimestampMs now_ms) const;
  RulesUiResult<RuleEditorCatalogDto> get_rule_editor_catalog(ApiTimestampMs now_ms) const;

  RulesMutationResult create_rule(const RuleDescriptorDraftDto& draft, const CommandContext& context);
  RulesMutationResult update_rule(const std::string& rule_id, const RuleDescriptorDraftDto& draft, const CommandContext& context);
  RulesMutationResult delete_rule(const std::string& rule_id, const CommandContext& context);
  RulesMutationResult set_rule_enabled(const std::string& rule_id, bool enabled, const CommandContext& context);

 private:
  RulesUiStatus validate_rule_id(const std::string& rule_id) const;
  RulesUiStatus validate_command_context(const CommandContext& context) const;

  RulesUiStatus map_logic_query_status(
      const controller::logic::LogicStatus& status,
      RulesUiResultCode fallback_code) const;
  RulesUiStatus map_logic_command_status(
      const controller::logic::LogicStatus& status,
      RulesUiResultCode denied_code,
      std::vector<RuleValidationIssueDto> issues = {}) const;

  std::vector<RuleValidationIssueDto> map_validation_issues(
      const std::vector<controller::logic::LogicValidationIssue>& issues) const;
  std::string build_condition_summary(const controller::conditions::ConditionTree& tree) const;
  std::string build_action_summary(const std::vector<controller::logic::RuleAction>& actions) const;
  std::optional<std::string> build_else_summary(const std::vector<controller::logic::RuleAction>& actions) const;
  std::string derive_rule_status(const controller::logic::RuleSnapshot& snapshot) const;
  RuleCardDto build_rule_card(
      const controller::logic::RuleDescriptor& descriptor,
      const controller::logic::RuleSnapshot& snapshot) const;
  RuleDetailDto build_rule_detail(
      const controller::logic::RuleDescriptor& descriptor,
      const controller::logic::RuleSnapshot& snapshot,
      std::vector<RuleValidationIssueDto> validation_issues = {}) const;
  RuleEditorCatalogDto build_editor_catalog() const;

  controller::logic::LogicService& logic_service_;
  controller::signals::SignalRegistry& signal_registry_;
  controller::actuators::ActuatorManager& actuator_manager_;
  controller::timers::TimerService& timer_service_;
  controller::alarms::AlarmService& alarm_service_;
  controller::sequence::SequenceService& sequence_service_;
};

}  // namespace controller::api
