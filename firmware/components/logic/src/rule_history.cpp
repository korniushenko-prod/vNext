#include "logic/rule_history.hpp"

#include <utility>

namespace controller::logic {

RuleHistoryBuffer::RuleHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void RuleHistoryBuffer::append(RuleHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<RuleHistoryEntry> RuleHistoryBuffer::read() const {
  return std::vector<RuleHistoryEntry>(entries_.begin(), entries_.end());
}

void RuleHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t RuleHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t RuleHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::logic
