#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "button.h"

struct ButtonRuntime {
    int inputIndex;
    int pressedIndex;
    int releasedIndex;
    int shortPressIndex;
    int longPressIndex;
    int doublePressIndex;
    int heldIndex;
    bool lastStableState;
    bool stableState;
    bool pendingSinglePress;
    bool longPressFired;
    uint32_t lastRawChangeMs;
    uint32_t lastStableChangeMs;
    uint32_t pressStartMs;
    uint32_t pendingSingleDeadlineMs;
};

static ButtonRuntime buttonRuntime[MAX_BLOCKS];
static int buttonResolvedCount = 0;

static void resetButtonRuntime(ButtonRuntime &runtime)
{
    runtime.inputIndex = -1;
    runtime.pressedIndex = -1;
    runtime.releasedIndex = -1;
    runtime.shortPressIndex = -1;
    runtime.longPressIndex = -1;
    runtime.doublePressIndex = -1;
    runtime.heldIndex = -1;
    runtime.lastStableState = false;
    runtime.stableState = false;
    runtime.pendingSinglePress = false;
    runtime.longPressFired = false;
    runtime.lastRawChangeMs = 0;
    runtime.lastStableChangeMs = 0;
    runtime.pressStartMs = 0;
    runtime.pendingSingleDeadlineMs = 0;
}

void buttonInit()
{
    buttonResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        resetButtonRuntime(buttonRuntime[i]);
    }
}

void buttonConfigure()
{
    buttonResolvedCount = 0;

    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        resetButtonRuntime(buttonRuntime[i]);
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Button || block.inputA.isEmpty() || buttonResolvedCount >= MAX_BLOCKS)
        {
            continue;
        }

        ButtonRuntime &runtime = buttonRuntime[buttonResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);

        const String base = block.id;
        gSignals.registerDerivedSignal(base + ".pressed", base + ".pressed",
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + ".released", base + ".released",
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + ".short_press", base + ".short_press",
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + ".long_press", base + ".long_press",
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + ".double_press", base + ".double_press",
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + ".held", base + ".held",
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");

        runtime.pressedIndex = gSignals.findIndex(base + ".pressed");
        runtime.releasedIndex = gSignals.findIndex(base + ".released");
        runtime.shortPressIndex = gSignals.findIndex(base + ".short_press");
        runtime.longPressIndex = gSignals.findIndex(base + ".long_press");
        runtime.doublePressIndex = gSignals.findIndex(base + ".double_press");
        runtime.heldIndex = gSignals.findIndex(base + ".held");

        const bool initialState = gSignals.readBinaryAt(runtime.inputIndex, false);
        runtime.lastStableState = initialState;
        runtime.stableState = initialState;
        runtime.lastRawChangeMs = millis();
        runtime.lastStableChangeMs = millis();
        runtime.pressStartMs = initialState ? millis() : 0;
        runtime.longPressFired = false;

        buttonResolvedCount++;
    }
}

void buttonUpdate()
{
    const uint32_t now = millis();
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Button)
        {
            continue;
        }

        if (runtimeIndex >= buttonResolvedCount)
        {
            break;
        }

        ButtonRuntime &runtime = buttonRuntime[runtimeIndex];
        const bool rawState = gSignals.readBinaryAt(runtime.inputIndex, false);
        const uint32_t debounceMs = block.debounceMs > 0 ? block.debounceMs : 50;
        const uint32_t longPressMs = block.longPressMs > 0 ? block.longPressMs : 800;
        const uint32_t doublePressMs = block.doublePressMs > 0 ? block.doublePressMs : 350;

        bool pressedPulse = false;
        bool releasedPulse = false;
        bool shortPressPulse = false;
        bool longPressPulse = false;
        bool doublePressPulse = false;

        if (rawState != runtime.stableState)
        {
            if (rawState != runtime.lastStableState)
            {
                if (now - runtime.lastRawChangeMs >= debounceMs)
                {
                    runtime.lastStableState = runtime.stableState;
                    runtime.stableState = rawState;
                    runtime.lastStableChangeMs = now;

                    if (runtime.stableState)
                    {
                        pressedPulse = true;
                        runtime.pressStartMs = now;
                        runtime.longPressFired = false;
                    }
                    else
                    {
                        releasedPulse = true;
                        const uint32_t pressDuration = runtime.pressStartMs > 0 ? now - runtime.pressStartMs : 0;
                        if (!runtime.longPressFired && pressDuration < longPressMs)
                        {
                            if (runtime.pendingSinglePress && now <= runtime.pendingSingleDeadlineMs)
                            {
                                doublePressPulse = true;
                                runtime.pendingSinglePress = false;
                                runtime.pendingSingleDeadlineMs = 0;
                            }
                            else
                            {
                                runtime.pendingSinglePress = true;
                                runtime.pendingSingleDeadlineMs = now + doublePressMs;
                            }
                        }
                    }
                }
            }
            else
            {
                runtime.lastRawChangeMs = now;
            }
        }
        else
        {
            runtime.lastRawChangeMs = now;
        }

        if (runtime.stableState && !runtime.longPressFired && runtime.pressStartMs > 0 && (now - runtime.pressStartMs >= longPressMs))
        {
            longPressPulse = true;
            runtime.longPressFired = true;
            runtime.pendingSinglePress = false;
            runtime.pendingSingleDeadlineMs = 0;
        }

        if (runtime.pendingSinglePress && now > runtime.pendingSingleDeadlineMs)
        {
            shortPressPulse = true;
            runtime.pendingSinglePress = false;
            runtime.pendingSingleDeadlineMs = 0;
        }

        gSignals.publishBinaryAt(runtime.pressedIndex, pressedPulse, SignalQuality::Good, pressedPulse ? "pressed" : "idle");
        gSignals.publishBinaryAt(runtime.releasedIndex, releasedPulse, SignalQuality::Good, releasedPulse ? "released" : "idle");
        gSignals.publishBinaryAt(runtime.shortPressIndex, shortPressPulse, SignalQuality::Good, shortPressPulse ? "short_press" : "idle");
        gSignals.publishBinaryAt(runtime.longPressIndex, longPressPulse, SignalQuality::Good, longPressPulse ? "long_press" : "idle");
        gSignals.publishBinaryAt(runtime.doublePressIndex, doublePressPulse, SignalQuality::Good, doublePressPulse ? "double_press" : "idle");
        gSignals.publishBinaryAt(runtime.heldIndex, runtime.stableState, SignalQuality::Good, runtime.stableState ? "held" : "released");

        runtimeIndex++;
    }
}
