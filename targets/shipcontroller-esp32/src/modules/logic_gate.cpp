#include "../config/config.h"
#include "../core/resource_manager.h"
#include "../runtime/signal_registry.h"

#include "logic_gate.h"

struct LogicGateRuntime {
    int inputAIndex;
    int inputBIndex;
    int outputIndex;
};

static LogicGateRuntime logicGateRuntime[MAX_BLOCKS];
static int logicGateResolvedCount = 0;

static bool logicGateOutputIsChannel(const String &outputId)
{
    return gResources.hasChannel(outputId);
}

static void writeLogicGateOutput(const String &outputId, int outputIndex, bool value, const char *statusText)
{
    if (outputId.isEmpty())
    {
        return;
    }

    if (logicGateOutputIsChannel(outputId))
    {
        gResources.writeDigital(outputId, value);
        return;
    }

    gSignals.publishBinaryAt(outputIndex, value, SignalQuality::Good, statusText);
}

void logicGateInit()
{
    logicGateResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        logicGateRuntime[i].inputAIndex = -1;
        logicGateRuntime[i].inputBIndex = -1;
        logicGateRuntime[i].outputIndex = -1;
    }
}

void logicGateConfigure()
{
    logicGateResolvedCount = 0;

    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        logicGateRuntime[i].inputAIndex = -1;
        logicGateRuntime[i].inputBIndex = -1;
        logicGateRuntime[i].outputIndex = -1;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::LogicGate || block.inputA.isEmpty() || block.outputA.isEmpty() || logicGateResolvedCount >= MAX_BLOCKS)
        {
            continue;
        }

        LogicGateRuntime &runtime = logicGateRuntime[logicGateResolvedCount];
        runtime.inputAIndex = gSignals.findIndex(block.inputA);
        runtime.inputBIndex = gSignals.findIndex(block.inputB);

        if (logicGateOutputIsChannel(block.outputA))
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

        logicGateResolvedCount++;
    }
}

void logicGateUpdate()
{
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::LogicGate || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= logicGateResolvedCount)
        {
            break;
        }

        LogicGateRuntime &runtime = logicGateRuntime[runtimeIndex];
        const SignalRecord *inputA = gSignals.getAt(runtime.inputAIndex);
        const SignalRecord *inputB = gSignals.getAt(runtime.inputBIndex);
        const String mode = block.mode.length() > 0 ? block.mode : "and";

        if (!inputA)
        {
            writeLogicGateOutput(block.outputA, runtime.outputIndex, false, "logic input_a missing");
            runtimeIndex++;
            continue;
        }

        const bool a = inputA->state.boolValue;
        const bool b = inputB ? inputB->state.boolValue : false;

        bool result = false;
        if (mode == "or")
        {
            result = a || b;
        }
        else if (mode == "not")
        {
            result = !a;
        }
        else if (mode == "xor")
        {
            result = (a || b) && !(a && b);
        }
        else
        {
            result = a && b;
        }

        writeLogicGateOutput(block.outputA, runtime.outputIndex, result, result ? "logic_true" : "logic_false");
        runtimeIndex++;
    }
}
