#include <iostream>
#include <string>

#include "config/config_defaults.hpp"
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
    storage::StorageService service{backend, storage::StorageServiceOptions{4U, true, true}};

    const auto append_result = service.append_event(storage::StorageEvent{
        0U,
        storage::EventCategory::storage,
        storage::EventSeverity::info,
        "STORAGE_TEST_EVENT",
        "Storage test event",
        0U,
        "test",
        {{"scope", "append_read"}}});
    const auto events = service.read_events();

    expect_true(append_result.success, "append_event should succeed");
    expect_true(events.value.has_value(), "read_events should return stored events");
    expect_true(events.value.has_value() && events.value->size() == 1U, "event log should contain appended event");
    expect_true(events.value.has_value() && events.value->front().code == "STORAGE_TEST_EVENT", "stored event code must match appended event");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend, storage::StorageServiceOptions{2U, true, true}};

    service.append_event(storage::StorageEvent{0U, storage::EventCategory::storage, storage::EventSeverity::info, "EVENT_1", "Event 1", 0U, "test", {}});
    service.append_event(storage::StorageEvent{0U, storage::EventCategory::storage, storage::EventSeverity::info, "EVENT_2", "Event 2", 0U, "test", {}});
    const auto append_result = service.append_event(storage::StorageEvent{0U, storage::EventCategory::storage, storage::EventSeverity::warning, "EVENT_3", "Event 3", 0U, "test", {}});
    const auto events = service.read_events();

    expect_true(has_issue_code(append_result.issues, "STORAGE_EVENT_LOG_FULL"), "overflow append must report max log size policy");
    expect_true(events.value.has_value() && events.value->size() == 2U, "event log must truncate to max size");
    expect_true(events.value.has_value() && events.value->front().code == "EVENT_2", "oldest event must be dropped first");
    expect_true(events.value.has_value() && events.value->back().code == "EVENT_3", "newest event must be retained");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    service.reset_protected_totals();

    const auto events = service.read_events();
    expect_true(events.value.has_value() && has_event_code(*events.value, "STORAGE_PROTECTED_TOTAL_RESET_DENIED"), "denied protected reset must add an event");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    auto active = config::factory_default_config();
    active.config_version = 1U;
    auto backup = config::factory_default_config();
    backup.config_version = 2U;

    service.save_active_config(active);
    service.save_backup_config(backup);
    corrupt_record(backend, storage::StorageService::active_config_key());
    service.load_best_available_config();
    corrupt_record(backend, storage::StorageService::backup_config_key());
    service.load_best_available_config();

    const auto events = service.read_events();
    expect_true(events.value.has_value() && has_event_code(*events.value, "STORAGE_BACKUP_USED"), "backup fallback must be logged");
    expect_true(events.value.has_value() && has_event_code(*events.value, "STORAGE_FACTORY_DEFAULT_USED"), "factory default fallback must be logged");
  }

  if (failures != 0) {
    std::cerr << "test_storage_event_log failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_storage_event_log passed\n";
  return 0;
}
