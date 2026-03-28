#include <stdlib.h>

#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "window_aggregator.h"

struct WindowAggregatorRuntime {
    int inputIndex;
    int outputIndex;
    uint32_t bucketMs;
    uint32_t windowMs;
    int bucketCount;
    int bucketIndex;
    int validBuckets;
    uint32_t bucketStartMs;
    float bucketAccum;
    uint32_t bucketSamples;
    float *bucketValues;
};

static WindowAggregatorRuntime *windowAggregatorRuntime = nullptr;
static int windowAggregatorResolvedCount = 0;

static void freeWindowAggregatorBuckets(WindowAggregatorRuntime &runtime)
{
    if (runtime.bucketValues)
    {
        free(runtime.bucketValues);
        runtime.bucketValues = nullptr;
    }
}

static float windowAggregatorScaleForBlock(const BlockConfig &block)
{
    return block.compareValueA != 0.0f ? block.compareValueA : 1.0f;
}

static float windowAggregatorFinalizeBucket(WindowAggregatorRuntime &runtime)
{
    if (runtime.bucketSamples == 0)
    {
        return 0.0f;
    }
    return runtime.bucketAccum / static_cast<float>(runtime.bucketSamples);
}

static float windowAggregatorCompute(const WindowAggregatorRuntime &runtime, const String &mode, float currentBucketValue, bool currentBucketValid)
{
    bool hasValue = false;
    float result = 0.0f;

    for (int i = 0; i < runtime.validBuckets; i++)
    {
        const int index = (runtime.bucketIndex - runtime.validBuckets + i + runtime.bucketCount) % runtime.bucketCount;
        const float value = runtime.bucketValues[index];
        if (!hasValue)
        {
            result = value;
            hasValue = true;
        }
        else if (mode == "min")
        {
            if (value < result)
            {
                result = value;
            }
        }
        else if (mode == "max")
        {
            if (value > result)
            {
                result = value;
            }
        }
        else
        {
            result += value;
        }
    }

    if (currentBucketValid)
    {
        if (!hasValue)
        {
            result = currentBucketValue;
            hasValue = true;
        }
        else if (mode == "min")
        {
            if (currentBucketValue < result)
            {
                result = currentBucketValue;
            }
        }
        else if (mode == "max")
        {
            if (currentBucketValue > result)
            {
                result = currentBucketValue;
            }
        }
        else
        {
            result += currentBucketValue;
        }
    }

    if (!hasValue)
    {
        return 0.0f;
    }

    if (mode == "average")
    {
        const int count = runtime.validBuckets + (currentBucketValid ? 1 : 0);
        return count > 0 ? (result / static_cast<float>(count)) : 0.0f;
    }

    return result;
}

void windowAggregatorInit()
{
    if (windowAggregatorRuntime)
    {
        for (int i = 0; i < windowAggregatorResolvedCount; i++)
        {
            freeWindowAggregatorBuckets(windowAggregatorRuntime[i]);
        }
        free(windowAggregatorRuntime);
        windowAggregatorRuntime = nullptr;
    }
    windowAggregatorResolvedCount = 0;
}

void windowAggregatorConfigure()
{
    windowAggregatorResolvedCount = 0;

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::WindowAggregator && !block.inputA.isEmpty() && !block.outputA.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    windowAggregatorRuntime = static_cast<WindowAggregatorRuntime *>(calloc(static_cast<size_t>(configuredCount), sizeof(WindowAggregatorRuntime)));
    if (!windowAggregatorRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::WindowAggregator || block.inputA.isEmpty() || block.outputA.isEmpty() || windowAggregatorResolvedCount >= configuredCount)
        {
            continue;
        }

        WindowAggregatorRuntime &runtime = windowAggregatorRuntime[windowAggregatorResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);
        runtime.outputIndex = -1;
        runtime.bucketMs = block.periodMs > 0 ? block.periodMs : 60000UL;
        runtime.windowMs = block.durationMs > 0 ? block.durationMs : 3600000UL;
        runtime.bucketCount = static_cast<int>(runtime.windowMs / runtime.bucketMs);
        if (runtime.bucketCount <= 0)
        {
            runtime.bucketCount = 1;
        }
        if (runtime.bucketCount > 256)
        {
            runtime.bucketCount = 256;
        }
        runtime.bucketValues = static_cast<float*>(calloc(runtime.bucketCount, sizeof(float)));
        runtime.bucketStartMs = millis();

        if (!gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Analog,
                SignalDirection::Status, SignalSourceType::BlockOutput, "window");
        }
        runtime.outputIndex = gSignals.findIndex(block.outputA);
        gSignals.publishAnalogAt(runtime.outputIndex, 0.0f, 0.0f, runtime.bucketValues ? SignalQuality::Good : SignalQuality::Fault,
            runtime.bucketValues ? "window_ready" : "window_alloc_failed");

        windowAggregatorResolvedCount++;
    }
}

void windowAggregatorUpdate()
{
    int runtimeIndex = 0;
    const uint32_t now = millis();

    if (!windowAggregatorRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::WindowAggregator || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= windowAggregatorResolvedCount)
        {
            break;
        }

        WindowAggregatorRuntime &runtime = windowAggregatorRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);

        if (!runtime.bucketValues)
        {
            gSignals.publishAnalogAt(runtime.outputIndex, 0.0f, 0.0f, SignalQuality::Fault, "window_alloc_failed");
            runtimeIndex++;
            continue;
        }

        if (!inputSignal)
        {
            gSignals.publishAnalogAt(runtime.outputIndex, 0.0f, 0.0f, SignalQuality::Fault, "window_input_missing");
            runtimeIndex++;
            continue;
        }

        const float inputValue = inputSignal->state.engineeringValue * windowAggregatorScaleForBlock(block);
        runtime.bucketAccum += inputValue;
        runtime.bucketSamples++;

        while (now - runtime.bucketStartMs >= runtime.bucketMs)
        {
            const float bucketValue = windowAggregatorFinalizeBucket(runtime);
            runtime.bucketValues[runtime.bucketIndex] = bucketValue;
            runtime.bucketIndex = (runtime.bucketIndex + 1) % runtime.bucketCount;
            if (runtime.validBuckets < runtime.bucketCount)
            {
                runtime.validBuckets++;
            }
            runtime.bucketStartMs += runtime.bucketMs;
            runtime.bucketAccum = 0.0f;
            runtime.bucketSamples = 0;
        }

        const float currentBucketValue = windowAggregatorFinalizeBucket(runtime);
        const bool currentBucketValid = runtime.bucketSamples > 0;
        const String mode = block.mode.length() > 0 ? block.mode : "average";
        const float result = windowAggregatorCompute(runtime, mode, currentBucketValue, currentBucketValid);

        SignalQuality quality = inputSignal->state.quality;
        if (quality == SignalQuality::Uninitialized)
        {
            quality = SignalQuality::Good;
        }
        gSignals.publishAnalogAt(runtime.outputIndex, result, result, quality, "window_ok");
        runtimeIndex++;
    }
}
