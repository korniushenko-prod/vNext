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
    descriptor.enabled_screens = {DisplayScreen::program};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "program display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "program tick should succeed with no active program");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "program frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 1U && frame.value->lines[0] == "Program not acti",
        "program screen should handle no active program clearly");
  }

  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    auto program = display_test::make_program();
    display_test::expect_true(context.sequence.sequence_service.register_program(program).ok(), "program should register");
    display_test::expect_true(context.sequence.sequence_service.start_program(program.id, 100U, "test", "start").ok(), "program should start");
    display_test::expect_true(context.sequence.sequence_service.tick(200U).ok(), "sequence tick should succeed");

    auto descriptor = display_test::make_display_descriptor("local.program", "Program OLED");
    descriptor.enabled_screens = {DisplayScreen::program};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "display should register");
    display_test::expect_true(context.display_service.tick(200U).ok(), "active program tick should succeed");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "active program frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && display_test::contains_text(frame.value->lines[0], "Pump 1"),
        "program screen should show active program name");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && display_test::contains_text(frame.value->lines[1], "State"),
        "program screen should show current state and elapsed time");

    display_test::expect_true(context.sequence.sequence_service.request_trip_stop(300U, "test", "trip").ok(), "trip stop should be accepted");
    display_test::expect_true(context.sequence.sequence_service.tick(300U).ok(), "trip transition tick should succeed");
    display_test::expect_true(context.sequence.sequence_service.tick(400U).ok(), "lockout transition tick should succeed");
    display_test::expect_true(context.display_service.tick(400U).ok(), "program lockout tick should succeed");

    const auto lockout_frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(lockout_frame.ok(), "lockout frame should exist");
    display_test::expect_true(
        lockout_frame.ok() &&
            ((lockout_frame.value->footer.has_value() && display_test::contains_text(*lockout_frame.value->footer, "trip")) ||
             std::any_of(
                 lockout_frame.value->lines.begin(),
                 lockout_frame.value->lines.end(),
                 [](const std::string& line) { return line.find("Lockout") != std::string::npos; })),
        "program screen should show a coherent lockout or trip summary");
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_program failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_program passed\n";
  return 0;
}
