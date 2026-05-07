#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

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

void expect_u64(const std::uint64_t actual, const std::uint64_t expected, const std::string& message) {
  if (actual != expected) {
    std::cerr << "FAIL: " << message << " expected=" << expected << " actual=" << actual << '\n';
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

TimerDescriptor make_descriptor(
    std::string id,
    const TimerKind kind,
    const std::uint64_t duration_ms,
    const bool initial_input_state = false) {
  return TimerDescriptor{
      std::move(id),
      "Test timer",
      "Stage 6 test timer",
      true,
      kind,
      duration_ms,
      "tests",
      false,
      initial_input_state,
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

    expect_true(service.register_timer(make_descriptor("timer.ton", TimerKind::ton, 50U)).ok(), "TON registration should succeed");
    expect_true(service.register_timer(make_descriptor("timer.tof", TimerKind::tof, 40U)).ok(), "TOF registration should succeed");
    expect_true(service.register_timer(make_descriptor("timer.tp", TimerKind::tp, 30U)).ok(), "TP registration should succeed");

    const auto duplicate = service.register_timer(make_descriptor("timer.ton", TimerKind::ton, 25U));
    expect_code(duplicate, TimerErrorCode::timer_already_registered, "duplicate timer id should be rejected");

    const auto descriptors = service.list_descriptors();
    expect_true(descriptors.size() == 3U, "list_descriptors should return registered timers");
    expect_true(
        descriptors.size() == 3U && descriptors[0].id == "timer.ton" && descriptors[1].id == "timer.tof" &&
            descriptors[2].id == "timer.tp",
        "registration order should be deterministic");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("ton1", TimerKind::ton, 50U));

    expect_true(service.set_input("ton1", true, 100U).ok(), "TON set_input(true) should succeed");
    auto state = snapshot(service, "ton1", 100U);
    expect_true(!state.active && state.timing && !state.done, "TON should time before duration elapses");
    expect_u64(state.elapsed_ms, 0U, "TON elapsed should start at zero");
    expect_u64(state.remaining_ms, 50U, "TON remaining should start at duration");

    expect_true(service.tick(120U).ok(), "TON tick should succeed");
    state = snapshot(service, "ton1", 120U);
    expect_true(!state.active && state.timing && !state.done, "TON should still be timing before deadline");
    expect_u64(state.elapsed_ms, 20U, "TON elapsed should advance with tick");
    expect_u64(state.remaining_ms, 30U, "TON remaining should decrease with tick");

    expect_true(service.tick(150U).ok(), "TON completion tick should succeed");
    state = snapshot(service, "ton1", 150U);
    expect_true(state.active && !state.timing && state.done, "TON should become active after duration");
    expect_u64(state.elapsed_ms, 50U, "TON elapsed should clamp at duration");
    expect_u64(state.remaining_ms, 0U, "TON remaining should clamp at zero");

    expect_true(service.set_input("ton1", false, 160U).ok(), "TON reset input should succeed");
    state = snapshot(service, "ton1", 160U);
    expect_true(!state.active && !state.timing && !state.done, "TON should reset when input becomes false");
    expect_u64(state.elapsed_ms, 0U, "TON elapsed should reset when input becomes false");
    expect_u64(state.remaining_ms, 50U, "TON remaining should reset when input becomes false");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("tof1", TimerKind::tof, 40U));

    expect_true(service.set_input("tof1", true, 0U).ok(), "TOF set_input(true) should succeed");
    auto state = snapshot(service, "tof1", 0U);
    expect_true(state.active && !state.timing && !state.done, "TOF should become active immediately when input is true");

    expect_true(service.set_input("tof1", false, 10U).ok(), "TOF set_input(false) should start off-delay");
    state = snapshot(service, "tof1", 10U);
    expect_true(state.active && state.timing && !state.done, "TOF should stay active during off-delay");

    expect_true(service.tick(30U).ok(), "TOF mid-delay tick should succeed");
    state = snapshot(service, "tof1", 30U);
    expect_true(state.active && state.timing && !state.done, "TOF should still be active before delay expires");
    expect_u64(state.elapsed_ms, 20U, "TOF elapsed should track off-delay");
    expect_u64(state.remaining_ms, 20U, "TOF remaining should track off-delay");

    expect_true(service.tick(50U).ok(), "TOF completion tick should succeed");
    state = snapshot(service, "tof1", 50U);
    expect_true(!state.active && !state.timing && state.done, "TOF should turn off after delay expires");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("tp1", TimerKind::tp, 30U));

    expect_true(service.set_input("tp1", true, 0U).ok(), "TP rising edge should start pulse");
    auto state = snapshot(service, "tp1", 0U);
    expect_true(state.active && state.timing && !state.done, "TP should be active immediately after rising edge");

    expect_true(service.set_input("tp1", false, 10U).ok(), "TP falling edge should not cancel pulse");
    state = snapshot(service, "tp1", 10U);
    expect_true(state.active && state.timing && !state.done, "TP should ignore falling edge while pulse is active");

    expect_true(service.set_input("tp1", true, 20U).ok(), "TP second rising edge should retrigger pulse");
    state = snapshot(service, "tp1", 20U);
    expect_true(state.active && state.timing && !state.done, "TP retrigger should restart active pulse");
    expect_u64(state.elapsed_ms, 0U, "TP retrigger should reset elapsed");

    expect_true(service.tick(39U).ok(), "TP pre-expiry tick should succeed");
    state = snapshot(service, "tp1", 39U);
    expect_true(state.active && state.timing && !state.done, "TP should remain active before restarted pulse expires");

    expect_true(service.tick(50U).ok(), "TP completion tick should succeed");
    state = snapshot(service, "tp1", 50U);
    expect_true(!state.active && !state.timing && state.done, "TP should complete after restarted pulse duration");
  }

  {
    TimerService service;
    service.register_timer(make_descriptor("a", TimerKind::ton, 10U));
    service.register_timer(make_descriptor("b", TimerKind::tof, 10U));

    const auto result = service.list_snapshots(0U);
    expect_true(result.ok(), "list_snapshots should succeed");
    expect_true(result.value->size() == 2U, "list_snapshots should include every timer");
    expect_true(
        result.value->size() == 2U && result.value->at(0).id == "a" && result.value->at(1).id == "b",
        "list_snapshots should preserve registration order");
  }

  if (failures != 0) {
    std::cerr << "test_timer_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_timer_service_basic passed\n";
  return 0;
}
