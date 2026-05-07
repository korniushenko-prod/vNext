#pragma once

#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "api/program_matrix_api_types.hpp"
#include "sequence/program_matrix_builder.hpp"
#include "sequence/sequence_service.hpp"

namespace controller::api {

class ProgramMatrixApiService {
 public:
  ProgramMatrixApiService(
      controller::sequence::SequenceService& sequence_service,
      controller::actuators::ActuatorManager& actuator_manager);

  ProgramMatrixUiResult<std::vector<ProgramMatrixProgramListItemDto>> list_programs(ApiTimestampMs now_ms) const;
  ProgramMatrixUiResult<ProgramMatrixPayloadDto> get_program_matrix(
      const std::string& program_id,
      ApiTimestampMs now_ms) const;
  ProgramMatrixUiResult<ProgramMatrixPayloadDto> get_active_program_matrix(ApiTimestampMs now_ms) const;

 private:
  ProgramMatrixUiStatus validate_program_id(const std::string& program_id) const;
  std::vector<controller::sequence::ProgramMatrixActuatorMetadata> build_actuator_metadata() const;
  ProgramMatrixRuntimeSummaryDto build_runtime_summary(
      std::optional<std::string> selected_program_id,
      ApiTimestampMs now_ms) const;
  ProgramMatrixUiResult<ProgramMatrixPayloadDto> build_matrix_payload(
      const controller::sequence::SequenceProgram& program,
      const ProgramMatrixRuntimeSummaryDto& runtime_summary) const;

  controller::sequence::SequenceService& sequence_service_;
  controller::actuators::ActuatorManager& actuator_manager_;
  controller::sequence::ProgramMatrixBuilder builder_;
};

}  // namespace controller::api
