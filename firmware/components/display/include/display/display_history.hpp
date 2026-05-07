#pragma once

#include <cstddef>
#include <deque>
#include <optional>
#include <string>
#include <vector>

#include "display/display_types.hpp"

namespace controller::display {

struct DisplayHistoryEntry {
  DisplayHistorySequenceNumber sequence_number{0U};
  std::string display_id;
  DisplayHistoryEventType event_type{DisplayHistoryEventType::registered};
  DisplayTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
  std::optional<DisplayScreen> from_screen;
  std::optional<DisplayScreen> to_screen;
};

class DisplayHistoryBuffer {
 public:
  explicit DisplayHistoryBuffer(std::size_t max_entries = 128U);

  void append(DisplayHistoryEntry entry);
  std::vector<DisplayHistoryEntry> read() const;
  void clear();

  std::size_t size() const;
  std::size_t max_entries() const;

 private:
  std::size_t max_entries_{128U};
  DisplayHistorySequenceNumber next_sequence_number_{1U};
  std::deque<DisplayHistoryEntry> entries_;
};

}  // namespace controller::display
