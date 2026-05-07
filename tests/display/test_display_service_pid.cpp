#include <algorithm>
#include <iostream>

#include "display/display_service.hpp"
#include "display_test_support.hpp"

using controller::display::DisplayScreen;

int main() {
  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "display test context should initialize");

    auto descriptor = display_test::make_display_descriptor();
    descriptor.enabled_screens = {DisplayScreen::pid};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "pid display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "pid tick should succeed without controllers");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "pid frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 1U && frame.value->lines[0] == "No PID controlle",
        "pid screen should show a clear no-controllers state");
  }

  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    display_test::expect_true(context.sequence.registry.register_signal(
                                  sequence_test::make_signal_descriptor("pid.pv2", "PID PV 2", controller::signals::SignalType::float64))
                                  .ok(),
                              "secondary pid pv signal should register");
    display_test::expect_true(context.sequence.registry.update_signal("pid.pv2", controller::signals::SignalValue{42.0}, 0U).ok(), "secondary pid pv signal should update");

    display_test::expect_true(context.pid_service.register_pid(display_test::make_pid_descriptor("loop1", "Loop 1", "pid.pv", "pwm.main")).ok(), "loop1 should register");
    display_test::expect_true(context.pid_service.register_pid(display_test::make_pid_descriptor("loop2", "Loop 2", "pid.pv2", "pwm.fan")).ok(), "loop2 should register");
    display_test::expect_true(context.pid_service.tick(100U).ok(), "pid tick should succeed");

    auto descriptor = display_test::make_display_descriptor("local.pid", "PID OLED");
    descriptor.enabled_screens = {DisplayScreen::pid};
    descriptor.preferred_pid_id = "loop2";
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "preferred pid display should register");
    display_test::expect_true(context.display_service.tick(100U).ok(), "preferred pid tick should succeed");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "preferred pid frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 1U && display_test::contains_text(frame.value->lines[0], "loop2"),
        "preferred pid selection should pick the configured controller");
    display_test::expect_true(
        frame.ok() && std::any_of(
                          frame.value->lines.begin(),
                          frame.value->lines.end(),
                          [](const std::string& line) { return line.find("Mode") != std::string::npos; }),
        "pid screen should show requested and effective mode");
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_pid failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_pid passed\n";
  return 0;
}
