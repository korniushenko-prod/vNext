#pragma once

#include <cstddef>
#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "sequence/sequence_types.hpp"

namespace controller::sequence {

struct SequenceHistoryEntry {
  SequenceHistorySequenceNumber sequence_number{0U};
  std::string program_id;
  SequenceEventType event_type{SequenceEventType::program_started};
  std::optional<std::string> from_state;
  std::optional<std::string> to_state;
  SequenceTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
};

class SequenceHistoryBuffer {
 public:
  explicit SequenceHistoryBuffer(std::size_t max_entries = 128U);

  void append(SequenceHistoryEntry entry);
  std::vector<SequenceHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  SequenceHistorySequenceNumber next_sequence_number_{1U};
  std::deque<SequenceHistoryEntry> entries_;
};

}  // namespace controller::sequence
