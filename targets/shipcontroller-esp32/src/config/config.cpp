#include "config.h"

SystemConfig gConfig;

void loadDefaultConfig()
{
    gConfig.configVersion = CURRENT_CONFIG_VERSION;
    gConfig.boardCount = 0;
    gConfig.busCount = 0;
    gConfig.deviceCount = 0;
    gConfig.chipTemplateCount = 0;
    gConfig.boardTemplateCount = 0;
    gConfig.channelCount = 0;
    gConfig.signalCount = 0;
    gConfig.blocks.blockCount = 0;

    gConfig.wifi.mode = "sta";
    gConfig.wifi.ssid = "infinty-starlink";
    gConfig.wifi.password = "";
    gConfig.wifi.apSsid = "ESP32-CTRL";
    gConfig.wifi.apPassword = "12345678";
    gConfig.wifi.startupPolicy = "sta_only";

    gConfig.i2c.scan = true;

    gConfig.oled.enabled = true;
    gConfig.oled.showIpOnFallback = true;
    gConfig.oled.width = 128;
    gConfig.oled.height = 64;
    gConfig.oled.sda = 21;
    gConfig.oled.scl = 22;
    gConfig.oled.address = 0x3C;

    gConfig.lora.enabled = true;
    gConfig.lora.sck = 5;
    gConfig.lora.miso = 19;
    gConfig.lora.mosi = 27;
    gConfig.lora.cs = 18;
    gConfig.lora.rst = 23;
    gConfig.lora.dio0 = 26;
    gConfig.lora.dio1 = 33;
    gConfig.lora.dio2 = 32;

    gConfig.sd.enabled = false;
    gConfig.sd.cs = 13;
    gConfig.sd.mosi = 15;
    gConfig.sd.miso = 2;
    gConfig.sd.sck = 14;

    gConfig.led.enabled = true;
    gConfig.led.pin = 25;

    gConfig.battery.enabled = true;
    gConfig.battery.adcPin = 35;

    gConfig.display.enabled = gConfig.oled.enabled;
    gConfig.display.driver = "ssd1306_128x64";
    gConfig.display.width = gConfig.oled.width;
    gConfig.display.height = gConfig.oled.height;
    gConfig.display.rotation = 0;
    gConfig.display.startupScreenId = "main";
    gConfig.display.defaultLanguage = "ru";
    gConfig.display.screens = nullptr;
    gConfig.display.screenCount = 0;
    gConfig.buses = nullptr;
    gConfig.devices = nullptr;
    gConfig.externalResources = nullptr;
    gConfig.externalResourceCount = 0;

    gConfig.system.active_board = "default";
    gConfig.system.active_board_template = "";
    gConfig.system.active_chip_template = "";
}
