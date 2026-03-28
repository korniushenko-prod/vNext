#include <math.h>

#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "scale_map.h"

struct ScaleMapRuntime {
    int inputIndex;
    int outputIndex;
};

static ScaleMapRuntime *scaleMapRuntime = nullptr;
static int scaleMapResolvedCount = 0;
static int scaleMapRuntimeCapacity = 0;

static void freeScaleMapRuntime()
{
    if (scaleMapRuntime)
    {
        free(scaleMapRuntime);
        scaleMapRuntime = nullptr;
    }
    scaleMapRuntimeCapacity = 0;
}

static float clampFloat(float value, float low, float high)
{
    if (value < low) return low;
    if (value > high) return high;
    return value;
}

static float signalAsFloat(const SignalRecord *signal)
{
    if (!signal)
    {
        return 0.0f;
    }

    if (signal->definition.signalClass == SignalClass::Binary)
    {
        return signal->state.boolValue ? 1.0f : 0.0f;
    }

    return signal->state.engineeringValue;
}

void scaleMapInit()
{
    freeScaleMapRuntime();
    scaleMapResolvedCount = 0;
}

void scaleMapConfigure()
{
    freeScaleMapRuntime();
    scaleMapResolvedCount = 0;

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::ScaleMap && !block.inputA.isEmpty() && !block.outputA.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    scaleMapRuntime = static_cast<ScaleMapRuntime *>(malloc(sizeof(ScaleMapRuntime) * configuredCount));
    if (!scaleMapRuntime)
    {
        return;
    }

    scaleMapRuntimeCapacity = configuredCount;
    for (int i = 0; i < scaleMapRuntimeCapacity; i++)
    {
        scaleMapRuntime[i].inputIndex = -1;
        scaleMapRuntime[i].outputIndex = -1;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::ScaleMap || block.inputA.isEmpty() || block.outputA.isEmpty() || scaleMapResolvedCount >= scaleMapRuntimeCapacity)
        {
            continue;
        }

        ScaleMapRuntime &runtime = scaleMapRuntime[scaleMapResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);

        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        const String units = inputSignal ? inputSignal->definition.units : "";
        if (!gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Analog,
                SignalDirection::Status, SignalSourceType::BlockOutput, units);
        }
        runtime.outputIndex = gSignals.findIndex(block.outputA);
        scaleMapResolvedCount++;
    }
}

void scaleMapUpdate()
{
    if (!scaleMapRuntime || scaleMapResolvedCount <= 0)
    {
        return;
    }

    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::ScaleMap || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= scaleMapResolvedCount)
        {
            break;
        }

        ScaleMapRuntime &runtime = scaleMapRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        if (!inputSignal)
        {
            gSignals.publishAnalogAt(runtime.outputIndex, 0.0f, 0.0f, SignalQuality::Fault, "scale input missing");
            runtimeIndex++;
            continue;
        }

        const float sourceValue = signalAsFloat(inputSignal);
        const String mode = block.mode.length() > 0 ? block.mode : "scale";
        float outputValue = sourceValue;
        const char *statusText = "scaled";

        if (mode == "clamp")
        {
            const float low = block.compareValueA <= block.compareValueB ? block.compareValueA : block.compareValueB;
            const float high = block.compareValueA <= block.compareValueB ? block.compareValueB : block.compareValueA;
            outputValue = clampFloat(sourceValue, low, high);
            statusText = "clamped";
        }
        else if (mode == "map")
        {
            const float inMin = block.compareValueA;
            const float inMax = block.compareValueB;
            const float outMin = block.extraValueC;
            const float outMax = block.extraValueD;
            if (fabsf(inMax - inMin) < 0.000001f)
            {
                outputValue = outMin;
            }
            else
            {
                float ratio = (sourceValue - inMin) / (inMax - inMin);
                ratio = clampFloat(ratio, 0.0f, 1.0f);
                outputValue = outMin + ratio * (outMax - outMin);
            }
            statusText = "mapped";
        }
        else
        {
            outputValue = sourceValue * block.compareValueA + block.compareValueB;
            statusText = "scaled";
        }

        gSignals.publishAnalogAt(runtime.outputIndex, sourceValue, outputValue, SignalQuality::Good, statusText);
        runtimeIndex++;
    }
}
