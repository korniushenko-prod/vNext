#include <cstdint>
#include <iostream>
#include <limits>
#include <string>

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

}  // namespace

int main() {
  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    const auto record = storage::make_raw_pulse_totalizer("flow1.raw_pulse_lifetime", 99U, true);

    const auto write_result = service.write_protected_totalizer(record);
    const auto read_result = service.read_protected_totalizer("flow1.raw_pulse_lifetime");

    expect_true(write_result.success, "protected totalizer write should succeed through internal API");
    expect_true(read_result.value.has_value(), "written protected totalizer should be readable");
    expect_true(read_result.value.has_value() && read_result.value->pulse_value == 99U, "pulse totalizer value must round-trip");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    service.write_protected_totalizer(storage::make_raw_pulse_totalizer("flow1.raw_pulse_lifetime", 1000U, true));
    service.write_protected_totalizer(storage::make_volume_totalizer("flow1.batch_total", 55.25, false));

    const auto reset_result = service.reset_non_protected_totals();
    const auto protected_total = service.read_protected_totalizer("flow1.raw_pulse_lifetime");
    const auto non_protected_total = service.read_protected_totalizer("flow1.batch_total");

    expect_true(reset_result.success, "normal reset of non-protected totals should succeed");
    expect_true(protected_total.value.has_value() && protected_total.value->pulse_value == 1000U, "protected total must not be cleared by normal reset");
    expect_true(non_protected_total.value.has_value() && non_protected_total.value->volume_value == 0.0, "non-protected total must be cleared by normal reset");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    service.write_protected_totalizer(storage::make_raw_pulse_totalizer("flow1.raw_pulse_lifetime", std::numeric_limits<std::uint64_t>::max(), true));

    const auto read_result = service.read_protected_totalizer("flow1.raw_pulse_lifetime");
    expect_true(read_result.value.has_value() && read_result.value->pulse_value == std::numeric_limits<std::uint64_t>::max(), "pulse lifetime totalizer must safely store uint64 max");
  }

  {
    storage::InMemoryStorageBackend backend;
    storage::StorageService service{backend};
    service.write_protected_totalizer(storage::make_volume_totalizer("flow1.volume_lifetime", 12.75, true));

    const auto denied = service.reset_protected_totals();
    const auto after_denied = service.read_protected_totalizer("flow1.volume_lifetime");
    service.factory_reset();
    const auto after_factory_reset = service.read_protected_totalizer("flow1.volume_lifetime");

    expect_true(!denied.success, "protected reset must be denied");
    expect_true(has_issue_code(denied.issues, "STORAGE_PROTECTED_TOTAL_RESET_DENIED"), "denied reset must return protected reset issue");
    expect_true(after_denied.value.has_value() && after_denied.value->volume_value == 12.75, "protected volume total must survive denied reset");
    expect_true(after_factory_reset.value.has_value() && after_factory_reset.value->volume_value == 12.75, "protected volume total must survive factory reset");
  }

  if (failures != 0) {
    std::cerr << "test_storage_totalizers failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_storage_totalizers passed\n";
  return 0;
}
