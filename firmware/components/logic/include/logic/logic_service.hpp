#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "conditions/condition_evaluator.hpp"
#include "logic/logic_types.hpp"
#include "logic/rule_descriptor.hpp"
#include "logic/rule_history.hpp"
#include "logic/rule_result.hpp"
#include "logic/rule_snapshot.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_service.hpp"

namespace controller::logic {

class LogicService {
 public:
  LogicService(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      controller::sequence::SequenceService& sequence_service,
      std::size_t history_capacity = 128U);

  LogicValidationResult validate_rule(
      const RuleDescriptor& rule,
      std::optional<std::string> existing_rule_id = std::nullopt) const;

  LogicOperationResult register_rule(const RuleDescriptor& rule);
  bool has_rule(const std::string& id) const;
  LogicResult<RuleDescriptor> get_rule(const std::string& id) const;
  std::vector<RuleDescriptor> list_rules() const;

  LogicOperationResult tick(LogicTimestampMs now_ms);
  LogicOperationResult replace_rule(const std::string& id, const RuleDescriptor& rule, LogicTimestampMs now_ms);
  LogicOperationResult remove_rule(const std::string& id, LogicTimestampMs now_ms);
  LogicOperationResult set_rule_enabled(const std::string& id, bool enabled, LogicTimestampMs now_ms);

  LogicResult<RuleSnapshot> get_snapshot(const std::string& id) const;
  std::vector<RuleSnapshot> list_snapshots() const;
  LogicSummary get_summary() const;

  std::vector<RuleHistoryEntry> read_history() const;
  void clear_history();

 private:
  struct RuleRecord {
    RuleDescriptor descriptor;
    controller::conditions::ConditionEvaluator evaluator;
    RuntimeRuleState runtime;
    bool signals_registered{false};
  };

  LogicStatus ensure_global_signals_registered();
  LogicStatus ensure_rule_signals_registered(const RuleDescriptor& rule);
  LogicStatus publish_signals(LogicTimestampMs now_ms);

  LogicStatus process_rule(RuleRecord& record, LogicTimestampMs now_ms, bool& actuator_state_dirty);
  LogicStatus execute_command_actions(
      RuleRecord& record,
      RuleActionSection section,
      const std::vector<RuleAction>& actions,
      LogicTimestampMs now_ms);
  LogicStatus reset_rule_runtime(
      RuleRecord& record,
      LogicTimestampMs now_ms,
      const std::string& reason,
      bool clear_outputs,
      bool record_history_entry,
      bool& actuator_state_dirty);
  LogicStatus apply_persistent_actions(
      RuleRecord& record,
      const std::vector<RuleAction>& actions,
      LogicTimestampMs now_ms,
      bool& actuator_state_dirty);
  LogicStatus clear_rule_outputs(RuleRecord& record, LogicTimestampMs now_ms, bool record_history_entry, bool& actuator_state_dirty);
  void clear_rule_signals(const std::string& rule_id);
  LogicStatus apply_command_action(
      RuleRecord& record,
      RuleActionSection section,
      const RuleAction& action,
      LogicTimestampMs now_ms);
  void recompute_summary();
  void record_history(
      const std::string& rule_id,
      RuleEventType event_type,
      LogicTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  RuleSnapshot build_snapshot(const RuleRecord& record) const;

  controller::signals::SignalRegistry& signal_registry_;
  controller::actuators::ActuatorManager& actuator_manager_;
  controller::timers::TimerService& timer_service_;
  controller::alarms::AlarmService& alarm_service_;
  controller::sequence::SequenceService& sequence_service_;
  RuleHistoryBuffer history_;
  bool global_signals_registered_{false};
  std::vector<std::string> rule_order_;
  std::unordered_map<std::string, RuleRecord> rules_by_id_;
  LogicSummary summary_{};
};

}  // namespace controller::logic
