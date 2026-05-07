#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/sequence_api_service.hpp"
#include "api/program_matrix_api_service.hpp"
#include "api/program_editor_api_service.hpp"
#include "api/web_program_matrix_adapter.hpp"
#include "api/web_program_editor_adapter.hpp"
#include "api/program_builder_api_service.hpp"
#include "api/web_program_builder_adapter.hpp"
#include "sequence_test_support.hpp"

namespace api_test {

using sequence_test::expect_true;
using sequence_test::failures;

struct ApiTestContext {
  sequence_test::SequenceTestContext sequence;
  controller::api::SequenceApiService api_service;

  explicit ApiTestContext(const std::size_t history_capacity = 8U)
      : sequence(history_capacity),
        api_service(sequence.sequence_service, sequence.alarm_service, sequence.actuator_manager) {}

  bool initialize() {
    return sequence.initialize();
  }
};

struct ProgramBuilderApiTestContext {
  sequence_test::SequenceTestContext sequence;
  controller::api::ProgramBuilderApiService api_service;
  controller::api::WebProgramBuilderAdapter web_adapter;

  explicit ProgramBuilderApiTestContext(const std::size_t history_capacity = 8U)
      : sequence(history_capacity),
        api_service(
            sequence.registry,
            sequence.actuator_manager,
            sequence.timer_service,
            sequence.alarm_service,
            sequence.sequence_service),
        web_adapter(api_service) {}

  bool initialize() {
    return sequence.initialize();
  }
};

struct ProgramEditorApiTestContext {
  sequence_test::SequenceTestContext sequence;
  controller::api::ProgramEditorApiService api_service;
  controller::api::WebProgramEditorAdapter web_adapter;

  explicit ProgramEditorApiTestContext(const std::size_t history_capacity = 8U)
      : sequence(history_capacity),
        api_service(
            sequence.registry,
            sequence.actuator_manager,
            sequence.timer_service,
            sequence.alarm_service,
            sequence.sequence_service),
        web_adapter(api_service) {}

  bool initialize() {
    return sequence.initialize();
  }
};

struct ProgramMatrixApiTestContext {
  sequence_test::SequenceTestContext sequence;
  controller::api::ProgramMatrixApiService api_service;
  controller::api::WebProgramMatrixAdapter web_adapter;

  explicit ProgramMatrixApiTestContext(const std::size_t history_capacity = 8U)
      : sequence(history_capacity),
        api_service(sequence.sequence_service, sequence.actuator_manager),
        web_adapter(api_service) {}

  bool initialize() {
    return sequence.initialize();
  }
};

inline controller::sequence::SequenceProgram make_program(
    std::string id,
    std::string name,
    const controller::sequence::SequenceProgramType type) {
  auto program = sequence_test::make_basic_program();
  program.id = std::move(id);
  program.name = std::move(name);
  program.type = type;
  return program;
}

inline controller::api::CommandContext make_command_context(
    const controller::api::ApiTimestampMs now_ms,
    std::string source = "api_test",
    std::string reason = "operator request") {
  controller::api::CommandContext context;
  context.now_ms = now_ms;
  context.source = std::move(source);
  context.reason = std::move(reason);
  context.actor = std::string{"tester"};
  return context;
}

inline controller::sequence::ProgramBuilderDraft make_pump_builder_draft() {
  controller::sequence::ProgramBuilderDraft draft;
  draft.skeleton_kind = controller::sequence::ProgramSkeletonKind::pump_basic;
  draft.program_type = controller::sequence::SequenceProgramType::pump;
  draft.program_id = "builder.pump_1";
  draft.program_name = "Builder Pump 1";
  draft.actuator_bindings["primary_output"] = "relay.main";
  draft.signal_bindings["pressure_low"] = "signal.pressure_low";
  draft.signal_bindings["pressure_high"] = "signal.pressure_high";
  draft.timer_bindings["startup_bypass"] = "timer.startup_bypass";
  draft.alarm_bindings["alarm_trip"] = "alarm.trip";
  draft.parameters["min_run_time_ms"] = std::int64_t{1000};
  draft.parameters["min_off_time_ms"] = std::int64_t{2000};
  return draft;
}

inline controller::sequence::ProgramEditorDraft make_editor_draft(
    const std::string& program_id = "pump1",
    const std::string& program_name = "Pump 1") {
  auto program = sequence_test::make_basic_program();
  program.id = program_id;
  program.name = program_name;
  program.description = std::string{"Editable program for Stage 21 tests"};
  return controller::sequence::make_program_editor_draft(program);
}

inline std::optional<controller::api::ActuatorSummaryDto> find_actuator(
    const std::vector<controller::api::ActuatorSummaryDto>& actuators,
    const std::string& id) {
  for (const auto& actuator : actuators) {
    if (actuator.id == id) {
      return actuator;
    }
  }
  return std::nullopt;
}

}  // namespace api_test
