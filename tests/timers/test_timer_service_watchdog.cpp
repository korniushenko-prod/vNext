#include <cstdint>
#include <iostream>
#include <string>

#include "timers/timer_service.hpp"

using controller::timers::TimerDescriptor;
using controller::timers::TimerErrorCode;
using controller::timers::TimerKind;
using controller::timers::TimerService;
using controller::timers::TimerSnapshot;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void expect_code(
    const controller::timers::TimerOperationResult& result,
    const TimerErrorCode code,
    const std::string& message) {
  if (result.status.code != code) {
    std::cerr << "FAIL: " << message << " expected code=" << static_cast<int>(code)
              << " actual=" << static_cast<int>(result.status.code) << '\n';
    ++failures;
  }
}

TimerDescriptor make_descriptor(std::string id, const TimerKind kind, const std::uint64_t duration_ms) {
  return TimerDescriptor{
      std::move(id),
      "Watchdog timer",
      "Stage 6 watchdog timer",
      true,
      kind,
      duration_ms,
      "tests",
      false,
      false,
      true,
  };
}

TimerSnapshot snapshot(TimerService& service, const std::string& id, const std::uint64_t now_ms) {
  const auto result = service.get_snapshot(id, now_ms);
  expect_true(result.ok(), "snapshot should be available for " + id);
  return result.value.value_or(TimerSnapshot{});
}

}  // namespace

int main() {
  {
    TimerService service;
    service.register_timer(make_descriptor("wd1", TimerKind::watchdog, 50U));

    expect_true(service.arm_watchdog("wd1", 0U).ok(), "arm_watchdog should succeed");
    auto state = snapshot(service, "wd1", 0U);
    expect_true(state.armed && state.active && state.timing && !state.expired, "watchdog should be armed and timing after arm");

    expect_true(service.tick(30U).ok(), "watchdog mid-window tick should succeed");
    expect_true(service.kick_watchdog("wd1", 30U).ok(), "kick_watchdog should reset timeout while armed");
    state = snapshot(service, "wd1", 30U);
    expect_true(state.armed && state.active && state.timing && !state.expired, "watchdog should continue timing after kick");

    expect_true(service.tick(70U).ok(), "watchdog pre-expiry tick should succeed");
    state = snapshot(service, "wd1", 70U);
    expect_true(state.armed && state.active && state.timing && !state.expired, "watchdog should not expire before kicked window ends");

    expect_true(service.tick(80U).ok(), "watchdog expiry tick should succeed");
    state = snapshot(service, "wd1", 80U);
    expect_true(state.armed && state.active && !state.timing && state.expired, "watchdog should expire after timeout");

    expect_code(
        service.kick_watchdog("wd1", 81U),
        TimerErrorCode::timer_already_expired,
        "expired watchdog should reject kick until reset or disarm");

    expect_true(service.disarm_watchdog("wd1", 82U).ok(), "disarm_watchdog should clear armed expired watchdog");
    state = snapshot(service, "wd1", 82U);
    expect_true(!state.armed && !state.active && !state.timing && !state.expired, "disarm_watchdog should clear watchdog state");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("wd2", TimerKind::watchdog, 10U));

    expect_code(
        service.kick_watchdog("wd2", 0U),
        TimerErrorCode::timer_not_armed,
        "kick_watchdog should reject unarmed watchdog");
    expect_code(
        service.disarm_watchdog("wd2", 0U),
        TimerErrorCode::timer_not_armed,
        "disarm_watchdog should reject unarmed watchdog");

    expect_true(service.arm_watchdog("wd2", 0U).ok(), "arm_watchdog should succeed for second watchdog");
    expect_code(
        service.arm_watchdog("wd2", 1U),
        TimerErrorCode::timer_already_armed,
        "arm_watchdog should reject already armed watchdog");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("ton1", TimerKind::ton, 20U));

    expect_code(
        service.arm_watchdog("ton1", 0U),
        TimerErrorCode::timer_operation_unsupported,
        "arm_watchdog should be rejected for non-watchdog timer");
    expect_code(
        service.start_timer("ton1", 0U),
        TimerErrorCode::timer_operation_unsupported,
        "start_timer should be rejected for watchdog-unsupported timer kinds");
    expect_code(
        service.start_timer("wd_missing_kind", 0U),
        TimerErrorCode::timer_not_found,
        "unknown timers should report not found");
  }

  if (failures != 0) {
    std::cerr << "test_timer_service_watchdog failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_timer_service_watchdog passed\n";
  return 0;
}
