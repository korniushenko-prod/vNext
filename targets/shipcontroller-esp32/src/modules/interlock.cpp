#include "../config/config.h"
#include "../core/resource_manager.h"
#include "../runtime/signal_registry.h"

#include "interlock.h"

struct InterlockRuntime {
    int requestIndex;
    int permissiveIndex;
    int inhibitIndex;
    int outputIndex;
};

static InterlockRuntime interlockRuntime[MAX_BLOCKS];
static int interlockResolvedCount = 0;

static bool interlockOutputIsChannel(const String &outputId)
{
    return gResources.hasChannel(outputId);
}

static void writeInterlockOutput(const String &outputId, int outputIndex, bool value, const char *statusText)
{
    if (outputId.isEmpty())
    {
        return;
    }

    if (interlockOutputIsChannel(outputId))
    {
        gResources.writeDigital(outputId, value);
        return;
    }

    gSignals.publishBinaryAt(outputIndex, value, SignalQuality::Good, statusText);
}

void interlockInit()
{
    interlockResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        interlockRuntime[i].requestIndex = -1;
        interlockRuntime[i].permissiveIndex = -1;
        interlockRuntime[i].inhibitIndex = -1;
        interlockRuntime[i].outputIndex = -1;
    }
}

void interlockConfigure()
{
    interlockResolvedCount = 0;
    for (int i = 0; i < MAX_BLOCKS; i++)
    {
        interlockRuntime[i].requestIndex = -1;
        interlockRuntime[i].permissiveIndex = -1;
        interlockRuntime[i].inhibitIndex = -1;
        interlockRuntime[i].outputIndex = -1;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Interlock || block.outputA.isEmpty() || interlockResolvedCount >= MAX_BLOCKS)
        {
            continue;
        }

        InterlockRuntime &runtime = interlockRuntime[interlockResolvedCount];
        runtime.requestIndex = block.inputA.isEmpty() ? -1 : gSignals.findIndex(block.inputA);
        runtime.permissiveIndex = block.inputB.isEmpty() ? -1 : gSignals.findIndex(block.inputB);
        runtime.inhibitIndex = block.inputC.isEmpty() ? -1 : gSignals.findIndex(block.inputC);

        if (interlockOutputIsChannel(block.outputA))
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

        interlockResolvedCount++;
    }
}

void interlockUpdate()
{
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::Interlock || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= interlockResolvedCount)
        {
            break;
        }

        InterlockRuntime &runtime = interlockRuntime[runtimeIndex];
        const String mode = block.mode.length() > 0 ? block.mode : "interlock";
        const bool needsPermissive = (mode == "permissive" || mode == "interlock");
        const bool needsInhibit = (mode == "inhibit" || mode == "interlock");

        const SignalRecord *requestSignal = runtime.requestIndex >= 0 ? gSignals.getAt(runtime.requestIndex) : nullptr;
        const SignalRecord *permissiveSignal = runtime.permissiveIndex >= 0 ? gSignals.getAt(runtime.permissiveIndex) : nullptr;
        const SignalRecord *inhibitSignal = runtime.inhibitIndex >= 0 ? gSignals.getAt(runtime.inhibitIndex) : nullptr;

        if (!block.inputA.isEmpty() && !requestSignal)
        {
            writeInterlockOutput(block.outputA, runtime.outputIndex, false, "interlock request missing");
            runtimeIndex++;
            continue;
        }

        if (needsPermissive && (!permissiveSignal || block.inputB.isEmpty()))
        {
            writeInterlockOutput(block.outputA, runtime.outputIndex, false, "interlock permissive missing");
            runtimeIndex++;
            continue;
        }

        if (needsInhibit && (!inhibitSignal || block.inputC.isEmpty()))
        {
            writeInterlockOutput(block.outputA, runtime.outputIndex, false, "interlock inhibit missing");
            runtimeIndex++;
            continue;
        }

        const bool requestActive = requestSignal ? requestSignal->state.boolValue : true;
        const bool permissiveOk = permissiveSignal ? permissiveSignal->state.boolValue : true;
        const bool inhibitActive = inhibitSignal ? inhibitSignal->state.boolValue : false;

        bool result = requestActive;
        const char *statusText = requestActive ? "interlock_pass" : "interlock_idle";

        if (!requestActive)
        {
            result = false;
            statusText = "interlock_idle";
        }
        else if (needsPermissive && !permissiveOk)
        {
            result = false;
            statusText = "interlock_blocked";
        }
        else if (needsInhibit && inhibitActive)
        {
            result = false;
            statusText = "interlock_inhibited";
        }

        writeInterlockOutput(block.outputA, runtime.outputIndex, result, statusText);
        runtimeIndex++;
    }
}
