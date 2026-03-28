#include "../config/config.h"
#include "../core/resource_manager.h"
#include "../runtime/signal_registry.h"

#include "latch.h"

struct LatchRuntime {
    int toggleInputIndex;
    int setInputIndex;
    int resetInputIndex;
    int outputIndex;
    bool state;
    bool prevToggle;
    bool prevSet;
    bool prevReset;
};

static LatchRuntime latchRuntime[MAX_BLOCKS];
static int latchResolvedCount = 0;

static void resetLatchRuntime(LatchRuntime &runtime)
{
    runtime.toggleInputIndex = -1;
    runtime.setInputIndex = -1;
    runtime.resetInputIndex = -1;
    runtime.outputIndex = -1;
    runtime.state = false;
    runtime.prevToggle = false;
    runtime.prevSet = false;
    runtime.prevReset = false;
}

static bool latchOutputIsChannel(const String &outputId)
{
    return gResources.hasChannel(outputId);
}

static void writeLatchOutput(const String &outputId, int outputIndex, bool value)
{
    if (outputId.isEmpty())
    {
        return;
    }

    if (latchOutputIsChannel(outputId))
    {
        gResources.writeDigital(outputId, value);
        return;
    }

    gSignals.publishBinaryAt(outputIndex, value, SignalQuality::Good, value ? "latched_on" : "latched_off");
}

void latchInit()
{
    latchResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        resetLatchRuntime(latchRuntime[i]);
    }
}

void latchConfigure()
{
    latchResolvedCount = 0;

    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        resetLatchRuntime(latchRuntime[i]);
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Latch || block.outputA.isEmpty() || latchResolvedCount >= MAX_BLOCKS)
        {
            continue;
        }

        LatchRuntime &runtime = latchRuntime[latchResolvedCount];
        runtime.toggleInputIndex = gSignals.findIndex(block.inputA);
        runtime.setInputIndex = gSignals.findIndex(block.inputA);
        runtime.resetInputIndex = gSignals.findIndex(block.inputB);
        runtime.state = false;

        if (latchOutputIsChannel(block.outputA))
        {
            runtime.outputIndex = -1;
        }
        else
        {
            if (!gSignals.find(block.outputA))
            {
                gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Binary,
                    SignalDirection::Output, SignalSourceType::BlockOutput, "");
            }
            runtime.outputIndex = gSignals.findIndex(block.outputA);
        }

        const bool initialState = !block.resetPriority && gSignals.readBinaryAt(runtime.setInputIndex, false);
        runtime.state = initialState;
        runtime.prevToggle = gSignals.readBinaryAt(runtime.toggleInputIndex, false);
        runtime.prevSet = gSignals.readBinaryAt(runtime.setInputIndex, false);
        runtime.prevReset = gSignals.readBinaryAt(runtime.resetInputIndex, false);
        writeLatchOutput(block.outputA, runtime.outputIndex, runtime.state);
        latchResolvedCount++;
    }
}

void latchUpdate()
{
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Latch || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= latchResolvedCount)
        {
            break;
        }

        LatchRuntime &runtime = latchRuntime[runtimeIndex];
        const String mode = block.mode.length() > 0 ? block.mode : "toggle";

        if (mode == "set_reset")
        {
            const bool setSignal = gSignals.readBinaryAt(runtime.setInputIndex, false);
            const bool resetSignal = gSignals.readBinaryAt(runtime.resetInputIndex, false);
            const bool setEdge = setSignal && !runtime.prevSet;
            const bool resetEdge = resetSignal && !runtime.prevReset;

            if (block.resetPriority)
            {
                if (resetEdge)
                {
                    runtime.state = false;
                }
                else if (setEdge)
                {
                    runtime.state = true;
                }
            }
            else
            {
                if (setEdge)
                {
                    runtime.state = true;
                }
                else if (resetEdge)
                {
                    runtime.state = false;
                }
            }

            runtime.prevSet = setSignal;
            runtime.prevReset = resetSignal;
        }
        else if (mode == "set_only")
        {
            const bool setSignal = gSignals.readBinaryAt(runtime.setInputIndex, false);
            const bool setEdge = setSignal && !runtime.prevSet;
            if (setEdge)
            {
                runtime.state = true;
            }
            runtime.prevSet = setSignal;
        }
        else if (mode == "reset_only")
        {
            const bool resetSignal = gSignals.readBinaryAt(runtime.resetInputIndex, false);
            const bool resetEdge = resetSignal && !runtime.prevReset;
            if (resetEdge)
            {
                runtime.state = false;
            }
            runtime.prevReset = resetSignal;
        }
        else
        {
            const bool toggleSignal = gSignals.readBinaryAt(runtime.toggleInputIndex, false);
            const bool toggleEdge = toggleSignal && !runtime.prevToggle;
            if (toggleEdge)
            {
                runtime.state = !runtime.state;
            }
            runtime.prevToggle = toggleSignal;
        }

        writeLatchOutput(block.outputA, runtime.outputIndex, runtime.state);
        runtimeIndex++;
    }
}
