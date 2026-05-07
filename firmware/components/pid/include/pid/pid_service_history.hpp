#pragma once

#include <cstddef>
#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "pid/pid_service_types.hpp"

namespace controller::pid {

struct PidServiceHistoryEntry {
  PidServiceHistorySequenceNumber sequence_number{0U};
  std::string pid_id;
  PidServiceHistoryEventType event_type{PidServiceHistoryEventType::registered};
  PidServiceTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
  std::optional<double> value;
};

class PidServiceHistoryBuffer {
 public:
  explicit PidServiceHistoryBuffer(std::size_t max_entries = 128U);

  void append(PidServiceHistoryEntry entry);
  std::vector<PidServiceHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  PidServiceHistorySequenceNumber next_sequence_number_{1U};
  std::deque<PidServiceHistoryEntry> entries_;
};

}  // namespace controller::pid
