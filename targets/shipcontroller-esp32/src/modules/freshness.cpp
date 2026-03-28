#include <stdlib.h>

#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "freshness.h"

struct FreshnessRuntime {
    int inputIndex;
    int outputIndex;
    uint32_t timeoutMs;
};

static FreshnessRuntime *freshnessRuntime = nullptr;
static int freshnessResolvedCount = 0;

static bool freshnessLooksAlive(const SignalRecord *signal)
{
    if (!signal)
    {
        return false;
    }

    return signal->state.quality != SignalQuality::Fault &&
        signal->state.quality != SignalQuality::Stale &&
        signal->state.quality != SignalQuality::Uninitialized;
}

void freshnessInit()
{
    if (freshnessRuntime)
    {
        free(freshnessRuntime);
        freshnessRuntime = nullptr;
    }
    freshnessResolvedCount = 0;
}

void freshnessConfigure()
{
    freshnessInit();

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::Freshness && !block.inputA.isEmpty() && !block.outputA.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    freshnessRuntime = static_cast<FreshnessRuntime *>(calloc(static_cast<size_t>(configuredCount), sizeof(FreshnessRuntime)));
    if (!freshnessRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Freshness || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (freshnessResolvedCount >= configuredCount)
        {
            break;
        }

        FreshnessRuntime &runtime = freshnessRuntime[freshnessResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);
        runtime.timeoutMs = block.durationMs > 0 ? block.durationMs : 5000UL;

        if (!gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Binary,
                SignalDirection::Status, SignalSourceType::BlockOutput, "");
        }
        runtime.outputIndex = gSignals.findIndex(block.outputA);
        freshnessResolvedCount++;
    }
}

void freshnessUpdate()
{
    const uint32_t now = millis();
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Freshness || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= freshnessResolvedCount || freshnessRuntime == nullptr)
        {
            break;
        }

        const FreshnessRuntime &runtime = freshnessRuntime[runtimeIndex];
        const SignalRecord *source = gSignals.getAt(runtime.inputIndex);
        if (!source)
        {
            gSignals.publishBinaryAt(runtime.outputIndex, false, SignalQuality::Fault, "freshness source missing");
            runtimeIndex++;
            continue;
        }

        const uint32_t ageMs = source->state.timestampMs > 0 ? (now - source->state.timestampMs) : UINT32_MAX;
        const bool timedOut = source->state.timestampMs == 0 || ageMs > runtime.timeoutMs;
        const bool stale = source->state.stale || source->state.quality == SignalQuality::Stale || source->state.quality == SignalQuality::Uninitialized || timedOut;
        const bool commLoss = timedOut || source->state.quality == SignalQuality::Fault || source->state.quality == SignalQuality::Stale;
        const bool fresh = freshnessLooksAlive(source) && !timedOut;

        const String mode = block.mode.length() > 0 ? block.mode : "fresh";
        bool result = false;
        const char *statusText = "freshness";

        if (mode == "stale")
        {
            result = stale;
            statusText = result ? "stale" : "fresh";
        }
        else if (mode == "comm_loss")
        {
            result = commLoss;
            statusText = result ? "comm_loss" : "healthy";
        }
        else
        {
            result = fresh;
            statusText = result ? "fresh" : "not_fresh";
        }

        gSignals.publishBinaryAt(runtime.outputIndex, result,
            commLoss ? SignalQuality::Fault : (stale ? SignalQuality::Stale : SignalQuality::Good),
            statusText);
        runtimeIndex++;
    }
}
