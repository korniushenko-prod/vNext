#include <Arduino.h>
#include "../config/feature_flags.h"
#if FEATURE_LORA
#include <SPI.h>
#include <LoRa.h>
#endif
#include "../core/status.h"
#include "../config/config.h"

void loraInit()
{
#if FEATURE_LORA
    if (!gConfig.lora.enabled)
    {
        Serial.println("LoRa disabled");
        return;
    }

    SPI.begin(
        gConfig.lora.sck,
        gConfig.lora.miso,
        gConfig.lora.mosi,
        gConfig.lora.cs
    );

    LoRa.setPins(
        gConfig.lora.cs,
        gConfig.lora.rst,
        gConfig.lora.dio0
    );

    if (!LoRa.begin(433E6))
    {
        Serial.println("LoRa FAIL");
        gStatus.lora = MODULE_FAIL;
    }
    else
    {
        Serial.println("LoRa OK");
        gStatus.lora = MODULE_OK;
    }
#else
    Serial.println("LoRa build feature disabled");
    gStatus.lora = MODULE_UNKNOWN;
#endif
}

void loraSend(String msg)
{
    (void)msg;
#if FEATURE_LORA
    if (!gConfig.lora.enabled)
    {
        return;
    }

    LoRa.beginPacket();
    LoRa.print(msg);
    LoRa.endPacket();
#endif
}
