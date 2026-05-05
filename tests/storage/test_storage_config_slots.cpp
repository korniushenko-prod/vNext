#include <iostream>
#include <string>

#include "config/config_defaults.hpp"
#include "storage/storage_crc.hpp"
#include "storage/storage_service.hpp"

using namespace controller;

namespace {

int failures = 0;

void expect_true(bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

bool has_issue_code(const std::vector<storage::StorageIssue>& issues, const std::string& code) {
  for (const auto& issue : issues) {
    if (issue.code == code) {
      return true;
    }
  }
  return false;
}

bool same_config(const config::DeviceConfig& left, const config::DeviceConfig& right) {
  return storage::build_config_snapshot(left) == storage::build_config_snapshot(right);
}

void corrupt_record(storage::InMemoryStorageBackend& backend, const std::string& key) {
  auto bytes = backend.read_record(key);
  if (!bytes.has_value() || bytes->empty()) {
    return;
  }
  auto corrupted = *bytes;
  corrupted.back() ^= 0x01U;
  backend.inject_record(key, std::move(corrupted));
}

}  // namespace

int main() {
  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    auto config = config::factory_default_config();
    config.config_version = 11U;

    const auto save_result = service.save_active_config(config);
    const auto load_result = service.load_active_config();

    expect_true(save_result.success, "valid config should save as active");
    expect_true(load_result.value.has_value(), "saved active config should load");
    expect_true(load_result.value.has_value() && same_config(load_result.value->config, config), "loaded active config must match saved config");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    auto config = config::factory_default_config();
    config.config_version = 22U;

    const auto save_result = service.save_backup_config(config);
    const auto load_result = service.load_backup_config();

    expect_true(save_result.success, "valid config should save as backup");
    expect_true(load_result.value.has_value(), "saved backup config should load");
    expect_true(load_result.value.has_value() && same_config(load_result.value->config, config), "loaded backup config must match saved config");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};

    auto active = config::factory_default_config();
    active.config_version = 101U;
    auto backup = config::factory_default_config();
    backup.config_version = 202U;

    service.save_active_config(active);
    service.save_backup_config(backup);
    corrupt_record(backend, storage::StorageService::active_config_key());

    const auto best = service.load_best_available_config();
    expect_true(best.value.has_value(), "backup should be selected when active slot is corrupted");
    expect_true(best.value.has_value() && best.value->source == storage::ConfigLoadSource::backup, "selected source must be backup");
    expect_true(best.value.has_value() && same_config(best.value->config, backup), "backup config must be returned after active corruption");
    expect_true(has_issue_code(best.issues, "STORAGE_CRC_MISMATCH"), "CRC mismatch on active slot must be reported");
    expect_true(has_issue_code(best.issues, "STORAGE_BACKUP_USED"), "backup fallback must be reported");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};

    auto active = config::factory_default_config();
    active.config_version = 303U;
    auto backup = config::factory_default_config();
    backup.config_version = 404U;

    service.save_active_config(active);
    service.save_backup_config(backup);
    corrupt_record(backend, storage::StorageService::active_config_key());
    corrupt_record(backend, storage::StorageService::backup_config_key());

    const auto best = service.load_best_available_config();
    expect_true(best.value.has_value(), "factory default should be available when both slots are corrupted");
    expect_true(best.value.has_value() && best.value->source == storage::ConfigLoadSource::factory_default, "selected source must be factory default");
    expect_true(best.value.has_value() && same_config(best.value->config, config::factory_default_config()), "factory default config must be returned");
    expect_true(has_issue_code(best.issues, "STORAGE_FACTORY_DEFAULT_USED"), "factory default fallback must be reported");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    auto invalid = config::factory_default_config();
    invalid.relays.front().enabled = true;
    invalid.relays.front().role = config::ActuatorRole::fuel;
    invalid.relays.front().safe_state = config::SafeState::on;

    const auto activate_result = service.activate_config(invalid);
    expect_true(!activate_result.success, "invalid config must not activate");
    expect_true(has_issue_code(activate_result.issues, "STORAGE_CONFIG_INVALID"), "invalid activation must include storage invalid issue");
    expect_true(has_issue_code(activate_result.issues, "INVALID_SAFE_STATE"), "invalid activation must include validator issue");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    auto config = config::factory_default_config();
    config.config_version = 505U;
    service.save_active_config(config);
    corrupt_record(backend, storage::StorageService::active_config_key());

    const auto active = service.load_active_config();
    expect_true(!active.value.has_value(), "corrupted active slot must not load directly");
    expect_true(has_issue_code(active.issues, "STORAGE_CRC_MISMATCH"), "direct load must detect CRC mismatch");
  }

  if (failures != 0) {
    std::cerr << "test_storage_config_slots failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_storage_config_slots passed\n";
  return 0;
}
