#include <Arduino.h>
#include "core/system.h"


unsigned long lastCycle = 0;
const int cycleTime = 50; // ms

#ifndef PIO_UNIT_TEST
void setup()
{
    Serial.begin(115200);
    systemInit();
}

void loop()
{
    unsigned long now = millis();

    if (now - lastCycle >= cycleTime)
    {
        lastCycle = now;

        systemUpdate();
    }
}
#endif
