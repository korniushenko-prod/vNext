Flowmeter project for LilyGO T3 v1.6.1 / ESP32

Libraries needed:
- Adafruit SSD1306
- Adafruit GFX Library

Board package:
- esp32 by Espressif Systems

Recommended board settings:
- Board: ESP32 Dev Module
- Partition Scheme: Default 4MB with spiffs
- Flash Size: 4MB
- PSRAM: Disabled

Default Wi-Fi AP:
- SSID: FlowMeter
- Password: 12345678
- Open: http://192.168.4.1

Sensor wiring:
- Hall A -> GPIO34
- Hall B -> GPIO35
- VCC -> 3.3V
- GND -> GND

OLED wiring:
- SDA -> GPIO21
- SCL -> GPIO22
