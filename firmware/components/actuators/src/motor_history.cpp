#include "actuators/motor_history.hpp"

#include <utility>

namespace controller::actuators {

MotorHistoryBuffer::MotorHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void MotorHistoryBuffer::append(MotorHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<MotorHistoryEntry> MotorHistoryBuffer::read() const {
  return std::vector<MotorHistoryEntry>(entries_.begin(), entries_.end());
}

void MotorHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t MotorHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t MotorHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::actuators
