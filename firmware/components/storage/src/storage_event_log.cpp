#include "storage/storage_event_log.hpp"

#include <utility>

namespace controller::storage {
namespace {

constexpr std::uint32_t kEventLogMagic = 0x45564c47U;
constexpr std::uint32_t kEventLogVersion = 1U;
constexpr const char* kEventLogDecodeIssue = "STORAGE_EVENT_LOG_DECODE_ERROR";

struct Writer {
  ByteBuffer bytes;

  void write_u8(std::uint8_t value) {
    bytes.push_back(value);
  }

  void write_u32(std::uint32_t value) {
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      bytes.push_back(static_cast<std::uint8_t>((value >> (index * 8U)) & 0xffU));
    }
  }

  void write_u64(std::uint64_t value) {
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      bytes.push_back(static_cast<std::uint8_t>((value >> (index * 8U)) & 0xffU));
    }
  }

  void write_string(const std::string& value) {
    write_u32(static_cast<std::uint32_t>(value.size()));
    bytes.insert(bytes.end(), value.begin(), value.end());
  }
};

struct Reader {
  const ByteBuffer& bytes;
  std::size_t offset{0U};
  std::string error;

  bool read_u8(std::uint8_t& value) {
    if (!require(1U, "Unexpected end of event log record while reading byte.")) {
      return false;
    }
    value = bytes[offset++];
    return true;
  }

  bool read_u32(std::uint32_t& value) {
    if (!require(sizeof(value), "Unexpected end of event log record while reading uint32.")) {
      return false;
    }
    value = 0U;
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      value |= static_cast<std::uint32_t>(bytes[offset++]) << (index * 8U);
    }
    return true;
  }

  bool read_u64(std::uint64_t& value) {
    if (!require(sizeof(value), "Unexpected end of event log record while reading uint64.")) {
      return false;
    }
    value = 0U;
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      value |= static_cast<std::uint64_t>(bytes[offset++]) << (index * 8U);
    }
    return true;
  }

  bool read_string(std::string& value) {
    std::uint32_t length = 0U;
    if (!read_u32(length)) {
      return false;
    }
    if (!require(length, "Unexpected end of event log record while reading string.")) {
      return false;
    }
    value.assign(reinterpret_cast<const char*>(bytes.data() + offset), length);
    offset += length;
    return true;
  }

  bool require(std::size_t size, const char* message) {
    if (offset + size > bytes.size()) {
      error = message;
      return false;
    }
    return true;
  }
};

void write_metadata(Writer& writer, const std::map<std::string, std::string>& metadata) {
  writer.write_u32(static_cast<std::uint32_t>(metadata.size()));
  for (const auto& [key, value] : metadata) {
    writer.write_string(key);
    writer.write_string(value);
  }
}

bool read_metadata(Reader& reader, std::map<std::string, std::string>& metadata) {
  std::uint32_t size = 0U;
  if (!reader.read_u32(size)) {
    return false;
  }
  metadata.clear();
  for (std::uint32_t index = 0U; index < size; ++index) {
    std::string key;
    std::string value;
    if (!reader.read_string(key) || !reader.read_string(value)) {
      return false;
    }
    metadata.emplace(std::move(key), std::move(value));
  }
  return true;
}

void write_event(Writer& writer, const StorageEvent& event) {
  writer.write_u64(event.event_id);
  writer.write_u8(static_cast<std::uint8_t>(event.category));
  writer.write_u8(static_cast<std::uint8_t>(event.severity));
  writer.write_string(event.code);
  writer.write_string(event.message);
  writer.write_u64(event.sequence_number);
  writer.write_string(event.source);
  write_metadata(writer, event.metadata);
}

bool read_event(Reader& reader, StorageEvent& event) {
  std::uint8_t category = 0U;
  std::uint8_t severity = 0U;

  if (!reader.read_u64(event.event_id) ||
      !reader.read_u8(category) ||
      !reader.read_u8(severity) ||
      !reader.read_string(event.code) ||
      !reader.read_string(event.message) ||
      !reader.read_u64(event.sequence_number) ||
      !reader.read_string(event.source) ||
      !read_metadata(reader, event.metadata)) {
    return false;
  }

  event.category = static_cast<EventCategory>(category);
  event.severity = static_cast<EventSeverity>(severity);
  return true;
}

StorageIssue decode_issue(const std::string& message) {
  return StorageIssue{"event_log", kEventLogDecodeIssue, StorageSeverity::error, message};
}

}  // namespace

StorageResult<EventLogRecord> deserialize_event_log_record(const ByteBuffer& bytes) {
  StorageResult<EventLogRecord> result;
  Reader reader{bytes, 0U, {}};

  std::uint32_t magic = 0U;
  std::uint32_t version = 0U;
  EventLogRecord record;

  if (!reader.read_u32(magic) || !reader.read_u32(version)) {
    result.add_issue(decode_issue(reader.error.empty() ? "Failed to read event log header." : reader.error));
    return result;
  }
  if (magic != kEventLogMagic) {
    result.add_issue(decode_issue("Event log magic is invalid."));
    return result;
  }
  if (version != kEventLogVersion) {
    result.add_issue(decode_issue("Event log version is unsupported."));
    return result;
  }
  if (!reader.read_u32(record.max_entries) ||
      !reader.read_u64(record.next_event_id) ||
      !reader.read_u64(record.next_sequence_number)) {
    result.add_issue(decode_issue(reader.error.empty() ? "Failed to read event log metadata." : reader.error));
    return result;
  }

  std::uint32_t event_count = 0U;
  if (!reader.read_u32(event_count)) {
    result.add_issue(decode_issue(reader.error.empty() ? "Failed to read event count." : reader.error));
    return result;
  }

  record.events.clear();
  record.events.reserve(event_count);
  for (std::uint32_t index = 0U; index < event_count; ++index) {
    StorageEvent event;
    if (!read_event(reader, event)) {
      result.add_issue(decode_issue(reader.error.empty() ? "Failed to decode event entry." : reader.error));
      return result;
    }
    record.events.push_back(std::move(event));
  }

  if (reader.offset != bytes.size()) {
    result.add_issue(decode_issue("Event log record contains trailing bytes."));
    return result;
  }

  result.value = std::move(record);
  return result;
}

ByteBuffer serialize_event_log_record(const EventLogRecord& record) {
  Writer writer;
  writer.write_u32(kEventLogMagic);
  writer.write_u32(kEventLogVersion);
  writer.write_u32(record.max_entries);
  writer.write_u64(record.next_event_id);
  writer.write_u64(record.next_sequence_number);
  writer.write_u32(static_cast<std::uint32_t>(record.events.size()));
  for (const auto& event : record.events) {
    write_event(writer, event);
  }
  return writer.bytes;
}

StorageOperationResult append_event_record(EventLogRecord& record, StorageEvent event) {
  StorageOperationResult result;

  if (record.max_entries == 0U) {
    record.max_entries = 1U;
  }

  event.event_id = record.next_event_id++;
  event.sequence_number = record.next_sequence_number++;

  if (record.events.size() >= record.max_entries) {
    record.events.erase(record.events.begin());
    result.add_issue(StorageIssue{
        "event_log",
        "STORAGE_EVENT_LOG_FULL",
        StorageSeverity::warning,
        "Event log reached max size and dropped the oldest event."});
  }

  record.events.push_back(std::move(event));
  return result;
}

}  // namespace controller::storage
