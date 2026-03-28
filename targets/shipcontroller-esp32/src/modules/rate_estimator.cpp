#include <stdlib.h>

#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "rate_estimator.h"

struct RateEstimatorRuntime {
    int inputIndex;
    int outputIndex;
    bool initialized;
    float lastInputValue;
    float pendingDelta;
    float currentRate;
    uint32_t lastSampleMs;
};

static RateEstimatorRuntime *rateEstimatorRuntime = nullptr;
static int rateEstimatorResolvedCount = 0;

static void freeRateEstimatorRuntime()
{
    if (rateEstimatorRuntime)
    {
        free(rateEstimatorRuntime);
        rateEstimatorRuntime = nullptr;
    }
}

static float rateEstimatorScaleForBlock(const BlockConfig &block)
{
    return block.compareValueA != 0.0f ? block.compareValueA : 1.0f;
}

static float rateEstimatorAlphaForBlock(const BlockConfig &block)
{
    const float alpha = block.compareValueB;
    if (alpha <= 0.0f || alpha > 1.0f)
    {
        return 1.0f;
    }
    return alpha;
}

static uint32_t rateEstimatorUnitMs(const String &mode)
{
    if (mode == "per_second")
    {
        return 1000UL;
    }
    if (mode == "per_hour")
    {
        return 3600000UL;
    }
    return 60000UL;
}

void rateEstimatorInit()
{
    freeRateEstimatorRuntime();
    rateEstimatorResolvedCount = 0;
}

void rateEstimatorConfigure()
{
    rateEstimatorInit();

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::RateEstimator && !block.inputA.isEmpty() && !block.outputA.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    rateEstimatorRuntime = static_cast<RateEstimatorRuntime *>(calloc(static_cast<size_t>(configuredCount), sizeof(RateEstimatorRuntime)));
    if (!rateEstimatorRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::RateEstimator || block.inputA.isEmpty() || block.outputA.isEmpty() || rateEstimatorResolvedCount >= configuredCount)
        {
            continue;
        }

        RateEstimatorRuntime &runtime = rateEstimatorRuntime[rateEstimatorResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);
        runtime.outputIndex = -1;
        runtime.lastSampleMs = millis();

        if (!gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Analog,
                SignalDirection::Status, SignalSourceType::BlockOutput, "rate");
        }
        runtime.outputIndex = gSignals.findIndex(block.outputA);
        gSignals.publishAnalogAt(runtime.outputIndex, 0.0f, 0.0f, SignalQuality::Good, "rate_estimator_ready");

        rateEstimatorResolvedCount++;
    }
}

void rateEstimatorUpdate()
{
    int runtimeIndex = 0;
    const uint32_t now = millis();

    if (!rateEstimatorRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::RateEstimator || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= rateEstimatorResolvedCount)
        {
            break;
        }

        RateEstimatorRuntime &runtime = rateEstimatorRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        const uint32_t sampleMs = block.durationMs > 0 ? block.durationMs : 1000UL;

        if (!inputSignal)
        {
            gSignals.publishAnalogAt(runtime.outputIndex, runtime.currentRate, runtime.currentRate,
                SignalQuality::Fault, "rate_input_missing");
            runtimeIndex++;
            continue;
        }

        const float currentValue = inputSignal->state.engineeringValue;
        if (!runtime.initialized)
        {
            runtime.initialized = true;
            runtime.lastInputValue = currentValue;
            runtime.lastSampleMs = now;
            gSignals.publishAnalogAt(runtime.outputIndex, 0.0f, 0.0f, inputSignal->state.quality, "rate_waiting");
            runtimeIndex++;
            continue;
        }

        float delta = currentValue - runtime.lastInputValue;
        if (delta < 0.0f)
        {
            delta = 0.0f;
        }
        runtime.pendingDelta += delta;
        runtime.lastInputValue = currentValue;

        const uint32_t elapsedMs = now >= runtime.lastSampleMs ? (now - runtime.lastSampleMs) : 0;
        if (elapsedMs >= sampleMs)
        {
            const uint32_t unitMs = rateEstimatorUnitMs(block.mode.length() > 0 ? block.mode : "per_minute");
            const float scale = rateEstimatorScaleForBlock(block);
            const float alpha = rateEstimatorAlphaForBlock(block);
            float measuredRate = 0.0f;

            if (elapsedMs > 0 && unitMs > 0)
            {
                measuredRate = runtime.pendingDelta * scale * (static_cast<float>(unitMs) / static_cast<float>(elapsedMs));
            }

            if (alpha >= 1.0f)
            {
                runtime.currentRate = measuredRate;
            }
            else
            {
                runtime.currentRate = (runtime.currentRate * (1.0f - alpha)) + (measuredRate * alpha);
            }

            runtime.pendingDelta = 0.0f;
            runtime.lastSampleMs = now;
        }

        SignalQuality quality = inputSignal->state.quality;
        if (quality == SignalQuality::Uninitialized)
        {
            quality = SignalQuality::Good;
        }
        gSignals.publishAnalogAt(runtime.outputIndex, runtime.currentRate, runtime.currentRate, quality, "rate_ok");
        runtimeIndex++;
    }
}
