#pragma once

#include <cstddef>
#include <deque>
#include <string>
#include <vector>

#include "logic/logic_types.hpp"

namespace controller::logic {

struct RuleHistoryEntry {
  LogicHistorySequenceNumber sequence_number{0U};
  std::string rule_id;
  RuleEventType event_type{RuleEventType::rule_became_true};
  LogicTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
};

class RuleHistoryBuffer {
 public:
  explicit RuleHistoryBuffer(std::size_t max_entries = 128U);

  void append(RuleHistoryEntry entry);
  std::vector<RuleHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  LogicHistorySequenceNumber next_sequence_number_{1U};
  std::deque<RuleHistoryEntry> entries_;
};

}  // namespace controller::logic
