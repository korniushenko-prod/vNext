#pragma once

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "sequence/program_builder_types.hpp"
#include "sequence/sequence_service.hpp"
#include "signals/signal_registry.hpp"
#include "timers/timer_service.hpp"

namespace controller::sequence {

class ProgramSkeletonBuilder {
 public:
  ProgramSkeletonBuilder(
      controller::signals::SignalRegistry& signal_registry,
      controller::actuators::ActuatorManager& actuator_manager,
      controller::timers::TimerService& timer_service,
      controller::alarms::AlarmService& alarm_service,
      const controller::sequence::SequenceService& sequence_service);

  ProgramBuilderCatalog build_catalog(SequenceTimestampMs now_ms = 0U) const;
  ProgramBuilderDraft create_empty_draft(ProgramSkeletonKind kind) const;
  ProgramBuilderValidationResult validate_draft(const ProgramBuilderDraft& draft) const;
  ProgramBuilderResult<ProgramBuilderPreview> build_preview(const ProgramBuilderDraft& draft) const;
  ProgramBuilderResult<controller::sequence::SequenceProgram> build_program(const ProgramBuilderDraft& draft) const;

 private:
  controller::signals::SignalRegistry& signal_registry_;
  controller::actuators::ActuatorManager& actuator_manager_;
  controller::timers::TimerService& timer_service_;
  controller::alarms::AlarmService& alarm_service_;
  const controller::sequence::SequenceService& sequence_service_;
};

}  // namespace controller::sequence
