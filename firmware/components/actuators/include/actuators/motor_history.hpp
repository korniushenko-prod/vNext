#pragma once

#include <cstddef>
#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "actuators/motor_types.hpp"

namespace controller::actuators {

struct MotorHistoryEntry {
  MotorHistorySequenceNumber sequence_number{0U};
  std::string motor_id;
  MotorHistoryEventType event_type{MotorHistoryEventType::registered};
  MotorTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
  std::optional<double> value;
};

class MotorHistoryBuffer {
 public:
  explicit MotorHistoryBuffer(std::size_t max_entries = 128U);

  void append(MotorHistoryEntry entry);
  std::vector<MotorHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  MotorHistorySequenceNumber next_sequence_number_{1U};
  std::deque<MotorHistoryEntry> entries_;
};

}  // namespace controller::actuators
