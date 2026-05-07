#pragma once

#include <cstddef>
#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "actuators/stepper_types.hpp"

namespace controller::actuators {

struct StepperHistoryEntry {
  StepperHistorySequenceNumber sequence_number{0U};
  std::string stepper_id;
  StepperHistoryEventType event_type{StepperHistoryEventType::registered};
  StepperTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
  std::optional<StepperRuntimeState> from_state;
  std::optional<StepperRuntimeState> to_state;
  std::optional<double> value;
};

class StepperHistoryBuffer {
 public:
  explicit StepperHistoryBuffer(std::size_t max_entries = 128U);

  void append(StepperHistoryEntry entry);
  std::vector<StepperHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  StepperHistorySequenceNumber next_sequence_number_{1U};
  std::deque<StepperHistoryEntry> entries_;
};

}  // namespace controller::actuators
