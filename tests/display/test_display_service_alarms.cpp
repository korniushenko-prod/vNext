#include <iostream>

#include "alarms/alarm_descriptor.hpp"
#include "display/display_service.hpp"
#include "display_test_support.hpp"

using controller::alarms::AlarmDescriptor;
using controller::alarms::AlarmSeverity;
using controller::display::DisplayHistoryEventType;
using controller::display::DisplayScreen;

int main() {
  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "display test context should initialize");

    auto descriptor = display_test::make_display_descriptor();
    descriptor.enabled_screens = {DisplayScreen::alarms};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "alarms display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "alarms tick should succeed with no alarms");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "alarms frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 1U && frame.value->lines[0] == "No active alarms",
        "alarms screen should show a clear no-alarms state");
  }

  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    display_test::expect_true(context.sequence.alarm_service.register_alarm(
                                  AlarmDescriptor{
                                      "alarm.safety",
                                      "Safety Alarm",
                                      true,
                                      AlarmSeverity::safety,
                                      false,
                                      "safety alarm",
                                      "display_tests",
                                      true,
                                      true,
                                      false,
                                      true})
                                  .ok(),
                              "safety alarm should register");
    display_test::expect_true(context.sequence.alarm_service.raise_alarm("alarm.trip", 100U, "test", "trip active").ok(), "trip alarm should raise");
    display_test::expect_true(context.sequence.alarm_service.raise_alarm("alarm.safety", 100U, "test", "safety active").ok(), "safety alarm should raise");

    auto descriptor = display_test::make_display_descriptor("local.alarm", "Alarm OLED");
    descriptor.enabled_screens = {DisplayScreen::main, DisplayScreen::alarms};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "alarm override display should register");
    display_test::expect_true(context.display_service.tick(100U).ok(), "alarm override tick should succeed");

    const auto snapshot = context.display_service.get_snapshot(descriptor.id);
    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(snapshot.ok() && snapshot.value->alarm_override_active, "alarm override should activate on trip/safety alarm");
    display_test::expect_true(snapshot.ok() && snapshot.value->current_screen == DisplayScreen::alarms, "alarm override should force alarms screen");
    display_test::expect_true(frame.ok() && frame.value->screen == DisplayScreen::alarms, "rendered frame should switch to alarms screen");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && display_test::contains_text(frame.value->lines[1], "safety"),
        "alarms screen should show highest severity summary");

    display_test::expect_true(context.sequence.alarm_service.clear_condition("alarm.trip", 200U, "test", "trip clear").ok(), "trip alarm should clear");
    display_test::expect_true(context.sequence.alarm_service.clear_condition("alarm.safety", 200U, "test", "safety clear").ok(), "safety alarm should clear");
    display_test::expect_true(context.display_service.tick(200U).ok(), "alarm override clear tick should succeed");

    const auto cleared = context.display_service.get_snapshot(descriptor.id);
    display_test::expect_true(cleared.ok() && !cleared.value->alarm_override_active, "alarm override should clear when alarms clear");
    display_test::expect_true(cleared.ok() && cleared.value->current_screen == DisplayScreen::main, "screen should return to underlying selection after override");

    const auto history = context.display_service.read_history(descriptor.id);
    bool saw_enter = false;
    bool saw_clear = false;
    if (history.ok()) {
      for (const auto& entry : *history.value) {
        saw_enter = saw_enter || entry.event_type == DisplayHistoryEventType::alarm_override_entered;
        saw_clear = saw_clear || entry.event_type == DisplayHistoryEventType::alarm_override_cleared;
      }
    }
    display_test::expect_true(history.ok(), "display history should be readable");
    display_test::expect_true(saw_enter && saw_clear, "display history should record alarm override entry and clear");
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_alarms failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_alarms passed\n";
  return 0;
}
