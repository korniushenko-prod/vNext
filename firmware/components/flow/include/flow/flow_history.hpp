#pragma once

#include <cstddef>
#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "flow/flow_types.hpp"

namespace controller::flow {

struct FlowHistoryEntry {
  FlowHistorySequenceNumber sequence_number{0U};
  std::string flow_id;
  FlowHistoryEventType event_type{FlowHistoryEventType::initialized};
  FlowTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
  std::optional<double> value;
};

class FlowHistoryBuffer {
 public:
  explicit FlowHistoryBuffer(std::size_t max_entries = 128U);

  void append(FlowHistoryEntry entry);
  std::vector<FlowHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  FlowHistorySequenceNumber next_sequence_number_{1U};
  std::deque<FlowHistoryEntry> entries_;
};

}  // namespace controller::flow
