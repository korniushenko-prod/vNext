#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "selector.h"

struct SelectorRuntime {
    int inputAIndex;
    int inputBIndex;
    int controlIndex;
    int outputIndex;
};

static SelectorRuntime selectorRuntime[MAX_BLOCKS];
static int selectorResolvedCount = 0;

void selectorInit()
{
    selectorResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        selectorRuntime[i].inputAIndex = -1;
        selectorRuntime[i].inputBIndex = -1;
        selectorRuntime[i].controlIndex = -1;
        selectorRuntime[i].outputIndex = -1;
    }
}

void selectorConfigure()
{
    selectorResolvedCount = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Selector || block.outputA.isEmpty())
        {
            continue;
        }

        if (gSignals.find(block.outputA))
        {
            selectorRuntime[selectorResolvedCount].outputIndex = gSignals.findIndex(block.outputA);
        }
        else
        {
            SignalClass signalClass = SignalClass::Analog;
            SignalDirection direction = SignalDirection::Internal;
            String units = "";

            const SignalRecord *sourceSignal = gSignals.find(block.inputA);
            if (sourceSignal)
            {
                signalClass = sourceSignal->definition.signalClass;
                direction = sourceSignal->definition.direction;
                units = sourceSignal->definition.units;
            }

            gSignals.registerDerivedSignal(block.outputA, block.outputA, signalClass,
                direction, SignalSourceType::BlockOutput, units);
            selectorRuntime[selectorResolvedCount].outputIndex = gSignals.findIndex(block.outputA);
        }

        selectorRuntime[selectorResolvedCount].inputAIndex = gSignals.findIndex(block.inputA);
        selectorRuntime[selectorResolvedCount].inputBIndex = gSignals.findIndex(block.inputB);
        selectorRuntime[selectorResolvedCount].controlIndex = gSignals.findIndex(block.controlSignal);
        selectorResolvedCount++;
    }
}

void selectorUpdate()
{
    int selectorIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Selector || block.outputA.isEmpty())
        {
            continue;
        }

        if (selectorIndex >= selectorResolvedCount)
        {
            break;
        }

        bool useSecondary = gSignals.readBinaryAt(selectorRuntime[selectorIndex].controlIndex, false);
        int selectedSourceIndex = useSecondary ? selectorRuntime[selectorIndex].inputBIndex : selectorRuntime[selectorIndex].inputAIndex;
        if (selectedSourceIndex < 0)
        {
            selectedSourceIndex = selectorRuntime[selectorIndex].inputAIndex;
        }

        const SignalRecord *sourceSignal = gSignals.getAt(selectedSourceIndex);
        if (!sourceSignal)
        {
            gSignals.publishAnalogAt(selectorRuntime[selectorIndex].outputIndex, 0, 0, SignalQuality::Fault, "selector source missing");
            selectorIndex++;
            continue;
        }

        if (sourceSignal->definition.signalClass == SignalClass::Binary)
        {
            gSignals.publishBinaryAt(selectorRuntime[selectorIndex].outputIndex, sourceSignal->state.boolValue,
                sourceSignal->state.quality, useSecondary ? "secondary" : "primary");
        }
        else
        {
            gSignals.publishAnalogAt(selectorRuntime[selectorIndex].outputIndex, sourceSignal->state.rawValue,
                sourceSignal->state.engineeringValue, sourceSignal->state.quality,
                useSecondary ? "secondary" : "primary");
        }

        selectorIndex++;
    }
}
