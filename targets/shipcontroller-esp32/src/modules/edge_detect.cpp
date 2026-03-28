#include "../config/config.h"
#include "../core/resource_manager.h"
#include "../runtime/signal_registry.h"

#include "edge_detect.h"

struct EdgeDetectRuntime {
    int inputIndex;
    int outputIndex;
    bool previousState;
    bool pulseActive;
    uint32_t pulseUntilMs;
};

static EdgeDetectRuntime edgeDetectRuntime[MAX_BLOCKS];
static int edgeDetectResolvedCount = 0;

static bool edgeDetectOutputIsChannel(const String &outputId)
{
    return gResources.hasChannel(outputId);
}

static void writeEdgeDetectOutput(const String &outputId, int outputIndex, bool value, const char *statusText)
{
    if (outputId.isEmpty())
    {
        return;
    }

    if (edgeDetectOutputIsChannel(outputId))
    {
        gResources.writeDigital(outputId, value);
        return;
    }

    gSignals.publishBinaryAt(outputIndex, value, SignalQuality::Good, statusText);
}

void edgeDetectInit()
{
    edgeDetectResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        edgeDetectRuntime[i].inputIndex = -1;
        edgeDetectRuntime[i].outputIndex = -1;
        edgeDetectRuntime[i].previousState = false;
        edgeDetectRuntime[i].pulseActive = false;
        edgeDetectRuntime[i].pulseUntilMs = 0;
    }
}

void edgeDetectConfigure()
{
    edgeDetectResolvedCount = 0;

    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        edgeDetectRuntime[i].inputIndex = -1;
        edgeDetectRuntime[i].outputIndex = -1;
        edgeDetectRuntime[i].previousState = false;
        edgeDetectRuntime[i].pulseActive = false;
        edgeDetectRuntime[i].pulseUntilMs = 0;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::EdgeDetect || block.inputA.isEmpty() || block.outputA.isEmpty() || edgeDetectResolvedCount >= MAX_BLOCKS)
        {
            continue;
        }

        EdgeDetectRuntime &runtime = edgeDetectRuntime[edgeDetectResolvedCount];
        runtime.inputIndex = gSignals.findIndex(block.inputA);
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        runtime.previousState = inputSignal ? inputSignal->state.boolValue : false;

        if (edgeDetectOutputIsChannel(block.outputA))
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

        edgeDetectResolvedCount++;
    }
}

void edgeDetectUpdate()
{
    const uint32_t now = millis();
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::EdgeDetect || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= edgeDetectResolvedCount)
        {
            break;
        }

        EdgeDetectRuntime &runtime = edgeDetectRuntime[runtimeIndex];
        const SignalRecord *inputSignal = gSignals.getAt(runtime.inputIndex);
        if (!inputSignal)
        {
            runtime.previousState = false;
            runtime.pulseActive = false;
            runtime.pulseUntilMs = 0;
            writeEdgeDetectOutput(block.outputA, runtime.outputIndex, false, "edge input missing");
            runtimeIndex++;
            continue;
        }

        const bool current = inputSignal->state.boolValue;
        const bool rising = !runtime.previousState && current;
        const bool falling = runtime.previousState && !current;
        const String mode = block.mode.length() > 0 ? block.mode : "rising";
        const bool matchedEdge = (mode == "falling") ? falling : (mode == "both" ? (rising || falling) : rising);

        if (matchedEdge && (!runtime.pulseActive || block.retrigger))
        {
            const uint32_t pulseMs = block.durationMs > 0 ? block.durationMs : 100;
            runtime.pulseActive = true;
            runtime.pulseUntilMs = now + pulseMs;
        }

        if (runtime.pulseActive && now >= runtime.pulseUntilMs)
        {
            runtime.pulseActive = false;
        }

        writeEdgeDetectOutput(block.outputA, runtime.outputIndex, runtime.pulseActive,
            runtime.pulseActive ? "edge_pulse" : "edge_idle");

        runtime.previousState = current;
        runtimeIndex++;
    }
}
