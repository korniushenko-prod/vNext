#include "hal/esp32_hal.hpp"

#include <array>
#include <cctype>
#include <cstdint>
#include <optional>
#include <string>
#include <utility>

#include "driver/gpio.h"
#include "driver/i2c.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

namespace controller::hal {

namespace {

constexpr i2c_port_t kI2cPort = I2C_NUM_0;
constexpr std::size_t kOledWidth = 128U;
constexpr std::size_t kOledPages = 8U;
constexpr std::size_t kGlyphWidth = 5U;
constexpr std::size_t kGlyphSpacing = 1U;
constexpr std::size_t kPageBytes = kOledWidth;
constexpr TickType_t kI2cTimeoutTicks = pdMS_TO_TICKS(20);

HalStatus not_initialized_status() {
  return HalStatus::error(HalErrorCode::not_initialized, "Esp32DisplayHal is not initialized");
}

HalStatus invalid_config_status(const std::string& detail) {
  return HalStatus::error(HalErrorCode::invalid_range, detail);
}

HalStatus i2c_fault_status(const std::string& detail) {
  return HalStatus::error(HalErrorCode::fault, detail);
}

std::array<std::uint8_t, kGlyphWidth> glyph_for(char ch) {
  switch (std::toupper(static_cast<unsigned char>(ch))) {
    case '0':
      return {0x3E, 0x51, 0x49, 0x45, 0x3E};
    case '1':
      return {0x00, 0x42, 0x7F, 0x40, 0x00};
    case '2':
      return {0x62, 0x51, 0x49, 0x49, 0x46};
    case '3':
      return {0x22, 0x49, 0x49, 0x49, 0x36};
    case '4':
      return {0x18, 0x14, 0x12, 0x7F, 0x10};
    case '5':
      return {0x2F, 0x49, 0x49, 0x49, 0x31};
    case '6':
      return {0x3E, 0x49, 0x49, 0x49, 0x32};
    case '7':
      return {0x01, 0x71, 0x09, 0x05, 0x03};
    case '8':
      return {0x36, 0x49, 0x49, 0x49, 0x36};
    case '9':
      return {0x26, 0x49, 0x49, 0x49, 0x3E};
    case 'A':
      return {0x7E, 0x11, 0x11, 0x11, 0x7E};
    case 'B':
      return {0x7F, 0x49, 0x49, 0x49, 0x36};
    case 'C':
      return {0x3E, 0x41, 0x41, 0x41, 0x22};
    case 'D':
      return {0x7F, 0x41, 0x41, 0x22, 0x1C};
    case 'E':
      return {0x7F, 0x49, 0x49, 0x49, 0x41};
    case 'F':
      return {0x7F, 0x09, 0x09, 0x09, 0x01};
    case 'G':
      return {0x3E, 0x41, 0x49, 0x49, 0x7A};
    case 'H':
      return {0x7F, 0x08, 0x08, 0x08, 0x7F};
    case 'I':
      return {0x00, 0x41, 0x7F, 0x41, 0x00};
    case 'J':
      return {0x20, 0x40, 0x41, 0x3F, 0x01};
    case 'K':
      return {0x7F, 0x08, 0x14, 0x22, 0x41};
    case 'L':
      return {0x7F, 0x40, 0x40, 0x40, 0x40};
    case 'M':
      return {0x7F, 0x02, 0x0C, 0x02, 0x7F};
    case 'N':
      return {0x7F, 0x04, 0x08, 0x10, 0x7F};
    case 'O':
      return {0x3E, 0x41, 0x41, 0x41, 0x3E};
    case 'P':
      return {0x7F, 0x09, 0x09, 0x09, 0x06};
    case 'Q':
      return {0x3E, 0x41, 0x51, 0x21, 0x5E};
    case 'R':
      return {0x7F, 0x09, 0x19, 0x29, 0x46};
    case 'S':
      return {0x46, 0x49, 0x49, 0x49, 0x31};
    case 'T':
      return {0x01, 0x01, 0x7F, 0x01, 0x01};
    case 'U':
      return {0x3F, 0x40, 0x40, 0x40, 0x3F};
    case 'V':
      return {0x1F, 0x20, 0x40, 0x20, 0x1F};
    case 'W':
      return {0x7F, 0x20, 0x18, 0x20, 0x7F};
    case 'X':
      return {0x63, 0x14, 0x08, 0x14, 0x63};
    case 'Y':
      return {0x07, 0x08, 0x70, 0x08, 0x07};
    case 'Z':
      return {0x61, 0x51, 0x49, 0x45, 0x43};
    case '.':
      return {0x00, 0x40, 0x60, 0x00, 0x00};
    case ':':
      return {0x00, 0x36, 0x36, 0x00, 0x00};
    case '/':
      return {0x20, 0x10, 0x08, 0x04, 0x02};
    case '-':
      return {0x08, 0x08, 0x08, 0x08, 0x08};
    case '_':
      return {0x40, 0x40, 0x40, 0x40, 0x40};
    case ' ':
      return {0x00, 0x00, 0x00, 0x00, 0x00};
    default:
      return {0x02, 0x01, 0x59, 0x09, 0x06};
  }
}

HalStatus send_commands(const Esp32DisplayConfig& config, const std::initializer_list<std::uint8_t>& commands) {
  std::uint8_t payload[32]{};
  if (commands.size() + 1U > sizeof(payload)) {
    return i2c_fault_status("OLED command payload too large");
  }
  payload[0] = 0x00U;
  std::size_t index = 1U;
  for (const auto value : commands) {
    payload[index++] = value;
  }
  if (const auto error =
          i2c_master_write_to_device(kI2cPort, config.i2c_address, payload, index, kI2cTimeoutTicks);
      error != ESP_OK) {
    return i2c_fault_status("OLED command write failed");
  }
  return HalStatus::success();
}

HalStatus send_page(const Esp32DisplayConfig& config, const std::size_t page_index, const std::array<std::uint8_t, kPageBytes>& page) {
  const auto address_status = send_commands(
      config,
      {
          static_cast<std::uint8_t>(0xB0U + page_index),
          0x00U,
          0x10U,
      });
  if (!address_status.ok()) {
    return address_status;
  }

  std::uint8_t payload[kPageBytes + 1U]{};
  payload[0] = 0x40U;
  for (std::size_t index = 0; index < kPageBytes; ++index) {
    payload[index + 1U] = page[index];
  }
  if (const auto error = i2c_master_write_to_device(
          kI2cPort,
          config.i2c_address,
          payload,
          sizeof(payload),
          kI2cTimeoutTicks);
      error != ESP_OK) {
    return i2c_fault_status("OLED page write failed");
  }
  return HalStatus::success();
}

std::array<std::uint8_t, kPageBytes> render_page_text(const std::string& text, const std::size_t max_chars) {
  std::array<std::uint8_t, kPageBytes> page{};
  std::size_t column = 0U;

  for (std::size_t index = 0; index < text.size() && index < max_chars; ++index) {
    const auto glyph = glyph_for(text[index]);
    if (column + kGlyphWidth > page.size()) {
      break;
    }
    for (std::size_t glyph_index = 0; glyph_index < glyph.size(); ++glyph_index) {
      page[column++] = glyph[glyph_index];
    }
    if (column < page.size()) {
      page[column++] = 0x00U;
    }
  }

  return page;
}

}  // namespace

Esp32DisplayHal::Esp32DisplayHal(Esp32DisplayConfig config)
    : config_(std::move(config)),
      lines_(config_.layout.line_count, std::string{}),
      backlight_enabled_(config_.layout.initial_backlight_enabled) {}

HalStatus Esp32DisplayHal::initialize() {
  if (initialized_) {
    return HalStatus::success();
  }
  if (config_.sda_pin < 0 || config_.scl_pin < 0) {
    return invalid_config_status("OLED SDA/SCL pins must be bound for Esp32DisplayHal");
  }
  if (config_.layout.line_count == 0U || config_.layout.line_count > kOledPages) {
    return invalid_config_status("OLED line_count must be in the 1..8 range");
  }

  if (config_.reset_pin >= 0) {
    gpio_config_t reset_config{};
    reset_config.pin_bit_mask = 1ULL << config_.reset_pin;
    reset_config.mode = GPIO_MODE_OUTPUT;
    if (const auto error = gpio_config(&reset_config); error != ESP_OK) {
      return i2c_fault_status("OLED reset pin configuration failed");
    }
    gpio_set_level(static_cast<gpio_num_t>(config_.reset_pin), 0);
    vTaskDelay(pdMS_TO_TICKS(10));
    gpio_set_level(static_cast<gpio_num_t>(config_.reset_pin), 1);
    vTaskDelay(pdMS_TO_TICKS(10));
  }

  i2c_config_t i2c_config{};
  i2c_config.mode = I2C_MODE_MASTER;
  i2c_config.sda_io_num = static_cast<gpio_num_t>(config_.sda_pin);
  i2c_config.scl_io_num = static_cast<gpio_num_t>(config_.scl_pin);
  i2c_config.sda_pullup_en = GPIO_PULLUP_ENABLE;
  i2c_config.scl_pullup_en = GPIO_PULLUP_ENABLE;
  i2c_config.master.clk_speed = config_.i2c_frequency_hz;
  if (const auto error = i2c_param_config(kI2cPort, &i2c_config); error != ESP_OK) {
    return i2c_fault_status("i2c_param_config failed");
  }
  if (const auto error = i2c_driver_install(kI2cPort, I2C_MODE_MASTER, 0, 0, 0);
      error != ESP_OK && error != ESP_ERR_INVALID_STATE) {
    return i2c_fault_status("i2c_driver_install failed");
  }

  const std::uint8_t segment_remap = config_.rotate_180 ? 0xA0U : 0xA1U;
  const std::uint8_t com_scan = config_.rotate_180 ? 0xC0U : 0xC8U;
  const auto init_status = send_commands(
      config_,
      {
          0xAEU,
          0x20U,
          0x02U,
          segment_remap,
          com_scan,
          0xA8U,
          0x3FU,
          0xD3U,
          0x00U,
          0x40U,
          0x8DU,
          0x14U,
          0x81U,
          0x8FU,
          0xD5U,
          0x80U,
          0xD9U,
          0xF1U,
          0xDAU,
          0x12U,
          0xDBU,
          0x40U,
          0xA4U,
          0xA6U,
          0xAFU,
      });
  if (!init_status.ok()) {
    return init_status;
  }

  initialized_ = true;
  return clear();
}

HalStatus Esp32DisplayHal::clear() {
  if (!initialized_) {
    return not_initialized_status();
  }

  for (auto& line : lines_) {
    line.clear();
  }

  const std::array<std::uint8_t, kPageBytes> blank_page{};
  for (std::size_t page_index = 0; page_index < kOledPages; ++page_index) {
    const auto status = send_page(config_, page_index, blank_page);
    if (!status.ok()) {
      return status;
    }
    vTaskDelay(pdMS_TO_TICKS(1));
  }
  return HalStatus::success();
}

HalStatus Esp32DisplayHal::write_line(const std::size_t index, const std::string& text) {
  if (!initialized_) {
    return not_initialized_status();
  }

  const auto status = ensure_valid_index(index);
  if (!status.ok()) {
    return status;
  }

  const auto max_chars = config_.layout.line_width.value_or((kOledWidth / (kGlyphWidth + kGlyphSpacing)));
  lines_[index] = text.size() > max_chars ? text.substr(0U, max_chars) : text;
  const auto page = render_page_text(lines_[index], max_chars);
  const auto page_status = send_page(config_, index, page);
  if (page_status.ok()) {
    vTaskDelay(pdMS_TO_TICKS(1));
  }
  return page_status;
}

HalStatus Esp32DisplayHal::set_backlight(const bool enabled) {
  if (!initialized_) {
    return not_initialized_status();
  }

  backlight_enabled_ = enabled;
  return HalStatus::success();
}

std::size_t Esp32DisplayHal::line_count() const {
  return config_.layout.line_count;
}

std::optional<std::size_t> Esp32DisplayHal::line_width() const {
  return config_.layout.line_width;
}

HalStatus Esp32DisplayHal::ensure_valid_index(const std::size_t index) const {
  if (index >= lines_.size()) {
    return HalStatus::error(HalErrorCode::invalid_range, "display line index is out of range");
  }
  return HalStatus::success();
}

}  // namespace controller::hal
