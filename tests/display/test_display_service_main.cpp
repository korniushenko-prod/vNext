#include <iostream>

#include "display/display_service.hpp"
#include "display_test_support.hpp"

using controller::display::DisplayScreen;

int main() {
  {
    display_test::TestContext context(16U, controller::hal::DisplayConfig{6U, 16U, false});
    display_test::expect_true(context.initialize(), "display test context should initialize");

    auto descriptor = display_test::make_display_descriptor();
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "main tick should succeed");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "main frame should be available");
    display_test::expect_true(frame.ok() && frame.value->screen == DisplayScreen::main, "default screen should be main");
    display_test::expect_true(frame.ok() && frame.value->title == "MAIN", "main title should be MAIN");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && frame.value->lines[0] == "Life Idle",
        "idle lifecycle should be shown clearly");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && frame.value->lines[1] == "Program not acti",
        "idle main screen should truncate program line deterministically");

    const auto hal_title = context.display_hal.read_line(0U);
    const auto hal_line_1 = context.display_hal.read_line(1U);
    display_test::expect_true(hal_title.ok() && hal_title.value.value() == "MAIN", "title should be rendered through DisplayHAL");
    display_test::expect_true(hal_line_1.ok() && hal_line_1.value.value() == "Life Idle", "body line should be rendered through DisplayHAL");
  }

  {
    display_test::TestContext context(16U, controller::hal::DisplayConfig{6U, 10U, false});
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    auto descriptor = display_test::make_display_descriptor("local.compact", "Compact", 6U, 10U);
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "compact display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "compact main tick should succeed");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "compact frame should exist");
    if (frame.ok()) {
      for (const auto& line : frame.value->lines) {
        display_test::expect_true(line.size() <= 10U, "all main-screen lines should obey chars_per_line truncation");
      }
      if (frame.value->footer.has_value()) {
        display_test::expect_true(frame.value->footer->size() <= 10U, "main-screen footer should obey chars_per_line truncation");
      }
    }
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_main failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_main passed\n";
  return 0;
}
