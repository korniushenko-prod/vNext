#include <cstdint>
#include <iostream>
#include <string>

#include "signals/signal_registry.hpp"
#include "timers/timer_service.hpp"

using controller::signals::SignalRegistry;
using controller::timers::TimerDescriptor;
using controller::timers::TimerKind;
using controller::timers::TimerService;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void expect_bool(const SignalRegistry& registry, const std::string& path, const std::uint64_t now_ms, const bool expected, const std::string& message) {
  const auto result = registry.read_bool(path, now_ms);
  if (!result.ok() || result.value.value() != expected) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

void expect_int64(
    const SignalRegistry& registry,
    const std::string& path,
    const std::uint64_t now_ms,
    const std::int64_t expected,
    const std::string& message) {
  const auto result = registry.read_int64(path, now_ms);
  if (!result.ok() || result.value.value() != expected) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

TimerDescriptor make_descriptor(std::string id, const TimerKind kind, const std::uint64_t duration_ms) {
  return TimerDescriptor{
      std::move(id),
      "Signal timer",
      "Stage 6 signal timer",
      true,
      kind,
      duration_ms,
      "tests",
      true,
      false,
      true,
  };
}

}  // namespace

int main() {
  SignalRegistry registry;
  TimerService service(&registry);

  expect_true(service.register_timer(make_descriptor("timer1", TimerKind::ton, 50U)).ok(), "timer with SignalRegistry should register successfully");

  expect_true(registry.has_signal("timer1.active"), "active signal should be registered");
  expect_true(registry.has_signal("timer1.timing"), "timing signal should be registered");
  expect_true(registry.has_signal("timer1.done"), "done signal should be registered");
  expect_true(registry.has_signal("timer1.expired"), "expired signal should be registered");
  expect_true(registry.has_signal("timer1.input_state"), "input_state signal should be registered");
  expect_true(registry.has_signal("timer1.elapsed_ms"), "elapsed_ms signal should be registered");
  expect_true(registry.has_signal("timer1.remaining_ms"), "remaining_ms signal should be registered");

  expect_bool(registry, "timer1.active", 0U, false, "initial active signal should be false");
  expect_bool(registry, "timer1.timing", 0U, false, "initial timing signal should be false");
  expect_bool(registry, "timer1.done", 0U, false, "initial done signal should be false");
  expect_bool(registry, "timer1.expired", 0U, false, "initial expired signal should be false");
  expect_bool(registry, "timer1.input_state", 0U, false, "initial input_state signal should be false");
  expect_int64(registry, "timer1.elapsed_ms", 0U, 0, "initial elapsed_ms signal should be zero");
  expect_int64(registry, "timer1.remaining_ms", 0U, 50, "initial remaining_ms signal should be duration");

  expect_true(service.set_input("timer1", true, 10U).ok(), "signal-backed timer should accept input changes");
  expect_bool(registry, "timer1.active", 10U, false, "TON active signal should stay false during timing");
  expect_bool(registry, "timer1.timing", 10U, true, "TON timing signal should become true while timing");
  expect_bool(registry, "timer1.input_state", 10U, true, "input_state signal should track last input");
  expect_int64(registry, "timer1.elapsed_ms", 10U, 0, "elapsed signal should reset on rising input");
  expect_int64(registry, "timer1.remaining_ms", 10U, 50, "remaining signal should reset on rising input");

  expect_true(service.tick(40U).ok(), "signal-backed timer tick should succeed");
  expect_int64(registry, "timer1.elapsed_ms", 40U, 30, "elapsed signal should advance with tick");
  expect_int64(registry, "timer1.remaining_ms", 40U, 20, "remaining signal should decrease with tick");

  expect_true(service.tick(60U).ok(), "signal-backed timer completion tick should succeed");
  expect_bool(registry, "timer1.active", 60U, true, "TON active signal should become true after duration");
  expect_bool(registry, "timer1.timing", 60U, false, "TON timing signal should clear after duration");
  expect_bool(registry, "timer1.done", 60U, true, "TON done signal should latch after duration");
  expect_int64(registry, "timer1.elapsed_ms", 60U, 50, "elapsed signal should clamp at duration");
  expect_int64(registry, "timer1.remaining_ms", 60U, 0, "remaining signal should clamp at zero");

  expect_true(service.set_input("timer1", false, 70U).ok(), "signal-backed timer reset input should succeed");
  expect_bool(registry, "timer1.active", 70U, false, "active signal should clear on input false");
  expect_bool(registry, "timer1.timing", 70U, false, "timing signal should clear on input false");
  expect_bool(registry, "timer1.done", 70U, false, "done signal should clear on input false");
  expect_bool(registry, "timer1.input_state", 70U, false, "input_state should follow input false");
  expect_int64(registry, "timer1.elapsed_ms", 70U, 0, "elapsed signal should reset on input false");
  expect_int64(registry, "timer1.remaining_ms", 70U, 50, "remaining signal should reset on input false");

  if (failures != 0) {
    std::cerr << "test_timer_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_timer_service_signals passed\n";
  return 0;
}
