#include <iostream>

#include "display/display_service.hpp"
#include "display_test_support.hpp"

using controller::display::DisplayScreen;

int main() {
  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "display test context should initialize");

    auto descriptor = display_test::make_display_descriptor();
    descriptor.enabled_screens = {DisplayScreen::mqtt};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "mqtt display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "mqtt tick should succeed without configured bridge");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "mqtt frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 1U && frame.value->lines[0] == "MQTT not configu",
        "mqtt screen should show a clear not-configured state");
  }

  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    display_test::expect_true(context.mqtt_service.register_bridge(display_test::make_mqtt_descriptor()).ok(), "mqtt bridge should register");

    auto descriptor = display_test::make_display_descriptor("local.mqtt", "MQTT OLED");
    descriptor.enabled_screens = {DisplayScreen::mqtt};
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "configured mqtt display should register");
    display_test::expect_true(context.display_service.tick(0U).ok(), "configured mqtt tick should succeed");

    const auto frame = context.display_service.get_current_frame(descriptor.id);
    display_test::expect_true(frame.ok(), "configured mqtt frame should exist");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && frame.value->lines[0] == "Disconnected",
        "mqtt screen should surface bridge connection state");
    display_test::expect_true(
        frame.ok() && frame.value->lines.size() >= 2U && display_test::contains_text(frame.value->lines[1], "plant/"),
        "mqtt screen should show topic prefix summary");
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_mqtt failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_mqtt passed\n";
  return 0;
}
