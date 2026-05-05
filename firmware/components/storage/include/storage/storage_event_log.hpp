#pragma once

#include <cstdint>
#include <map>
#include <string>
#include <vector>

#include "storage/storage_types.hpp"

namespace controller::storage {

enum class EventCategory { storage, config, totalizer, maintenance };

enum class EventSeverity { info, warning, error };

struct StorageEvent {
  std::uint64_t event_id{0U};
  EventCategory category{EventCategory::storage};
  EventSeverity severity{EventSeverity::info};
  std::string code;
  std::string message;
  std::uint64_t sequence_number{0U};
  std::string source;
  std::map<std::string, std::string> metadata;
};

struct EventLogRecord {
  std::uint32_t max_entries{64U};
  std::uint64_t next_event_id{1U};
  std::uint64_t next_sequence_number{1U};
  std::vector<StorageEvent> events;
};

StorageResult<EventLogRecord> deserialize_event_log_record(const ByteBuffer& bytes);
ByteBuffer serialize_event_log_record(const EventLogRecord& record);

StorageOperationResult append_event_record(EventLogRecord& record, StorageEvent event);

}  // namespace controller::storage
