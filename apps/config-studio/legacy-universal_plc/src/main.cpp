#include <Arduino.h>

#include "core/runtime/plc_runtime.h"
#include "web/server.h"

namespace {

constexpr uint32_t kCycleTimeMs = 50;
uint32_t lastCycleMs = 0;

}  // namespace

void setup()
{
    Serial.begin(115200);
    plc::runtime().begin(millis());
    plc::web::begin();
}

void loop()
{
    plc::web::update();

    const uint32_t now = millis();
    if (now - lastCycleMs < kCycleTimeMs)
    {
        return;
    }

    lastCycleMs = now;
    plc::runtime().update(now);
}
