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
    descriptor.enabled_screens = {DisplayScreen::flow};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "flow display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "flow tick should succeed without flowmeters");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "flow frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 1U && frame.value->lines[0] == "No flowmeters",
        "flow screen should show a clear no-flowmeters state");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && frame.value->lines[1] == "Safe default",
        "flow screen should explain that the empty state is intentional");
  }

  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    display_test::expect_true(context.flow_service.register_flowmeter(display_test::make_flow_descriptor("flow1", "Flow 1", "pulse.flow1")).ok(), "flow1 should register");
    display_test::expect_true(context.flow_service.register_flowmeter(display_test::make_flow_descriptor("flow2", "Flow 2", "pulse.flow2")).ok(), "flow2 should register");
    display_test::expect_true(context.flow_service.initialize_from_storage(0U).ok(), "flow storage init should succeed");
    display_test::expect_true(context.flow_service.start_batch("flow2", 0U, std::nullopt, "test", "start").ok(), "flow2 batch should start");
    display_test::expect_true(context.flow_hal.increment_mock_count("pulse.flow2", 20U).ok(), "pulse count should increment");
    display_test::expect_true(context.flow_service.tick(1000U).ok(), "flow tick should succeed");

    auto descriptor = display_test::make_display_descriptor("local.flow", "Flow OLED");
    descriptor.enabled_screens = {DisplayScreen::flow};
    descriptor.preferred_flow_id = "flow2";
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "preferred flow display should register");
    display_test::expect_true(context.display_service.tick(1000U).ok(), "preferred flow display tick should succeed");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "preferred flow frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 1U && display_test::contains_text(frame.value->lines[0], "flow2"),
        "preferred flow selection should pick the configured flowmeter");
    display_test::expect_true(
        frame.ok() && std::any_of(
                          frame.value->lines.begin(),
                          frame.value->lines.end(),
                          [](const std::string& line) { return line.find("Rate") != std::string::npos; }),
        "flow screen should include compact rate data");
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_flow failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_flow passed\n";
  return 0;
}
