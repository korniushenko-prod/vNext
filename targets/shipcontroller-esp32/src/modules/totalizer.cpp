#include <math.h>
#include <stdlib.h>

#include "../config/config.h"
#include "../runtime/signal_registry.h"
#include "../runtime/retained_value_store.h"

#include "totalizer.h"

struct TotalizerRuntime {
    int inputIndex;
    int resetIndex;
    int outputIndex;
    bool previousResetState;
    bool initialized;
    bool restored;
    bool retainEnabled;
    float lastInputValue;
    float totalValue;
    float lastPersistedValue;
    float saveEveryDelta;
    uint32_t lastUpdateMs;
    uint32_t lastPersistMs;
    uint32_t saveEveryMs;
    String retainedKey;
};

static TotalizerRuntime *totalizerRuntime = nullptr;
static int totalizerResolvedCount = 0;

static void freeTotalizerRuntime()
{
    if (totalizerRuntime)
    {
        free(totalizerRuntime);
        totalizerRuntime = nullptr;
    }
}

static float totalizerScaleForBlock(const BlockConfig &block)
{
    return block.compareValueA != 0.0f ? block.compareValueA : 1.0f;
}

static float totalizerInitialForBlock(const BlockConfig &block)
{
    return block.compareValueB;
}

static uint32_t totalizerUnitMs(const String &mode)
{
    if (mode == "rate_per_second")
    {
        return 1000UL;
    }
    if (mode == "rate_per_hour")
    {
        return 3600000UL;
    }
    return 60000UL;
}

static float totalizerSaveEveryDelta(const BlockConfig &block)
{
    return block.extraValueC > 0.0f ? block.extraValueC : 1.0f;
}

static uint32_t totalizerSaveEveryMs(const BlockConfig &block)
{
    const float configuredMs = block.extraValueD;
    if (configuredMs > 0.0f)
    {
        return static_cast<uint32_t>(configuredMs);
    }
    return 60000UL;
}

static String totalizerRetainedKey(const BlockConfig &block)
{
    return "totalizer:" + block.id;
}

void totalizerInit()
{
    freeTotalizerRuntime();
    totalizerResolvedCount = 0;
}

void totalizerConfigure()
{
    totalizerInit();

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::Totalizer && !block.inputA.isEmpty() && !block.outputA.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    totalizerRuntime = static_cast<TotalizerRuntime *>(calloc(static_cast<size_t>(configuredCount), sizeof(TotalizerRuntime)));
    if (!totalizerRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Totalizer || block.inputA.isEmpty() || block.outputA.isEmpty() || totalizerResolvedCount >= configuredCount)
        {
            continue;
        }

        TotalizerRuntime &runtime = totalizerRuntime[totalizerResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);
        runtime.resetIndex = gSignals.findIndex(block.inputB);
        runtime.outputIndex = -1;
        runtime.totalValue = totalizerInitialForBlock(block);
        runtime.lastUpdateMs = millis();
        runtime.lastPersistMs = runtime.lastUpdateMs;
        runtime.retainEnabled = block.retain;
        runtime.restored = false;
        runtime.saveEveryDelta = totalizerSaveEveryDelta(block);
        runtime.saveEveryMs = totalizerSaveEveryMs(block);
        runtime.retainedKey = totalizerRetainedKey(block);
        runtime.lastPersistedValue = runtime.totalValue;

        const SignalRecord *resetSignal = gSignals.getAt(runtime.resetIndex);
        runtime.previousResetState = resetSignal ? resetSignal->state.boolValue : false;

        if (runtime.retainEnabled)
        {
            float restoredValue = 0.0f;
            if (gRetainedValues.getFloat(runtime.retainedKey, restoredValue))
            {
                runtime.totalValue = restoredValue;
                runtime.lastPersistedValue = restoredValue;
                runtime.restored = true;
            }
        }

        if (!gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Counter,
                SignalDirection::Status, SignalSourceType::BlockOutput, "total");
        }
        runtime.outputIndex = gSignals.findIndex(block.outputA);
        gSignals.publishAnalogAt(runtime.outputIndex, runtime.totalValue, runtime.totalValue,
            SignalQuality::Good, "totalizer_ready");

        totalizerResolvedCount++;
    }
}

void totalizerUpdate()
{
    int runtimeIndex = 0;
    const uint32_t now = millis();

    if (!totalizerRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Totalizer || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= totalizerResolvedCount)
        {
            break;
        }

        TotalizerRuntime &runtime = totalizerRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        const SignalRecord *resetSignal = gSignals.getAt(runtime.resetIndex);
        const bool currentReset = resetSignal ? resetSignal->state.boolValue : false;
        const bool resetEdge = !runtime.previousResetState && currentReset;

        if (!inputSignal)
        {
            gSignals.publishAnalogAt(runtime.outputIndex, runtime.totalValue, runtime.totalValue,
                SignalQuality::Fault, "totalizer_input_missing");
            runtime.previousResetState = currentReset;
            runtimeIndex++;
            continue;
        }

        const float currentValue = inputSignal->state.engineeringValue;
        const float scale = totalizerScaleForBlock(block);
        const String mode = block.mode.length() > 0 ? block.mode : "delta";

        if (!runtime.initialized)
        {
            runtime.initialized = true;
            runtime.lastInputValue = currentValue;
            runtime.lastUpdateMs = now;
        }

        if (resetEdge)
        {
            runtime.totalValue = totalizerInitialForBlock(block);
        }
        else if (mode == "delta" || mode == "delta_abs")
        {
            float delta = currentValue - runtime.lastInputValue;
            if (mode == "delta_abs")
            {
                delta = fabsf(delta);
            }
            else if (delta < 0.0f)
            {
                delta = 0.0f;
            }
            runtime.totalValue += delta * scale;
        }
        else
        {
            const uint32_t unitMs = totalizerUnitMs(mode);
            const uint32_t elapsedMs = now >= runtime.lastUpdateMs ? (now - runtime.lastUpdateMs) : 0;
            if (elapsedMs > 0 && unitMs > 0)
            {
                runtime.totalValue += currentValue * scale * (static_cast<float>(elapsedMs) / static_cast<float>(unitMs));
            }
        }

        const bool persistenceDueByDelta = runtime.retainEnabled &&
            fabsf(runtime.totalValue - runtime.lastPersistedValue) >= runtime.saveEveryDelta;
        const bool persistenceDueByTime = runtime.retainEnabled &&
            runtime.saveEveryMs > 0 &&
            now >= runtime.lastPersistMs &&
            (now - runtime.lastPersistMs) >= runtime.saveEveryMs;
        const bool shouldPersistNow = runtime.retainEnabled && (resetEdge || persistenceDueByDelta || persistenceDueByTime);

        bool persistOk = true;
        if (shouldPersistNow)
        {
            persistOk = gRetainedValues.saveFloat(runtime.retainedKey, runtime.totalValue);
            if (persistOk)
            {
                runtime.lastPersistedValue = runtime.totalValue;
                runtime.lastPersistMs = now;
            }
        }

        SignalQuality quality = inputSignal->state.quality;
        const char *statusText = runtime.restored ? "totalizer_restored" : (resetEdge ? "totalizer_reset" : "totalizer_ok");
        if (shouldPersistNow && !persistOk)
        {
            statusText = "totalizer_retain_save_failed";
        }
        else if (shouldPersistNow && persistOk)
        {
            statusText = resetEdge ? "totalizer_reset_saved" : "totalizer_saved";
        }
        if (quality == SignalQuality::Uninitialized)
        {
            quality = SignalQuality::Good;
        }
        gSignals.publishAnalogAt(runtime.outputIndex, runtime.totalValue, runtime.totalValue, quality, statusText);

        runtime.restored = false;
        runtime.lastInputValue = currentValue;
        runtime.lastUpdateMs = now;
        runtime.previousResetState = currentReset;
        runtimeIndex++;
    }
}
