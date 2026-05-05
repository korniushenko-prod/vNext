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

bool has_event_code(const std::vector<storage::StorageEvent>& events, const std::string& code) {
  for (const auto& event : events) {
    if (event.code == code) {
      return true;
    }
  }
  return false;
}

bool same_config(const config::DeviceConfig& left, const config::DeviceConfig& right) {
  return storage::build_config_snapshot(left) == storage::build_config_snapshot(right);
}

}  // namespace

int main() {
  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};

    auto modified = config::factory_default_config();
    modified.config_version = 77U;
    modified.device.name = "Modified";
    service.save_active_config(modified);
    service.save_backup_config(modified);
    service.write_protected_totalizer(storage::make_raw_pulse_totalizer("flow1.raw_pulse_lifetime", 1234U, true));

    const auto reset_result = service.factory_reset();
    const auto active = service.load_active_config();
    const auto totalizer = service.read_protected_totalizer("flow1.raw_pulse_lifetime");

    expect_true(reset_result.success, "factory reset should succeed");
    expect_true(active.value.has_value(), "factory reset must leave active config present");
    expect_true(active.value.has_value() && same_config(active.value->config, config::factory_default_config()), "active config must become factory default");
    expect_true(totalizer.value.has_value() && totalizer.value->pulse_value == 1234U, "protected totalizer must survive factory reset");
    expect_true(!backend.record_exists(storage::StorageService::backup_config_key()), "factory reset must clear backup slot in this stage");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    service.write_protected_totalizer(storage::make_volume_totalizer("flow1.volume_lifetime", 42.5, true));

    const auto denied = service.reset_protected_totals();
    const auto events = service.read_events();

    expect_true(!denied.success, "protected total reset must be denied");
    expect_true(has_issue_code(denied.issues, "STORAGE_PROTECTED_TOTAL_RESET_DENIED"), "denied reset must return structured issue");
    expect_true(events.value.has_value() && has_event_code(*events.value, "STORAGE_PROTECTED_TOTAL_RESET_DENIED"), "denied reset must be logged");
  }

  if (failures != 0) {
    std::cerr << "test_storage_factory_reset failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_storage_factory_reset passed\n";
  return 0;
}
