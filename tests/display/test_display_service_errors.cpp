#include <iostream>

#include "display/display_service.hpp"
#include "display_test_support.hpp"
#include "signals/signal_descriptor.hpp"
#include "signals/signal_registry.hpp"

using controller::display::DisplayErrorCode;
using controller::display::DisplayScreen;

namespace {

class FailingDisplayHal final : public controller::hal::DisplayHal {
 public:
  controller::hal::HalStatus initialize() override {
    return controller::hal::HalStatus::success();
  }

  controller::hal::HalStatus clear() override {
    return controller::hal::HalStatus::success();
  }

  controller::hal::HalStatus write_line(std::size_t, const std::string&) override {
    return controller::hal::HalStatus::error(controller::hal::HalErrorCode::fault, "forced write failure");
  }

  controller::hal::HalStatus set_backlight(bool) override {
    return controller::hal::HalStatus::success();
  }

  std::size_t line_count() const override {
    return 6U;
  }

  std::optional<std::size_t> line_width() const override {
    return 16U;
  }
};

controller::signals::SignalDescriptor make_string_signal(std::string path) {
  return controller::signals::SignalDescriptor{
      std::move(path),
      "conflict",
      "conflict signal",
      controller::signals::SignalType::string,
      "",
      "display_tests",
      controller::signals::SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

}  // namespace

int main() {
  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "display test context should initialize");

    const auto missing = context.display_service.get_snapshot("missing");
    display_test::expect_true(
        !missing.ok() && missing.status.code == DisplayErrorCode::display_not_found,
        "unknown display id should be rejected");
  }

  {
    display_test::TestContext context;
    display_test::expect_true(context.initialize(), "second display test context should initialize");

    auto descriptor = display_test::make_display_descriptor("local.empty", "Empty OLED");
    descriptor.enabled_screens.clear();
    display_test::expect_true(context.display_service.register_display(descriptor).ok(), "empty-screens display should register");

    const auto tick_status = context.display_service.tick(0U);
    display_test::expect_true(
        !tick_status.ok() && tick_status.status.code == DisplayErrorCode::display_no_enabled_screens,
        "no enabled screens should surface a stable error");
  }

  {
    controller::signals::SignalRegistry registry;
    FailingDisplayHal failing_hal;
    controller::display::DisplayService service(failing_hal, registry, 8U);

    auto descriptor = display_test::make_display_descriptor("local.fail", "Fail OLED");
    descriptor.enabled_screens = {DisplayScreen::mqtt};
    display_test::expect_true(service.register_display(descriptor).ok(), "failing display should still register");

    const auto tick_status = service.tick(0U);
    display_test::expect_true(
        !tick_status.ok() && tick_status.status.code == DisplayErrorCode::display_render_failed,
        "display HAL render failures should surface cleanly");
  }

  {
    controller::signals::SignalRegistry registry;
    controller::hal::MockDisplayHal display_hal(controller::hal::DisplayConfig{6U, 16U, false});
    controller::display::DisplayService service(display_hal, registry, 8U);

    display_test::expect_true(
        registry.register_signal(make_string_signal("display.local.signal.enabled"), controller::signals::SignalValue{std::string{"bad"}}, 0U).ok(),
        "conflicting signal should register");

    auto descriptor = display_test::make_display_descriptor("local.signal", "Signal OLED");
    const auto register_status = service.register_display(descriptor);
    display_test::expect_true(
        !register_status.ok() && register_status.status.code == DisplayErrorCode::display_signal_publish_failed,
        "signal publish failures should surface during display registration");
  }

  if (display_test::failures != 0) {
    std::cerr << "test_display_service_errors failed with " << display_test::failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_service_errors passed\n";
  return 0;
}
