#pragma once

#include <cstddef>
#include <deque>
#include <string>
#include <vector>

#include "alarms/alarm_types.hpp"

namespace controller::alarms {

struct AlarmHistoryEntry {
  AlarmHistorySequenceNumber sequence_number{0U};
  std::string alarm_id;
  AlarmEventType event_type{AlarmEventType::condition_raised};
  AlarmSeverity severity{AlarmSeverity::warning};
  AlarmTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
};

class AlarmHistoryBuffer {
 public:
  explicit AlarmHistoryBuffer(std::size_t max_entries = 128U);

  void append(AlarmHistoryEntry entry);
  std::vector<AlarmHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  AlarmHistorySequenceNumber next_sequence_number_{1U};
  std::deque<AlarmHistoryEntry> entries_;
};

}  // namespace controller::alarms
