#include <Arduino.h>
#include <Wire.h>
#include "../config/config.h"

void i2cScan()
{
    if (!gConfig.i2c.scan) return;

    Serial.println("I2C scan...");

    for (uint8_t addr = 1; addr < 127; addr++)
    {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0)
        {
            Serial.print("Found: 0x");
            Serial.println(addr, HEX);
        }
    }
}