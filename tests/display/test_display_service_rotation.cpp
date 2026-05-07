#include <iostream>

#include "display/display_service.hpp"
#include "display_test_support.hpp"

using controller::display::DisplayHistoryEventType;
using controller::display::DisplayScreen;

int main() {
  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "display test context should initialize");

    auto descriptor = display_test::make_display_descriptor();
    descriptor.rotate_interval_ms = 100U;
    descriptor.enabled_screens = {DisplayScreen::main, DisplayScreen::program, DisplayScreen::flow};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "rotation display should register");

    display_test::expect_true(context.display_service.next_screen(descriptor.id, 10U, "test", "next").ok(), "next_screen should succeed");
    auto snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::program, "manual next should move to program screen");

    display_test::expect_true(context.display_service.previous_screen(descriptor.id, 20U, "test", "prev").ok(), "previous_screen should succeed");
    snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::main, "manual previous should return to main screen");

    display_test::expect_true(context.display_service.tick(20U).ok(), "initial tick should succeed");
    display_test::expect_true(context.display_service.tick(119U).ok(), "tick before rotate interval should succeed");
    snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::main, "screen should remain stable before rotate interval");

    display_test::expect_true(context.display_service.tick(120U).ok(), "tick at rotate interval should succeed");
    snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::program, "auto rotation should advance deterministically");
  }

  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    auto descriptor = display_test::make_display_descriptor("local.rotate", "Rotate OLED");
    descriptor.rotate_interval_ms = 100U;
    descriptor.enabled_screens = {DisplayScreen::main, DisplayScreen::alarms, DisplayScreen::mqtt};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "filtered rotation display should register");

    display_test::expect_true(context.display_service.tick(0U).ok(), "filtered rotation initial tick should succeed");
    display_test::expect_true(context.display_service.tick(100U).ok(), "filtered rotation first step should succeed");
    auto snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::alarms, "rotation should skip disabled screens and land on alarms");
    display_test::expect_true(context.display_service.tick(200U).ok(), "filtered rotation second step should succeed");
    snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::mqtt, "rotation should continue across enabled screens only");

    display_test::expect_true(context.sequence.alarm_service.raise_alarm("alarm.trip", 300U, "test", "trip active").ok(), "trip alarm should raise");
    display_test::expect_true(context.display_service.tick(300U).ok(), "alarm override tick should succeed");
    snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->alarm_override_active, "alarm override should activate during rotation");
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::alarms, "alarm override should preempt current rotation screen");

    display_test::expect_true(context.sequence.alarm_service.clear_condition("alarm.trip", 400U, "test", "trip clear").ok(), "trip alarm should clear");
    display_test::expect_true(context.display_service.tick(400U).ok(), "alarm clear tick should succeed");
    snapshot = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(snapshot.ok() && !snapshot.value->alarm_override_active, "alarm override should clear cleanly");

    const auto history = context.display_service.read_history(descriptor.id);
    bool saw_rotation = false;
    if (history.ok()) {
      for (const auto& entry : *history.value) {
        saw_rotation = saw_rotation || entry.event_type == DisplayHistoryEventType::screen_rotated;
      }
    }
    display_test::expect_true(history.ok(), "rotation history should be readable");
    display_test::expect_true(saw_rotation, "rotation history should record rotation events");
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_rotation failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_rotation passed\n";
  return 0;
}
