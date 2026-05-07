#include <cstdint>
#include <iostream>
#include <string>

#include "timers/timer_service.hpp"

using controller::timers::TimerDescriptor;
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

TimerDescriptor make_descriptor(std::string id, const TimerKind kind, const std::uint64_t duration_ms) {
  return TimerDescriptor{
      std::move(id),
      "Window timer",
      "Stage 6 window timer",
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
    service.register_timer(make_descriptor("startup", TimerKind::startup_bypass, 20U));

    expect_true(service.start_timer("startup", 0U).ok(), "STARTUP_BYPASS start_timer should succeed");
    auto state = snapshot(service, "startup", 0U);
    expect_true(state.active && state.timing && !state.done, "STARTUP_BYPASS should be active during the window");

    expect_true(service.tick(15U).ok(), "STARTUP_BYPASS mid-window tick should succeed");
    state = snapshot(service, "startup", 15U);
    expect_true(state.active && state.timing && !state.done, "STARTUP_BYPASS should stay active before duration expires");

    expect_true(service.tick(20U).ok(), "STARTUP_BYPASS completion tick should succeed");
    state = snapshot(service, "startup", 20U);
    expect_true(!state.active && !state.timing && state.done, "STARTUP_BYPASS should complete after duration");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("cooldown", TimerKind::cooldown, 30U));

    expect_true(service.start_timer("cooldown", 100U).ok(), "COOLDOWN start_timer should succeed");
    auto state = snapshot(service, "cooldown", 100U);
    expect_true(state.active && state.timing, "COOLDOWN should activate immediately");

    expect_true(service.stop_timer("cooldown", 110U).ok(), "COOLDOWN stop_timer should cancel the window early");
    state = snapshot(service, "cooldown", 110U);
    expect_true(!state.active && !state.timing && !state.done, "COOLDOWN stop_timer should reset active window state");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("state_min", TimerKind::state_min_time, 30U));

    expect_true(service.start_timer("state_min", 200U).ok(), "STATE_MIN_TIME start_timer should succeed");
    auto state = snapshot(service, "state_min", 229U);
    expect_true(state.active && state.timing && !state.done, "STATE_MIN_TIME should still be running before minimum duration");

    expect_true(service.tick(230U).ok(), "STATE_MIN_TIME completion tick should succeed");
    state = snapshot(service, "state_min", 230U);
    expect_true(!state.active && !state.timing && state.done, "STATE_MIN_TIME should mark done when minimum duration is satisfied");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("state_max", TimerKind::state_max_time, 20U));

    expect_true(service.start_timer("state_max", 300U).ok(), "STATE_MAX_TIME start_timer should succeed");
    auto state = snapshot(service, "state_max", 319U);
    expect_true(state.active && state.timing && !state.expired, "STATE_MAX_TIME should be active before the maximum duration");

    expect_true(service.tick(320U).ok(), "STATE_MAX_TIME expiry tick should succeed");
    state = snapshot(service, "state_max", 320U);
    expect_true(!state.active && !state.timing && state.expired, "STATE_MAX_TIME should latch expired at the deadline");

    expect_true(service.tick(350U).ok(), "STATE_MAX_TIME latched expiry tick should succeed");
    state = snapshot(service, "state_max", 350U);
    expect_true(state.expired && !state.active, "STATE_MAX_TIME should stay expired until stop or reset");

    expect_true(service.stop_timer("state_max", 360U).ok(), "STATE_MAX_TIME stop_timer should clear expired state");
    state = snapshot(service, "state_max", 360U);
    expect_true(!state.active && !state.timing && !state.done && !state.expired, "STATE_MAX_TIME stop_timer should reset the timer");
  }

  if (failures != 0) {
    std::cerr << "test_timer_service_windows failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_timer_service_windows passed\n";
  return 0;
}
