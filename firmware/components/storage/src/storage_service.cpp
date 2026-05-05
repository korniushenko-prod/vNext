#include "storage/storage_service.hpp"

#include <algorithm>
#include <cstring>
#include <utility>

#include "config/config_defaults.hpp"
#include "storage/storage_crc.hpp"

namespace controller::storage {
namespace {

constexpr std::uint32_t kConfigSlotMagic = 0x43534c54U;
constexpr std::uint32_t kConfigSlotVersion = 1U;
constexpr std::uint32_t kTotalizerMagic = 0x54544c5aU;
constexpr std::uint32_t kTotalizerVersion = 1U;
constexpr const char* kTotalizerPrefix = "totalizer:";

struct Writer {
  ByteBuffer bytes;

  void write_u8(std::uint8_t value) {
    bytes.push_back(value);
  }

  void write_bool(bool value) {
    write_u8(value ? 1U : 0U);
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

  void write_double(double value) {
    static_assert(sizeof(double) == sizeof(std::uint64_t), "double must be 64-bit for storage");
    std::uint64_t bits = 0U;
    std::memcpy(&bits, &value, sizeof(bits));
    write_u64(bits);
  }

  void write_string(const std::string& value) {
    write_u32(static_cast<std::uint32_t>(value.size()));
    bytes.insert(bytes.end(), value.begin(), value.end());
  }

  void write_bytes(const ByteBuffer& value) {
    write_u32(static_cast<std::uint32_t>(value.size()));
    bytes.insert(bytes.end(), value.begin(), value.end());
  }
};

struct Reader {
  const ByteBuffer& bytes;
  std::size_t offset{0U};
  std::string error;

  bool read_u8(std::uint8_t& value) {
    if (!require(1U, "Unexpected end of record while reading byte.")) {
      return false;
    }
    value = bytes[offset++];
    return true;
  }

  bool read_bool(bool& value) {
    std::uint8_t raw = 0U;
    if (!read_u8(raw)) {
      return false;
    }
    if (raw > 1U) {
      error = "Invalid boolean in record.";
      return false;
    }
    value = raw == 1U;
    return true;
  }

  bool read_u32(std::uint32_t& value) {
    if (!require(sizeof(value), "Unexpected end of record while reading uint32.")) {
      return false;
    }
    value = 0U;
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      value |= static_cast<std::uint32_t>(bytes[offset++]) << (index * 8U);
    }
    return true;
  }

  bool read_u64(std::uint64_t& value) {
    if (!require(sizeof(value), "Unexpected end of record while reading uint64.")) {
      return false;
    }
    value = 0U;
    for (std::size_t index = 0; index < sizeof(value); ++index) {
      value |= static_cast<std::uint64_t>(bytes[offset++]) << (index * 8U);
    }
    return true;
  }

  bool read_double(double& value) {
    std::uint64_t bits = 0U;
    if (!read_u64(bits)) {
      return false;
    }
    std::memcpy(&value, &bits, sizeof(value));
    return true;
  }

  bool read_string(std::string& value) {
    std::uint32_t length = 0U;
    if (!read_u32(length)) {
      return false;
    }
    if (!require(length, "Unexpected end of record while reading string.")) {
      return false;
    }
    value.assign(reinterpret_cast<const char*>(bytes.data() + offset), length);
    offset += length;
    return true;
  }

  bool read_bytes(ByteBuffer& value) {
    std::uint32_t length = 0U;
    if (!read_u32(length)) {
      return false;
    }
    if (!require(length, "Unexpected end of record while reading byte array.")) {
      return false;
    }
    value.assign(bytes.begin() + static_cast<std::ptrdiff_t>(offset), bytes.begin() + static_cast<std::ptrdiff_t>(offset + length));
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

std::string slot_key(ConfigSlotKind slot_kind) {
  return slot_kind == ConfigSlotKind::active ? "config.active" : "config.backup";
}

StorageSeverity to_storage_severity(config::ValidationSeverity severity) {
  return severity == config::ValidationSeverity::warning ? StorageSeverity::warning : StorageSeverity::error;
}

ByteBuffer serialize_config_slot_record(const ConfigSlotRecord& record) {
  Writer writer;
  writer.write_u32(kConfigSlotMagic);
  writer.write_u32(kConfigSlotVersion);
  writer.write_u8(static_cast<std::uint8_t>(record.slot_kind));
  writer.write_u32(record.schema_version);
  writer.write_u32(record.config_version);
  writer.write_u32(record.payload_crc32);
  writer.write_string(record.payload_fingerprint);
  writer.write_u64(record.saved_sequence);
  writer.write_bytes(record.payload_bytes);
  return writer.bytes;
}

StorageResult<ConfigSlotRecord> deserialize_config_slot_record(const ByteBuffer& bytes) {
  StorageResult<ConfigSlotRecord> result;
  Reader reader{bytes, 0U, {}};

  std::uint32_t magic = 0U;
  std::uint32_t version = 0U;
  std::uint8_t slot_kind = 0U;
  ConfigSlotRecord record;

  if (!reader.read_u32(magic) || !reader.read_u32(version)) {
    result.add_issue(StorageIssue{"config_slot", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, reader.error});
    return result;
  }
  if (magic != kConfigSlotMagic || version != kConfigSlotVersion) {
    result.add_issue(StorageIssue{"config_slot", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, "Config slot record header is invalid."});
    return result;
  }
  if (!reader.read_u8(slot_kind) ||
      !reader.read_u32(record.schema_version) ||
      !reader.read_u32(record.config_version) ||
      !reader.read_u32(record.payload_crc32) ||
      !reader.read_string(record.payload_fingerprint) ||
      !reader.read_u64(record.saved_sequence) ||
      !reader.read_bytes(record.payload_bytes)) {
    result.add_issue(StorageIssue{"config_slot", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, reader.error});
    return result;
  }
  if (reader.offset != bytes.size()) {
    result.add_issue(StorageIssue{"config_slot", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, "Config slot record contains trailing bytes."});
    return result;
  }

  record.slot_kind = static_cast<ConfigSlotKind>(slot_kind);
  result.value = std::move(record);
  return result;
}

ByteBuffer serialize_totalizer_record(const ProtectedTotalizerRecord& record) {
  Writer writer;
  writer.write_u32(kTotalizerMagic);
  writer.write_u32(kTotalizerVersion);
  writer.write_string(record.key);
  writer.write_u8(static_cast<std::uint8_t>(record.value_type));
  writer.write_bool(record.protected_value);
  writer.write_u64(record.pulse_value);
  writer.write_double(record.volume_value);
  writer.write_u64(record.revision);
  return writer.bytes;
}

StorageResult<ProtectedTotalizerRecord> deserialize_totalizer_record(const ByteBuffer& bytes) {
  StorageResult<ProtectedTotalizerRecord> result;
  Reader reader{bytes, 0U, {}};

  std::uint32_t magic = 0U;
  std::uint32_t version = 0U;
  std::uint8_t value_type = 0U;
  ProtectedTotalizerRecord record;

  if (!reader.read_u32(magic) || !reader.read_u32(version)) {
    result.add_issue(StorageIssue{"totalizer", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, reader.error});
    return result;
  }
  if (magic != kTotalizerMagic || version != kTotalizerVersion) {
    result.add_issue(StorageIssue{"totalizer", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, "Totalizer record header is invalid."});
    return result;
  }
  if (!reader.read_string(record.key) ||
      !reader.read_u8(value_type) ||
      !reader.read_bool(record.protected_value) ||
      !reader.read_u64(record.pulse_value) ||
      !reader.read_double(record.volume_value) ||
      !reader.read_u64(record.revision)) {
    result.add_issue(StorageIssue{"totalizer", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, reader.error});
    return result;
  }
  if (reader.offset != bytes.size()) {
    result.add_issue(StorageIssue{"totalizer", "STORAGE_INTERNAL_SNAPSHOT_ERROR", StorageSeverity::error, "Totalizer record contains trailing bytes."});
    return result;
  }

  record.value_type = static_cast<TotalizerValueType>(value_type);
  result.value = std::move(record);
  return result;
}

bool starts_with(const std::string& value, const std::string& prefix) {
  return value.size() >= prefix.size() && value.compare(0, prefix.size(), prefix) == 0;
}

}  // namespace

std::optional<ByteBuffer> InMemoryStorageBackend::read_record(const std::string& key) const {
  const auto it = records_.find(key);
  if (it == records_.end()) {
    return std::nullopt;
  }
  return it->second;
}

bool InMemoryStorageBackend::write_record(const std::string& key, const ByteBuffer& bytes) {
  records_[key] = bytes;
  return true;
}

bool InMemoryStorageBackend::erase_record(const std::string& key) {
  return records_.erase(key) > 0U;
}

bool InMemoryStorageBackend::record_exists(const std::string& key) const {
  return records_.find(key) != records_.end();
}

std::vector<std::string> InMemoryStorageBackend::list_record_keys() const {
  std::vector<std::string> keys;
  keys.reserve(records_.size());
  for (const auto& [key, _] : records_) {
    keys.push_back(key);
  }
  return keys;
}

void InMemoryStorageBackend::inject_record(const std::string& key, ByteBuffer bytes) {
  records_[key] = std::move(bytes);
}

ProtectedTotalizerRecord make_raw_pulse_totalizer(std::string key, std::uint64_t value, bool protected_value) {
  ProtectedTotalizerRecord record;
  record.key = std::move(key);
  record.value_type = TotalizerValueType::raw_pulse_u64;
  record.protected_value = protected_value;
  record.pulse_value = value;
  record.volume_value = 0.0;
  record.revision = 1U;
  return record;
}

ProtectedTotalizerRecord make_volume_totalizer(std::string key, double value, bool protected_value) {
  ProtectedTotalizerRecord record;
  record.key = std::move(key);
  record.value_type = TotalizerValueType::volume_double;
  record.protected_value = protected_value;
  record.pulse_value = 0U;
  record.volume_value = value;
  record.revision = 1U;
  return record;
}

StorageService::StorageService(
    StorageBackend& backend,
    StorageServiceOptions options,
    const StorageMigrationHook* migration_hook)
    : backend_(backend), options_(options), migration_hook_(migration_hook) {}

StorageOperationResult StorageService::save_active_config(const config::DeviceConfig& config) {
  return save_config_slot(config, ConfigSlotKind::active);
}

StorageOperationResult StorageService::save_backup_config(const config::DeviceConfig& config) {
  return save_config_slot(config, ConfigSlotKind::backup);
}

StorageResult<LoadedConfigSlot> StorageService::load_active_config() const {
  return load_config_slot(ConfigSlotKind::active);
}

StorageResult<LoadedConfigSlot> StorageService::load_backup_config() const {
  return load_config_slot(ConfigSlotKind::backup);
}

StorageResult<BestAvailableConfig> StorageService::load_best_available_config() {
  StorageResult<BestAvailableConfig> result;

  const auto active = load_active_config();
  result.issues.insert(result.issues.end(), active.issues.begin(), active.issues.end());
  if (active.value.has_value()) {
    const auto health = get_storage_health();
    result.issues.insert(result.issues.end(), health.issues.begin(), health.issues.end());
    if (health.value.has_value()) {
      result.value = BestAvailableConfig{active.value->config, ConfigLoadSource::active, *health.value};
    }
    return result;
  }

  const auto backup = load_backup_config();
  result.issues.insert(result.issues.end(), backup.issues.begin(), backup.issues.end());
  if (backup.value.has_value()) {
    result.add_issue(make_issue(
        active_config_key(),
        "STORAGE_BACKUP_USED",
        StorageSeverity::warning,
        "Active config was not usable; backup config was selected."));
    const auto event_result = append_event(StorageEvent{
        0U,
        EventCategory::storage,
        EventSeverity::warning,
        "STORAGE_BACKUP_USED",
        "Storage fell back to the backup config slot.",
        0U,
        "storage_service",
        {{"selected_source", "backup"}}});
    result.issues.insert(result.issues.end(), event_result.issues.begin(), event_result.issues.end());
    const auto health = get_storage_health();
    result.issues.insert(result.issues.end(), health.issues.begin(), health.issues.end());
    if (health.value.has_value()) {
      result.value = BestAvailableConfig{backup.value->config, ConfigLoadSource::backup, *health.value};
    }
    return result;
  }

  result.add_issue(make_issue(
      "config",
      "STORAGE_FACTORY_DEFAULT_USED",
      StorageSeverity::warning,
      "Neither active nor backup config was usable; factory default config was selected."));
  const auto event_result = append_event(StorageEvent{
      0U,
      EventCategory::storage,
      EventSeverity::error,
      "STORAGE_FACTORY_DEFAULT_USED",
      "Storage fell back to factory default config.",
      0U,
      "storage_service",
      {{"selected_source", "factory_default"}}});
  result.issues.insert(result.issues.end(), event_result.issues.begin(), event_result.issues.end());

  const auto health = get_storage_health();
  result.issues.insert(result.issues.end(), health.issues.begin(), health.issues.end());
  if (health.value.has_value()) {
    result.value = BestAvailableConfig{config::factory_default_config(), ConfigLoadSource::factory_default, *health.value};
  }
  return result;
}

StorageOperationResult StorageService::validate_before_activate(const config::DeviceConfig& config) const {
  StorageOperationResult result;
  const auto validation = config::validate_config(config);
  if (!validation.valid) {
    result.success = false;
    result.add_issue(make_issue(
        "config",
        "STORAGE_CONFIG_INVALID",
        StorageSeverity::error,
        "Configuration failed validation and cannot be activated."));
  }
  const auto validation_issues = convert_validation_issues(validation, "config");
  result.issues.insert(result.issues.end(), validation_issues.begin(), validation_issues.end());
  return result;
}

StorageOperationResult StorageService::activate_config(const config::DeviceConfig& config) {
  return save_active_config(config);
}

StorageOperationResult StorageService::factory_reset() {
  StorageOperationResult result;
  const auto save_result = save_active_config(config::factory_default_config());
  result.issues.insert(result.issues.end(), save_result.issues.begin(), save_result.issues.end());
  if (!save_result.success) {
    result.success = false;
    return result;
  }

  if (options_.clear_backup_on_factory_reset) {
    backend_.erase_record(backup_config_key());
  } else {
    const auto backup_result = save_backup_config(config::factory_default_config());
    result.issues.insert(result.issues.end(), backup_result.issues.begin(), backup_result.issues.end());
    if (!backup_result.success) {
      result.success = false;
      return result;
    }
  }

  if (!options_.preserve_event_log_on_factory_reset) {
    const auto clear_result = clear_events();
    result.issues.insert(result.issues.end(), clear_result.issues.begin(), clear_result.issues.end());
    if (!clear_result.success) {
      result.success = false;
      return result;
    }
  }

  const auto event_result = append_event(StorageEvent{
      0U,
      EventCategory::maintenance,
      EventSeverity::warning,
      "STORAGE_FACTORY_RESET",
      "Factory reset restored active config to factory defaults.",
      0U,
      "storage_service",
      {{"backup_policy", options_.clear_backup_on_factory_reset ? "cleared" : "factory_default"},
       {"event_log_policy", options_.preserve_event_log_on_factory_reset ? "preserved" : "cleared"}}});
  result.issues.insert(result.issues.end(), event_result.issues.begin(), event_result.issues.end());
  if (!event_result.success) {
    result.success = false;
  }
  return result;
}

StorageResult<StorageHealthStatus> StorageService::get_storage_health() const {
  StorageResult<StorageHealthStatus> result;
  StorageHealthStatus health;
  health.active_slot = inspect_slot(ConfigSlotKind::active);
  health.backup_slot = inspect_slot(ConfigSlotKind::backup);

  const auto events = load_event_log_record();
  result.issues.insert(result.issues.end(), events.issues.begin(), events.issues.end());
  if (events.value.has_value()) {
    health.event_count = events.value->events.size();
  }

  const auto totalizers = read_all_totalizer_records();
  result.issues.insert(result.issues.end(), totalizers.issues.begin(), totalizers.issues.end());
  if (totalizers.value.has_value()) {
    health.protected_totalizer_count = static_cast<std::size_t>(std::count_if(
        totalizers.value->begin(),
        totalizers.value->end(),
        [](const ProtectedTotalizerRecord& record) { return record.protected_value; }));
  }

  result.value = std::move(health);
  return result;
}

StorageOperationResult StorageService::append_event(const StorageEvent& event) {
  StorageOperationResult result;
  const auto existing = load_event_log_record();
  result.issues.insert(result.issues.end(), existing.issues.begin(), existing.issues.end());
  if (!existing.value.has_value()) {
    result.success = false;
    return result;
  }

  auto record = *existing.value;
  auto append_result = append_event_record(record, event);
  result.issues.insert(result.issues.end(), append_result.issues.begin(), append_result.issues.end());

  const auto store_result = store_event_log_record(record);
  result.issues.insert(result.issues.end(), store_result.issues.begin(), store_result.issues.end());
  if (!store_result.success) {
    result.success = false;
  }
  return result;
}

StorageResult<std::vector<StorageEvent>> StorageService::read_events() const {
  StorageResult<std::vector<StorageEvent>> result;
  const auto record = load_event_log_record();
  result.issues.insert(result.issues.end(), record.issues.begin(), record.issues.end());
  if (!record.value.has_value()) {
    return result;
  }
  result.value = record.value->events;
  return result;
}

StorageOperationResult StorageService::clear_events() {
  EventLogRecord record;
  record.max_entries = options_.event_log_max_entries;
  return store_event_log_record(record);
}

StorageResult<ProtectedTotalizerRecord> StorageService::read_protected_totalizer(const std::string& key) const {
  StorageResult<ProtectedTotalizerRecord> result;
  const std::string record_key = totalizer_key(key);
  const auto bytes = backend_.read_record(record_key);
  if (!bytes.has_value()) {
    result.add_issue(make_issue(record_key, "STORAGE_RECORD_MISSING", StorageSeverity::warning, "Requested totalizer record is missing."));
    return result;
  }

  const auto decoded = deserialize_totalizer_record(*bytes);
  result.issues.insert(result.issues.end(), decoded.issues.begin(), decoded.issues.end());
  if (decoded.value.has_value()) {
    result.value = decoded.value;
  }
  return result;
}

StorageOperationResult StorageService::write_protected_totalizer(const ProtectedTotalizerRecord& record) {
  return write_totalizer_record(record);
}

StorageOperationResult StorageService::reset_non_protected_totals() {
  StorageOperationResult result;
  const auto records = read_all_totalizer_records();
  result.issues.insert(result.issues.end(), records.issues.begin(), records.issues.end());
  if (!records.value.has_value()) {
    result.success = false;
    return result;
  }

  for (auto record : *records.value) {
    if (record.protected_value) {
      continue;
    }
    if (record.value_type == TotalizerValueType::raw_pulse_u64) {
      record.pulse_value = 0U;
    } else {
      record.volume_value = 0.0;
    }
    ++record.revision;
    const auto write_result = write_totalizer_record(record);
    result.issues.insert(result.issues.end(), write_result.issues.begin(), write_result.issues.end());
    if (!write_result.success) {
      result.success = false;
    }
  }

  return result;
}

StorageOperationResult StorageService::reset_protected_totals() {
  StorageOperationResult result;
  result.success = false;
  result.add_issue(make_issue(
      "totalizers",
      "STORAGE_PROTECTED_TOTAL_RESET_DENIED",
      StorageSeverity::error,
      "Protected lifetime totalizers cannot be reset in normal flow."));
  const auto event_result = append_event(StorageEvent{
      0U,
      EventCategory::totalizer,
      EventSeverity::error,
      "STORAGE_PROTECTED_TOTAL_RESET_DENIED",
      "Attempted reset of protected lifetime totalizers was denied.",
      0U,
      "storage_service",
      {}});
  result.issues.insert(result.issues.end(), event_result.issues.begin(), event_result.issues.end());
  return result;
}

const std::string& StorageService::active_config_key() {
  static const std::string key = slot_key(ConfigSlotKind::active);
  return key;
}

const std::string& StorageService::backup_config_key() {
  static const std::string key = slot_key(ConfigSlotKind::backup);
  return key;
}

const std::string& StorageService::event_log_key() {
  static const std::string key = "event_log";
  return key;
}

std::string StorageService::totalizer_key(const std::string& logical_key) {
  return std::string{kTotalizerPrefix} + logical_key;
}

StorageOperationResult StorageService::save_config_slot(const config::DeviceConfig& config, ConfigSlotKind slot_kind) {
  StorageOperationResult result = validate_before_activate(config);
  if (!result.success) {
    return result;
  }

  const ByteBuffer payload = build_config_snapshot(config);
  const std::uint32_t payload_crc32 = crc32(payload);
  ConfigSlotRecord record;
  record.slot_kind = slot_kind;
  record.schema_version = config.schema_version;
  record.config_version = config.config_version;
  record.payload_crc32 = payload_crc32;
  record.payload_fingerprint = crc32_fingerprint(payload_crc32);
  record.saved_sequence = next_saved_sequence();
  record.payload_bytes = payload;
  return write_config_slot_record(record);
}

StorageResult<LoadedConfigSlot> StorageService::load_config_slot(ConfigSlotKind slot_kind) const {
  StorageResult<LoadedConfigSlot> result;
  const auto record_result = read_config_slot_record(slot_kind);
  result.issues.insert(result.issues.end(), record_result.issues.begin(), record_result.issues.end());
  if (!record_result.value.has_value()) {
    return result;
  }

  auto record = *record_result.value;
  const auto snapshot_result = parse_config_snapshot(record.payload_bytes);
  result.issues.insert(result.issues.end(), snapshot_result.issues.begin(), snapshot_result.issues.end());
  if (!snapshot_result.value.has_value()) {
    return result;
  }

  config::DeviceConfig config = *snapshot_result.value;
  if (record.schema_version != config::factory_default_config().schema_version) {
    if (migration_hook_ == nullptr) {
      result.add_issue(make_issue(
          slot_key(slot_kind),
          "STORAGE_MIGRATION_REQUIRED",
          StorageSeverity::error,
          "Stored config schema requires migration but no migration hook is registered."));
      return result;
    }

    const auto migration = migration_hook_->migrate_config(config, record.schema_version, slot_kind);
    result.issues.insert(result.issues.end(), migration.issues.begin(), migration.issues.end());
    if (!migration.value.has_value()) {
      return result;
    }
    config = *migration.value;
  }

  const auto validation = config::validate_config(config);
  if (!validation.valid) {
    result.add_issue(make_issue(
        slot_key(slot_kind),
        "STORAGE_CONFIG_INVALID",
        StorageSeverity::error,
        "Stored config failed validation and cannot be used."));
  }
  const auto validation_issues = convert_validation_issues(validation, slot_key(slot_kind));
  result.issues.insert(result.issues.end(), validation_issues.begin(), validation_issues.end());
  if (!validation.valid) {
    return result;
  }

  result.value = LoadedConfigSlot{record, config};
  return result;
}

StorageOperationResult StorageService::write_config_slot_record(const ConfigSlotRecord& record) {
  StorageOperationResult result;
  const auto bytes = serialize_config_slot_record(record);
  if (!backend_.write_record(slot_key(record.slot_kind), bytes)) {
    result.success = false;
    result.add_issue(make_issue(
        slot_key(record.slot_kind),
        "STORAGE_WRITE_FAILED",
        StorageSeverity::error,
        "Backend rejected config slot write."));
  }
  return result;
}

StorageResult<ConfigSlotRecord> StorageService::read_config_slot_record(ConfigSlotKind slot_kind) const {
  StorageResult<ConfigSlotRecord> result;
  const std::string key = slot_key(slot_kind);
  const auto bytes = backend_.read_record(key);
  if (!bytes.has_value()) {
    result.add_issue(make_issue(key, "STORAGE_RECORD_MISSING", StorageSeverity::warning, "Config slot record is missing."));
    return result;
  }

  const auto decoded = deserialize_config_slot_record(*bytes);
  result.issues.insert(result.issues.end(), decoded.issues.begin(), decoded.issues.end());
  if (!decoded.value.has_value()) {
    return result;
  }

  const std::uint32_t actual_crc = crc32(decoded.value->payload_bytes);
  if (actual_crc != decoded.value->payload_crc32) {
    result.add_issue(make_issue(
        key,
        "STORAGE_CRC_MISMATCH",
        StorageSeverity::error,
        "Config slot CRC check failed."));
    return result;
  }

  result.value = decoded.value;
  return result;
}

StorageResult<EventLogRecord> StorageService::load_event_log_record() const {
  StorageResult<EventLogRecord> result;
  const auto bytes = backend_.read_record(event_log_key());
  if (!bytes.has_value()) {
    EventLogRecord record;
    record.max_entries = options_.event_log_max_entries;
    result.value = record;
    return result;
  }

  const auto decoded = deserialize_event_log_record(*bytes);
  result.issues.insert(result.issues.end(), decoded.issues.begin(), decoded.issues.end());
  if (decoded.value.has_value()) {
    result.value = decoded.value;
  }
  return result;
}

StorageOperationResult StorageService::store_event_log_record(const EventLogRecord& record) {
  StorageOperationResult result;
  if (!backend_.write_record(event_log_key(), serialize_event_log_record(record))) {
    result.success = false;
    result.add_issue(make_issue(
        event_log_key(),
        "STORAGE_WRITE_FAILED",
        StorageSeverity::error,
        "Backend rejected event log write."));
  }
  return result;
}

StorageOperationResult StorageService::write_totalizer_record(const ProtectedTotalizerRecord& record) {
  StorageOperationResult result;
  if (!backend_.write_record(totalizer_key(record.key), serialize_totalizer_record(record))) {
    result.success = false;
    result.add_issue(make_issue(
        totalizer_key(record.key),
        "STORAGE_WRITE_FAILED",
        StorageSeverity::error,
        "Backend rejected totalizer write."));
  }
  return result;
}

StorageResult<std::vector<ProtectedTotalizerRecord>> StorageService::read_all_totalizer_records() const {
  StorageResult<std::vector<ProtectedTotalizerRecord>> result;
  std::vector<ProtectedTotalizerRecord> records;

  for (const auto& key : backend_.list_record_keys()) {
    if (!starts_with(key, kTotalizerPrefix)) {
      continue;
    }

    const auto bytes = backend_.read_record(key);
    if (!bytes.has_value()) {
      continue;
    }

    const auto decoded = deserialize_totalizer_record(*bytes);
    result.issues.insert(result.issues.end(), decoded.issues.begin(), decoded.issues.end());
    if (decoded.value.has_value()) {
      records.push_back(*decoded.value);
    }
  }

  result.value = std::move(records);
  return result;
}

ConfigSlotHealth StorageService::inspect_slot(ConfigSlotKind slot_kind) const {
  ConfigSlotHealth health;
  health.slot_kind = slot_kind;

  const std::string key = slot_key(slot_kind);
  const auto bytes = backend_.read_record(key);
  if (!bytes.has_value()) {
    health.state = ConfigSlotHealthState::missing;
    return health;
  }

  const auto decoded = deserialize_config_slot_record(*bytes);
  if (!decoded.value.has_value()) {
    health.state = ConfigSlotHealthState::corrupted;
    return health;
  }

  health.schema_version = decoded.value->schema_version;
  health.config_version = decoded.value->config_version;
  health.stored_crc32 = decoded.value->payload_crc32;
  health.computed_crc32 = crc32(decoded.value->payload_bytes);
  if (health.computed_crc32.value() != health.stored_crc32) {
    health.state = ConfigSlotHealthState::corrupted;
    return health;
  }

  const auto snapshot = parse_config_snapshot(decoded.value->payload_bytes);
  if (!snapshot.value.has_value()) {
    health.state = ConfigSlotHealthState::corrupted;
    return health;
  }

  const auto validation = config::validate_config(*snapshot.value);
  health.state = validation.valid ? ConfigSlotHealthState::ok : ConfigSlotHealthState::invalid;
  return health;
}

StorageIssue StorageService::make_issue(
    std::string path,
    std::string code,
    StorageSeverity severity,
    std::string message) const {
  return StorageIssue{std::move(path), std::move(code), severity, std::move(message)};
}

std::vector<StorageIssue> StorageService::convert_validation_issues(
    const config::ValidationResult& result,
    const std::string& path_prefix) const {
  std::vector<StorageIssue> issues;
  issues.reserve(result.issues.size());
  for (const auto& issue : result.issues) {
    issues.push_back(StorageIssue{
        path_prefix + "." + issue.path,
        issue.code,
        to_storage_severity(issue.severity),
        issue.message});
  }
  return issues;
}

std::uint64_t StorageService::next_saved_sequence() {
  return save_sequence_++;
}

}  // namespace controller::storage
