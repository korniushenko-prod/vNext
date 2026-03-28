#include <math.h>

#include "../config/config.h"
#include "../core/resource_manager.h"
#include "../runtime/signal_registry.h"

#include "comparator.h"

struct ComparatorRuntime {
    int inputIndex;
    int compareSignalIndex;
    int outputIndex;
};

static ComparatorRuntime comparatorRuntime[MAX_BLOCKS];
static int comparatorResolvedCount = 0;

static bool comparatorOutputIsChannel(const String &outputId)
{
    return gResources.hasChannel(outputId);
}

static void writeComparatorOutput(const String &outputId, int outputIndex, bool value, const char *statusText)
{
    if (outputId.isEmpty())
    {
        return;
    }

    if (comparatorOutputIsChannel(outputId))
    {
        gResources.writeDigital(outputId, value);
        return;
    }

    gSignals.publishBinaryAt(outputIndex, value, SignalQuality::Good, statusText);
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

void comparatorInit()
{
    comparatorResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        comparatorRuntime[i].inputIndex = -1;
        comparatorRuntime[i].compareSignalIndex = -1;
        comparatorRuntime[i].outputIndex = -1;
    }
}

void comparatorConfigure()
{
    comparatorResolvedCount = 0;

    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        comparatorRuntime[i].inputIndex = -1;
        comparatorRuntime[i].compareSignalIndex = -1;
        comparatorRuntime[i].outputIndex = -1;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Comparator || block.inputA.isEmpty() || block.outputA.isEmpty() || comparatorResolvedCount >= MAX_BLOCKS)
        {
            continue;
        }

        ComparatorRuntime &runtime = comparatorRuntime[comparatorResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);
        runtime.compareSignalIndex = gSignals.findIndex(block.inputB);

        if (comparatorOutputIsChannel(block.outputA))
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

        comparatorResolvedCount++;
    }
}

void comparatorUpdate()
{
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Comparator || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= comparatorResolvedCount)
        {
            break;
        }

        ComparatorRuntime &runtime = comparatorRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        if (!inputSignal)
        {
            writeComparatorOutput(block.outputA, runtime.outputIndex, false, "comparator input missing");
            runtimeIndex++;
            continue;
        }

        const float sourceValue = signalAsFloat(inputSignal);
        const bool hasCompareSignal = runtime.compareSignalIndex >= 0;
        const SignalRecord *compareSignal = hasCompareSignal ? gSignals.getAt(runtime.compareSignalIndex) : nullptr;
        const float compareValue = compareSignal ? signalAsFloat(compareSignal) : block.compareValueA;
        const float compareValueB = block.compareValueB;
        const String mode = block.mode.length() > 0 ? block.mode : "gt";

        bool result = false;
        if (mode == "lt")
        {
            result = sourceValue < compareValue;
        }
        else if (mode == "ge")
        {
            result = sourceValue >= compareValue;
        }
        else if (mode == "le")
        {
            result = sourceValue <= compareValue;
        }
        else if (mode == "eq")
        {
            result = fabsf(sourceValue - compareValue) < 0.0001f;
        }
        else if (mode == "ne")
        {
            result = fabsf(sourceValue - compareValue) >= 0.0001f;
        }
        else if (mode == "between")
        {
            const float low = compareValue <= compareValueB ? compareValue : compareValueB;
            const float high = compareValue <= compareValueB ? compareValueB : compareValue;
            result = sourceValue >= low && sourceValue <= high;
        }
        else if (mode == "outside")
        {
            const float low = compareValue <= compareValueB ? compareValue : compareValueB;
            const float high = compareValue <= compareValueB ? compareValueB : compareValue;
            result = sourceValue < low || sourceValue > high;
        }
        else
        {
            result = sourceValue > compareValue;
        }

        writeComparatorOutput(block.outputA, runtime.outputIndex, result, result ? "compare_true" : "compare_false");
        runtimeIndex++;
    }
}
