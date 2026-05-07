#pragma once

#include <optional>
#include <vector>

#include "sequence/program_matrix_types.hpp"
#include "sequence/sequence_program.hpp"

namespace controller::sequence {

class ProgramMatrixBuilder {
 public:
  ProgramMatrixResult<ProgramMatrix> build(
      const SequenceProgram& program,
      const std::vector<ProgramMatrixActuatorMetadata>& actuator_metadata = {},
      const std::optional<ProgramMatrixRuntimeSummary>& runtime_summary = std::nullopt) const;
};

}  // namespace controller::sequence
