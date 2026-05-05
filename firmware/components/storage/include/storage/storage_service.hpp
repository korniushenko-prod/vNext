#pragma once

#include <cstddef>
#include <string>
#include <vector>

#include "config/config_validation.hpp"
#include "storage/storage_backend.hpp"
#include "storage/storage_event_log.hpp"
#include "storage/storage_totalizers.hpp"
#include "storage/storage_types.hpp"

namespace controller::storage {

class StorageMigrationHook {
 public:
  virtual ~StorageMigrationHook() = default;

  virtual StorageResult<config::DeviceConfig> migrate_config(
      const config::DeviceConfig& stored_config,
      std::uint32_t stored_schema_version,
      ConfigSlotKind slot_kind) const = 0;
};

struct StorageServiceOptions {
  std::uint32_t event_log_max_entries{64U};
  bool preserve_event_log_on_factory_reset{true};
  bool clear_backup_on_factory_reset{true};
};

class StorageService {
 public:
  StorageService(
      StorageBackend& backend,
      StorageServiceOptions options = {},
      const StorageMigrationHook* migration_hook = nullptr);

  StorageOperationResult save_active_config(const config::DeviceConfig& config);
  StorageOperationResult save_backup_config(const config::DeviceConfig& config);
  StorageResult<LoadedConfigSlot> load_active_config() const;
  StorageResult<LoadedConfigSlot> load_backup_config() const;
  StorageResult<BestAvailableConfig> load_best_available_config();
  StorageOperationResult validate_before_activate(const config::DeviceConfig& config) const;
  StorageOperationResult activate_config(const config::DeviceConfig& config);
  StorageOperationResult factory_reset();
  StorageResult<StorageHealthStatus> get_storage_health() const;

  StorageOperationResult append_event(const StorageEvent& event);
  StorageResult<std::vector<StorageEvent>> read_events() const;
  StorageOperationResult clear_events();

  StorageResult<ProtectedTotalizerRecord> read_protected_totalizer(const std::string& key) const;
  StorageOperationResult write_protected_totalizer(const ProtectedTotalizerRecord& record);
  StorageOperationResult reset_non_protected_totals();
  StorageOperationResult reset_protected_totals();

  static const std::string& active_config_key();
  static const std::string& backup_config_key();
  static const std::string& event_log_key();
  static std::string totalizer_key(const std::string& logical_key);

 private:
  StorageOperationResult save_config_slot(const config::DeviceConfig& config, ConfigSlotKind slot_kind);
  StorageResult<LoadedConfigSlot> load_config_slot(ConfigSlotKind slot_kind) const;
  StorageOperationResult write_config_slot_record(const ConfigSlotRecord& record);
  StorageResult<ConfigSlotRecord> read_config_slot_record(ConfigSlotKind slot_kind) const;

  StorageResult<EventLogRecord> load_event_log_record() const;
  StorageOperationResult store_event_log_record(const EventLogRecord& record);

  StorageOperationResult write_totalizer_record(const ProtectedTotalizerRecord& record);
  StorageResult<std::vector<ProtectedTotalizerRecord>> read_all_totalizer_records() const;

  ConfigSlotHealth inspect_slot(ConfigSlotKind slot_kind) const;
  StorageIssue make_issue(
      std::string path,
      std::string code,
      StorageSeverity severity,
      std::string message) const;
  std::vector<StorageIssue> convert_validation_issues(
      const config::ValidationResult& result,
      const std::string& path_prefix) const;
  std::uint64_t next_saved_sequence();

  StorageBackend& backend_;
  StorageServiceOptions options_;
  const StorageMigrationHook* migration_hook_{nullptr};
  std::uint64_t save_sequence_{1U};
};

}  // namespace controller::storage
