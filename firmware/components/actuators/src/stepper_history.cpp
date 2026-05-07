#include "actuators/stepper_history.hpp"

#include <utility>

namespace controller::actuators {

StepperHistoryBuffer::StepperHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void StepperHistoryBuffer::append(StepperHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<StepperHistoryEntry> StepperHistoryBuffer::read() const {
  return std::vector<StepperHistoryEntry>(entries_.begin(), entries_.end());
}

void StepperHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t StepperHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t StepperHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::actuators
