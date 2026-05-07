#pragma once

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "api/program_editor_api_types.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_service.hpp"

namespace controller::api {

class ProgramEditorApiService {
 public:
  ProgramEditorApiService(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      controller::sequence::SequenceService& sequence_service);

  ProgramEditorUiResult<std::vector<ProgramEditorProgramListItemDto>> list_programs(ApiTimestampMs now_ms) const;
  ProgramEditorUiResult<ProgramEditorLoadDto> load_program_editor(const std::string& program_id, ApiTimestampMs now_ms) const;
  ProgramEditorUiResult<ProgramEditorCatalogDto> get_editor_catalog(ApiTimestampMs now_ms) const;
  ProgramEditorUiResult<ProgramEditorPreviewDto> preview_program_edit(
      const ProgramEditorDraftDto& draft,
      ApiTimestampMs now_ms) const;
  ProgramEditorMutationResult save_program_edit(
      const std::string& program_id,
      const ProgramEditorDraftDto& draft,
      const CommandContext& context);
  ProgramEditorMutationResult delete_program(const std::string& program_id, const CommandContext& context);
  ProgramEditorMutationResult set_program_enabled(
      const std::string& program_id,
      bool enabled,
      const CommandContext& context);

 private:
  ProgramEditorUiStatus validate_program_id(const std::string& program_id) const;
  ProgramEditorUiStatus validate_command_context(const CommandContext& context) const;
  ProgramEditorUiStatus map_editor_status(
      const controller::sequence::ProgramEditorStatus& status,
      std::vector<ProgramEditorIssueDto> issues = {}) const;
  ProgramEditorUiStatus map_sequence_status(
      const controller::sequence::SequenceStatus& status,
      ProgramEditorUiResultCode denied_code) const;
  std::vector<ProgramEditorProgramListItemDto> build_program_list(ApiTimestampMs now_ms) const;
  ProgramEditorProgramListItemDto build_program_summary(
      const controller::sequence::SequenceProgram& program,
      const controller::sequence::SequenceSnapshot& snapshot) const;
  ProgramEditorRuntimeStatusDto build_runtime_status(
      const std::string& program_id,
      const controller::sequence::SequenceSnapshot& snapshot) const;
  ProgramEditorLoadDto build_load_dto(
      const controller::sequence::SequenceProgram& program,
      const controller::sequence::SequenceSnapshot& snapshot) const;

  controller::signals::SignalRegistry& signal_registry_;
  controller::actuators::ActuatorManager& actuator_manager_;
  controller::timers::TimerService& timer_service_;
  controller::alarms::AlarmService& alarm_service_;
  controller::sequence::SequenceService& sequence_service_;
};

}  // namespace controller::api
