#include <Arduino.h>
#include "flowmeter.h"
#include "../core/data_registry.h"
#include "../runtime/signal_registry.h"

float flowRate = 0;
float flowTotal = 0;
static bool flowHardwareAvailable = false;

void flowInit()
{
    gData.registerValue("flow.instant", &flowRate);
    gData.registerValue("flow.total", &flowTotal);
    gSignals.registerDerivedSignal("flow.instant", "Flow Instant", SignalClass::Analog,
        SignalDirection::Status, SignalSourceType::Virtual, "");
    gSignals.registerDerivedSignal("flow.total", "Flow Total", SignalClass::Analog,
        SignalDirection::Status, SignalSourceType::Virtual, "");

    flowRate = 0;
    flowTotal = 0;
    flowHardwareAvailable = false;
    Serial.println("FLOW INIT: no hardware source configured, values will remain at 0");
}

void flowUpdate()
{
    if (!flowHardwareAvailable)
    {
        flowRate = 0;
        gSignals.publishAnalog("flow.instant", flowRate, flowRate, SignalQuality::Stale, "no hardware source");
        gSignals.publishAnalog("flow.total", flowTotal, flowTotal, SignalQuality::Stale, "no hardware source");
        return;
    }

    gSignals.publishAnalog("flow.instant", flowRate, flowRate, SignalQuality::Good, "ok");
    gSignals.publishAnalog("flow.total", flowTotal, flowTotal, SignalQuality::Good, "ok");
}
