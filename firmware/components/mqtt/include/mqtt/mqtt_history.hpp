#pragma once

#include <cstddef>
#include <deque>
#include <utility>
#include <vector>

#include "mqtt/mqtt_types.hpp"

namespace controller::mqtt {

class MqttHistoryBuffer {
 public:
  explicit MqttHistoryBuffer(const std::size_t capacity = 128U) : capacity_(capacity == 0U ? 1U : capacity) {}

  void push(MqttHistoryEntry entry) {
    entry.sequence_number = next_sequence_number_++;
    if (entries_.size() >= capacity_) {
      entries_.pop_front();
    }
    entries_.push_back(std::move(entry));
  }

  std::vector<MqttHistoryEntry> read() const {
    return {entries_.begin(), entries_.end()};
  }

  void clear() {
    entries_.clear();
  }

  std::size_t size() const {
    return entries_.size();
  }

 private:
  std::size_t capacity_{128U};
  MqttHistorySequenceNumber next_sequence_number_{1U};
  std::deque<MqttHistoryEntry> entries_;
};

}  // namespace controller::mqtt
