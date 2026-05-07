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

void expect_u64(const std::uint64_t actual, const std::uint64_t expected, const std::string& message) {
  if (actual != expected) {
    std::cerr << "FAIL: " << message << " expected=" << expected << " actual=" << actual << '\n';
    ++failures;
  }
}

TimerDescriptor make_descriptor(std::string id, const TimerKind kind, const std::uint64_t duration_ms) {
  return TimerDescriptor{
      std::move(id),
      "Hold timer",
      "Stage 6 hold timer",
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
    service.register_timer(make_descriptor("min_on", TimerKind::min_on, 30U));

    expect_true(service.set_input("min_on", true, 100U).ok(), "MIN_ON should accept input true");
    auto state = snapshot(service, "min_on", 100U);
    expect_true(state.active && state.timing && !state.done, "MIN_ON should activate immediately and start hold");

    expect_true(service.set_input("min_on", false, 110U).ok(), "MIN_ON should accept early input false");
    state = snapshot(service, "min_on", 110U);
    expect_true(state.active && state.timing && !state.done, "MIN_ON should keep output on until minimum on-time is satisfied");

    expect_true(service.tick(129U).ok(), "MIN_ON pre-release tick should succeed");
    state = snapshot(service, "min_on", 129U);
    expect_true(state.active && state.timing, "MIN_ON should still hold output before minimum time elapses");

    expect_true(service.tick(130U).ok(), "MIN_ON release tick should succeed");
    state = snapshot(service, "min_on", 130U);
    expect_true(!state.active && !state.timing && !state.done, "MIN_ON should release output once minimum time is satisfied");
    expect_u64(state.elapsed_ms, 0U, "MIN_ON elapsed should reset after release");
    expect_u64(state.remaining_ms, 30U, "MIN_ON remaining should reset after release");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("min_off", TimerKind::min_off, 40U));

    expect_true(service.set_input("min_off", true, 0U).ok(), "MIN_OFF should accept input true");
    auto state = snapshot(service, "min_off", 0U);
    expect_true(state.active && !state.timing, "MIN_OFF should turn on immediately before any off-block");

    expect_true(service.set_input("min_off", false, 10U).ok(), "MIN_OFF false edge should start off-block");
    state = snapshot(service, "min_off", 10U);
    expect_true(!state.active && state.timing && !state.done, "MIN_OFF should force output off during off-block");

    expect_true(service.set_input("min_off", true, 20U).ok(), "MIN_OFF true during block should be queued by input state");
    state = snapshot(service, "min_off", 20U);
    expect_true(!state.active && state.timing && !state.done, "MIN_OFF should stay off until off-block completes");

    expect_true(service.tick(49U).ok(), "MIN_OFF pre-release tick should succeed");
    state = snapshot(service, "min_off", 49U);
    expect_true(!state.active && state.timing, "MIN_OFF should remain blocked before duration elapses");

    expect_true(service.tick(50U).ok(), "MIN_OFF release tick should succeed");
    state = snapshot(service, "min_off", 50U);
    expect_true(state.active && !state.timing && state.done, "MIN_OFF should allow output on after the block window completes");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("reset_hold", TimerKind::min_on, 25U));

    expect_true(service.set_input("reset_hold", true, 0U).ok(), "reset test should accept input true");
    expect_true(service.tick(10U).ok(), "reset test tick should succeed");
    expect_true(service.reset_timer("reset_hold").ok(), "reset_timer should succeed");

    auto state = snapshot(service, "reset_hold", 10U);
    expect_true(state.input_state, "reset_timer should preserve the last known input_state");
    expect_true(!state.active && !state.timing && !state.done && !state.expired, "reset_timer should clear runtime flags");
    expect_u64(state.elapsed_ms, 0U, "reset_timer should reset elapsed time");
    expect_u64(state.remaining_ms, 25U, "reset_timer should restore initial remaining time");

    expect_true(service.tick(20U).ok(), "post-reset tick should succeed");
    state = snapshot(service, "reset_hold", 20U);
    expect_true(state.active && state.timing && !state.done, "preserved input_state should restart input-driven timing on the next tick");
  }

  if (failures != 0) {
    std::cerr << "test_timer_service_hold failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_timer_service_hold passed\n";
  return 0;
}
