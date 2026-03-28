#include <math.h>

#include "../config/config.h"
#include "../core/resource_manager.h"
#include "../runtime/signal_registry.h"

#include "hysteresis.h"

struct HysteresisRuntime {
    int inputIndex;
    int outputIndex;
    bool outputState;
};

static HysteresisRuntime *hysteresisRuntime = nullptr;

static void freeHysteresisRuntime()
{
    if (hysteresisRuntime != nullptr)
    {
        delete[] hysteresisRuntime;
        hysteresisRuntime = nullptr;
    }
}

static bool hysteresisOutputIsChannel(const String &outputId)
{
    return gResources.hasChannel(outputId);
}

static float hysteresisSignalAsFloat(const SignalRecord *signal)
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

static bool evaluateHysteresisInitialState(const BlockConfig &block, float value)
{
    const float lower = block.compareValueA <= block.compareValueB ? block.compareValueA : block.compareValueB;
    const float upper = block.compareValueA <= block.compareValueB ? block.compareValueB : block.compareValueA;
    const float center = block.compareValueA;
    const float band = fabsf(block.compareValueB);

    if (block.mode == "low")
    {
        return value <= lower;
    }

    if (block.mode == "outside_band")
    {
        return value <= (center - band) || value >= (center + band);
    }

    if (block.mode == "inside_band")
    {
        return value >= (center - band) && value <= (center + band);
    }

    return value >= upper;
}

static void writeHysteresisOutput(const String &outputId, int outputIndex, bool value, const char *statusText)
{
    if (outputId.isEmpty())
    {
        return;
    }

    if (hysteresisOutputIsChannel(outputId))
    {
        gResources.writeDigital(outputId, value);
        return;
    }

    gSignals.publishBinaryAt(outputIndex, value, SignalQuality::Good, statusText);
}

void hysteresisInit()
{
    freeHysteresisRuntime();
}

void hysteresisConfigure()
{
    freeHysteresisRuntime();

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::Hysteresis && !block.inputA.isEmpty() && !block.outputA.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    hysteresisRuntime = new HysteresisRuntime[configuredCount];
    if (hysteresisRuntime == nullptr)
    {
        return;
    }

    for (int i = 0; i < configuredCount; i++)
    {
        hysteresisRuntime[i].inputIndex = -1;
        hysteresisRuntime[i].outputIndex = -1;
        hysteresisRuntime[i].outputState = false;
    }

    int runtimeIndex = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Hysteresis || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        HysteresisRuntime &runtime = hysteresisRuntime[runtimeIndex];
        runtime.inputIndex = gSignals.findIndex(block.inputA);

        if (hysteresisOutputIsChannel(block.outputA))
        {
            runtime.outputIndex = -1;
        }
        else
        {
            if (!gSignals.find(block.outputA))
            {
                gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Binary,
                    SignalDirection::Status, SignalSourceType::BlockOutput, "");
            }
            runtime.outputIndex = gSignals.findIndex(block.outputA);
        }

        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        runtime.outputState = evaluateHysteresisInitialState(block, hysteresisSignalAsFloat(inputSignal));
        runtimeIndex++;
    }
}

void hysteresisUpdate()
{
    if (hysteresisRuntime == nullptr)
    {
        return;
    }

    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Hysteresis || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        HysteresisRuntime &runtime = hysteresisRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        if (!inputSignal)
        {
            runtime.outputState = false;
            writeHysteresisOutput(block.outputA, runtime.outputIndex, false, "hysteresis input missing");
            runtimeIndex++;
            continue;
        }

        const float value = hysteresisSignalAsFloat(inputSignal);
        const float lower = block.compareValueA <= block.compareValueB ? block.compareValueA : block.compareValueB;
        const float upper = block.compareValueA <= block.compareValueB ? block.compareValueB : block.compareValueA;
        const float center = block.compareValueA;
        const float band = fabsf(block.compareValueB);
        const float bandLow = center - band;
        const float bandHigh = center + band;
        const String mode = block.mode.length() > 0 ? block.mode : "high";

        if (mode == "low")
        {
            if (value <= lower)
            {
                runtime.outputState = true;
            }
            else if (value >= upper)
            {
                runtime.outputState = false;
            }
        }
        else if (mode == "outside_band")
        {
            if (value <= bandLow || value >= bandHigh)
            {
                runtime.outputState = true;
            }
            else if (value > bandLow && value < bandHigh)
            {
                runtime.outputState = false;
            }
        }
        else if (mode == "inside_band")
        {
            if (value >= bandLow && value <= bandHigh)
            {
                runtime.outputState = true;
            }
            else if (value < bandLow || value > bandHigh)
            {
                runtime.outputState = false;
            }
        }
        else
        {
            if (value >= upper)
            {
                runtime.outputState = true;
            }
            else if (value <= lower)
            {
                runtime.outputState = false;
            }
        }

        writeHysteresisOutput(block.outputA, runtime.outputIndex, runtime.outputState,
            runtime.outputState ? "hysteresis_true" : "hysteresis_false");
        runtimeIndex++;
    }
}
