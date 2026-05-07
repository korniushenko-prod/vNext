#pragma once

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "api/program_builder_api_types.hpp"
#include "sequence/program_skeleton_builder.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_service.hpp"

namespace controller::api {

class ProgramBuilderApiService {
 public:
  ProgramBuilderApiService(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      controller::sequence::SequenceService& sequence_service);

  ProgramBuilderUiResult<ProgramBuilderCatalogDto> get_builder_catalog(ApiTimestampMs now_ms) const;
  ProgramBuilderUiResult<ProgramBuilderDraftDto> create_empty_draft(controller::sequence::ProgramSkeletonKind skeleton_kind) const;
  ProgramBuilderUiResult<ProgramBuilderValidationDto> validate_draft(const ProgramBuilderDraftDto& draft, ApiTimestampMs now_ms) const;
  ProgramBuilderUiResult<ProgramBuilderPreviewDto> preview_draft(const ProgramBuilderDraftDto& draft, ApiTimestampMs now_ms) const;
  ProgramBuilderCreateResult create_program_from_draft(const ProgramBuilderDraftDto& draft, const CommandContext& context);

 private:
  ProgramBuilderUiStatus validate_command_context(const CommandContext& context) const;
  ProgramBuilderUiStatus map_builder_validation(const controller::sequence::ProgramBuilderValidationResult& validation) const;
  ProgramBuilderUiStatus map_builder_status(
      const controller::sequence::ProgramBuilderStatus& status,
      std::vector<ProgramBuilderIssueDto> issues = {}) const;
  ProgramBuilderUiStatus map_sequence_registration_status(const controller::sequence::SequenceStatus& status) const;

  controller::sequence::ProgramSkeletonBuilder builder_;
  controller::sequence::SequenceService& sequence_service_;
};

}  // namespace controller::api
