#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "conditions/condition_evaluator.hpp"
#include "sequence/program_editor_result.hpp"
#include "sequence/program_editor_types.hpp"
#include "sequence/sequence_history.hpp"
#include "sequence/sequence_program.hpp"
#include "sequence/sequence_result.hpp"
#include "sequence/sequence_snapshot.hpp"
#include "sequence/sequence_types.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_service.hpp"

namespace controller::sequence {

class SequenceService {
 public:
  SequenceService(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      std::size_t history_capacity = 128U);

  SequenceValidationResult validate_program(const SequenceProgram& program) const;

  SequenceOperationResult register_program(const SequenceProgram& program);
  bool has_program(const std::string& id) const;
  SequenceResult<SequenceProgram> get_program(const std::string& id) const;
  SequenceResult<SequenceProgram> get_program_descriptor_copy(const std::string& id) const;
  std::vector<SequenceProgram> list_programs() const;
  SequenceOperationResult replace_program(
      const std::string& program_id,
      const SequenceProgram& new_descriptor,
      SequenceTimestampMs now_ms);
  SequenceOperationResult remove_program(const std::string& program_id, SequenceTimestampMs now_ms);
  SequenceOperationResult set_program_enabled(
      const std::string& program_id,
      bool enabled,
      SequenceTimestampMs now_ms);

  ProgramEditorDraft build_program_editor_draft(const SequenceProgram& program) const;
  ProgramEditorValidationResult validate_program_editor_draft(
      const ProgramEditorDraft& draft,
      bool runtime_editable = true) const;
  ProgramEditorResult<ProgramEditorPreview> preview_program_editor_draft(
      const ProgramEditorDraft& draft,
      bool runtime_editable = true) const;

  SequenceOperationResult start_program(
      const std::string& id,
      SequenceTimestampMs now_ms,
      std::string source,
      std::string reason);
  SequenceOperationResult request_normal_stop(
      SequenceTimestampMs now_ms,
      std::string source,
      std::string reason);
  SequenceOperationResult request_trip_stop(
      SequenceTimestampMs now_ms,
      std::string source,
      std::string reason);
  SequenceOperationResult reset_active_program(
      SequenceTimestampMs now_ms,
      std::string source,
      std::string reason);
  SequenceOperationResult tick(SequenceTimestampMs now_ms);

  SequenceResult<SequenceSnapshot> get_active_snapshot(SequenceTimestampMs now_ms);
  std::vector<SequenceSnapshot> list_program_snapshots(SequenceTimestampMs now_ms);

  std::vector<SequenceHistoryEntry> read_history() const;
  void clear_history();

 private:
  struct ProgramRecord {
    SequenceProgram program;
    std::optional<controller::conditions::ConditionEvaluator> start_evaluator;
    std::optional<controller::conditions::ConditionEvaluator> reset_evaluator;
    bool signals_registered{false};
  };

  struct TransitionRuntime {
    SequenceTransition transition;
    std::optional<controller::conditions::ConditionEvaluator> evaluator;
  };

  struct ActiveStateRuntime {
    std::optional<controller::conditions::ConditionEvaluator> guard_evaluator;
    std::vector<TransitionRuntime> transitions;
    std::vector<controller::conditions::ConditionTraceEntry> last_guard_trace;
    std::vector<SequenceTransitionCandidate> last_transition_candidates;
  };

  const SequenceState* find_state(const SequenceProgram& program, const std::string& state_id) const;
  SequenceStateType current_state_type() const;
  std::optional<std::string> current_state_owner() const;
  bool is_program_active(const std::string& program_id) const;

  SequenceStatus ensure_global_signals_registered();
  SequenceStatus ensure_program_signals_registered(const SequenceProgram& program);
  SequenceStatus publish_signals(SequenceTimestampMs now_ms);

  SequenceStatus enter_state(
      const SequenceProgram& program,
      const SequenceState& state,
      SequenceTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      bool record_history);
  SequenceStatus exit_current_state(
      const SequenceProgram& program,
      SequenceTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  SequenceStatus transition_to_state(
      const SequenceProgram& program,
      const std::string& target_state_id,
      SequenceTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      SequenceEventType event_type);

  SequenceStatus execute_actions(
      const SequenceProgram& program,
      const SequenceState& state,
      const std::vector<SequenceAction>& actions,
      SequenceActionSection section,
      SequenceTimestampMs now_ms,
      const std::string& source,
      const std::string& reason);
  SequenceStatus apply_active_actions(
      const SequenceProgram& program,
      const SequenceState& state,
      SequenceTimestampMs now_ms);
  SequenceStatus clear_state_owner_requests(
      const SequenceProgram& program,
      const SequenceState& state,
      SequenceTimestampMs now_ms);
  void clear_active_state_runtime();

  SequenceStatus refresh_active_runtime(const SequenceProgram& program);
  SequenceStatus update_runtime_timing(SequenceTimestampMs now_ms);

  SequenceStatus evaluate_guard(
      const SequenceProgram& program,
      const SequenceState& state,
      SequenceTimestampMs now_ms,
      bool& guard_failed,
      std::string& failure_reason,
      std::string& target_state_id);
  SequenceStatus evaluate_transitions(
      const SequenceProgram& program,
      const SequenceState& state,
      SequenceTimestampMs now_ms,
      bool& transition_taken,
      std::string& target_state_id,
      std::string& transition_reason);
  SequenceStatus handle_pending_requests(const SequenceProgram& program, SequenceTimestampMs now_ms);
  SequenceStatus handle_timeout(
      const SequenceProgram& program,
      const SequenceState& state,
      SequenceTimestampMs now_ms,
      bool& timed_out,
      std::string& timeout_reason);

  SequenceStatus evaluate_program_condition(
      std::optional<controller::conditions::ConditionEvaluator>& evaluator,
      const std::string& context,
      SequenceTimestampMs now_ms,
      bool& result,
      std::vector<controller::conditions::ConditionTraceEntry>* trace = nullptr,
      std::string* reason = nullptr);

  bool compute_can_start(ProgramRecord& record, SequenceTimestampMs now_ms);
  bool compute_can_reset(ProgramRecord& record, SequenceTimestampMs now_ms);
  SequenceSnapshot build_snapshot_for_program(ProgramRecord& record, SequenceTimestampMs now_ms);
  void record_history(
      const std::string& program_id,
      SequenceEventType event_type,
      SequenceTimestampMs now_ms,
      const std::string& source,
      const std::string& reason,
      std::optional<std::string> from_state = std::nullopt,
      std::optional<std::string> to_state = std::nullopt);

  controller::signals::SignalRegistry& signal_registry_;
  controller::actuators::ActuatorManager& actuator_manager_;
  controller::timers::TimerService& timer_service_;
  controller::alarms::AlarmService& alarm_service_;
  SequenceHistoryBuffer history_;
  bool global_signals_registered_{false};
  std::vector<std::string> program_order_;
  std::unordered_map<std::string, ProgramRecord> programs_by_id_;
  SequenceRuntimeState runtime_;
  ActiveStateRuntime active_state_runtime_;
};

}  // namespace controller::sequence
