#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "counter.h"

struct CounterRuntime {
    int inputIndex;
    int resetIndex;
    int outputIndex;
    bool previousInputState;
    bool previousResetState;
    float countValue;
};

static CounterRuntime counterRuntime[MAX_BLOCKS];
static int counterResolvedCount = 0;

static float counterStepForBlock(const BlockConfig &block)
{
    return block.compareValueA != 0.0f ? block.compareValueA : 1.0f;
}

static float counterInitialForBlock(const BlockConfig &block)
{
    return block.compareValueB;
}

void counterInit()
{
    counterResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        counterRuntime[i].inputIndex = -1;
        counterRuntime[i].resetIndex = -1;
        counterRuntime[i].outputIndex = -1;
        counterRuntime[i].previousInputState = false;
        counterRuntime[i].previousResetState = false;
        counterRuntime[i].countValue = 0.0f;
    }
}

void counterConfigure()
{
    counterResolvedCount = 0;

    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        counterRuntime[i].inputIndex = -1;
        counterRuntime[i].resetIndex = -1;
        counterRuntime[i].outputIndex = -1;
        counterRuntime[i].previousInputState = false;
        counterRuntime[i].previousResetState = false;
        counterRuntime[i].countValue = 0.0f;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Counter || block.inputA.isEmpty() || block.outputA.isEmpty() || counterResolvedCount >= MAX_BLOCKS)
        {
            continue;
        }

        CounterRuntime &runtime = counterRuntime[counterResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);
        runtime.resetIndex = gSignals.findIndex(block.inputB);
        runtime.outputIndex = -1;
        runtime.countValue = counterInitialForBlock(block);

        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        runtime.previousInputState = inputSignal ? inputSignal->state.boolValue : false;

        const SignalRecord *resetSignal = gSignals.getAt(runtime.resetIndex);
        runtime.previousResetState = resetSignal ? resetSignal->state.boolValue : false;

        if (!gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Counter,
                SignalDirection::Status, SignalSourceType::BlockOutput, "count");
        }
        runtime.outputIndex = gSignals.findIndex(block.outputA);
        gSignals.publishAnalogAt(runtime.outputIndex, runtime.countValue, runtime.countValue,
            SignalQuality::Good, "counter_ready");

        counterResolvedCount++;
    }
}

void counterUpdate()
{
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Counter || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= counterResolvedCount)
        {
            break;
        }

        CounterRuntime &runtime = counterRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        const SignalRecord *resetSignal = gSignals.getAt(runtime.resetIndex);

        if (!inputSignal)
        {
            gSignals.publishAnalogAt(runtime.outputIndex, runtime.countValue, runtime.countValue,
                SignalQuality::Fault, "counter_input_missing");
            runtime.previousInputState = false;
            runtime.previousResetState = resetSignal ? resetSignal->state.boolValue : false;
            runtimeIndex++;
            continue;
        }

        const bool currentInput = inputSignal->state.boolValue;
        const bool currentReset = resetSignal ? resetSignal->state.boolValue : false;
        const bool rising = !runtime.previousInputState && currentInput;
        const bool falling = runtime.previousInputState && !currentInput;
        const bool resetEdge = !runtime.previousResetState && currentReset;
        const String mode = block.mode.length() > 0 ? block.mode : "rising";

        if (resetEdge)
        {
            runtime.countValue = counterInitialForBlock(block);
        }
        else
        {
            bool matchedEdge = false;
            if (mode == "falling")
            {
                matchedEdge = falling;
            }
            else if (mode == "both")
            {
                matchedEdge = rising || falling;
            }
            else
            {
                matchedEdge = rising;
            }

            if (matchedEdge)
            {
                runtime.countValue += counterStepForBlock(block);
            }
        }

        const char *statusText = resetEdge ? "counter_reset" : "counter_ok";
        gSignals.publishAnalogAt(runtime.outputIndex, runtime.countValue, runtime.countValue,
            SignalQuality::Good, statusText);

        runtime.previousInputState = currentInput;
        runtime.previousResetState = currentReset;
        runtimeIndex++;
    }
}
