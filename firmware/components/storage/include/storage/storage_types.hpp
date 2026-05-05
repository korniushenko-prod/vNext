#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "config/config_types.hpp"

namespace controller::storage {

using ByteBuffer = std::vector<std::uint8_t>;

enum class StorageSeverity { info, warning, error };

enum class ConfigSlotKind { active, backup };

enum class ConfigLoadSource { active, backup, factory_default };

enum class ConfigSlotHealthState { ok, missing, corrupted, invalid };

struct StorageIssue {
  std::string path;
  std::string code;
  StorageSeverity severity{StorageSeverity::error};
  std::string message;
};

struct StorageOutcome {
  std::vector<StorageIssue> issues;

  bool has_errors() const;
  bool has_warnings() const;
  void add_issue(StorageIssue issue);
};

template <typename T>
struct StorageResult : StorageOutcome {
  std::optional<T> value;

  bool ok() const {
    return value.has_value();
  }
};

struct StorageOperationResult : StorageOutcome {
  bool success{true};
};

struct ConfigSlotRecord {
  ConfigSlotKind slot_kind{ConfigSlotKind::active};
  std::uint32_t schema_version{0U};
  std::uint32_t config_version{0U};
  std::uint32_t payload_crc32{0U};
  std::string payload_fingerprint;
  std::uint64_t saved_sequence{0U};
  ByteBuffer payload_bytes;
};

struct LoadedConfigSlot {
  ConfigSlotRecord record;
  config::DeviceConfig config;
};

struct ConfigSlotHealth {
  ConfigSlotKind slot_kind{ConfigSlotKind::active};
  ConfigSlotHealthState state{ConfigSlotHealthState::missing};
  std::uint32_t stored_crc32{0U};
  std::optional<std::uint32_t> computed_crc32;
  std::uint32_t schema_version{0U};
  std::uint32_t config_version{0U};
};

struct StorageHealthStatus {
  ConfigSlotHealth active_slot;
  ConfigSlotHealth backup_slot;
  std::size_t event_count{0U};
  std::size_t protected_totalizer_count{0U};
};

struct BestAvailableConfig {
  config::DeviceConfig config;
  ConfigLoadSource source{ConfigLoadSource::factory_default};
  StorageHealthStatus health;
};

}  // namespace controller::storage
