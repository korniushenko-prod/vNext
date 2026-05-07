#include "pid/pid_service_history.hpp"

#include <utility>

namespace controller::pid {

PidServiceHistoryBuffer::PidServiceHistoryBuffer(const std::size_t max_entries) : max_entries_(max_entries) {}

void PidServiceHistoryBuffer::append(PidServiceHistoryEntry entry) {
  entry.sequence_number = next_sequence_number_++;

  if (max_entries_ == 0U) {
    return;
  }

  if (entries_.size() >= max_entries_) {
    entries_.pop_front();
  }

  entries_.push_back(std::move(entry));
}

std::vector<PidServiceHistoryEntry> PidServiceHistoryBuffer::read() const {
  return std::vector<PidServiceHistoryEntry>(entries_.begin(), entries_.end());
}

void PidServiceHistoryBuffer::clear() {
  entries_.clear();
}

std::size_t PidServiceHistoryBuffer::size() const {
  return entries_.size();
}

std::size_t PidServiceHistoryBuffer::max_entries() const {
  return max_entries_;
}

}  // namespace controller::pid
