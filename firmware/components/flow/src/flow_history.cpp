#include "flow/flow_history.hpp"

#include <utility>

namespace controller::flow {

FlowHistoryBuffer::FlowHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void FlowHistoryBuffer::append(FlowHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<FlowHistoryEntry> FlowHistoryBuffer::read() const {
  return std::vector<FlowHistoryEntry>(entries_.begin(), entries_.end());
}

void FlowHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t FlowHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t FlowHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::flow
