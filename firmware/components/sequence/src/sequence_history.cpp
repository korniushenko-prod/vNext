#include "sequence/sequence_history.hpp"

#include <utility>

namespace controller::sequence {

SequenceHistoryBuffer::SequenceHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void SequenceHistoryBuffer::append(SequenceHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<SequenceHistoryEntry> SequenceHistoryBuffer::read() const {
  return std::vector<SequenceHistoryEntry>(entries_.begin(), entries_.end());
}

void SequenceHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t SequenceHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t SequenceHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::sequence
