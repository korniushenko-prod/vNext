#include <math.h>
#include <stdlib.h>

#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "signal_extractor.h"

struct SignalExtractorRuntime {
    int inputAIndex;
    int inputBIndex;
    int qualityIndex;
    int stateOutputIndex;
    int valueOutputIndex;
    bool initialized;
    bool currentState;
};

static SignalExtractorRuntime *signalExtractorRuntime = nullptr;
static int signalExtractorResolvedCount = 0;

static void freeSignalExtractorRuntime()
{
    if (signalExtractorRuntime)
    {
        free(signalExtractorRuntime);
        signalExtractorRuntime = nullptr;
    }
}

static float signalExtractorAsFloat(const SignalRecord *signal)
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

static bool signalExtractorAsBool(const SignalRecord *signal)
{
    if (!signal)
    {
        return false;
    }

    if (signal->definition.signalClass == SignalClass::Binary)
    {
        return signal->state.boolValue;
    }

    return signal->state.engineeringValue >= 0.5f;
}

static bool signalExtractorUpdateHysteresis(bool currentState, float value, float thresholdOn, float thresholdOff)
{
    if (thresholdOn >= thresholdOff)
    {
        if (value >= thresholdOn)
        {
            return true;
        }
        if (value <= thresholdOff)
        {
            return false;
        }
        return currentState;
    }

    if (value <= thresholdOn)
    {
        return true;
    }
    if (value >= thresholdOff)
    {
        return false;
    }
    return currentState;
}

static String signalExtractorValueOutputId(const String &baseOutputId)
{
    return baseOutputId + "_value";
}

void signalExtractorInit()
{
    freeSignalExtractorRuntime();
    signalExtractorResolvedCount = 0;
}

void signalExtractorConfigure()
{
    signalExtractorInit();

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::SignalExtractor && !block.inputA.isEmpty() && !block.outputA.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    signalExtractorRuntime = static_cast<SignalExtractorRuntime *>(calloc(static_cast<size_t>(configuredCount), sizeof(SignalExtractorRuntime)));
    if (!signalExtractorRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::SignalExtractor || block.inputA.isEmpty() || block.outputA.isEmpty() ||
            signalExtractorResolvedCount >= configuredCount)
        {
            continue;
        }

        SignalExtractorRuntime &runtime = signalExtractorRuntime[signalExtractorResolvedCount];
        runtime.inputAIndex = gSignals.findIndex(block.inputA);
        runtime.inputBIndex = gSignals.findIndex(block.inputB);
        runtime.qualityIndex = gSignals.findIndex(block.inputC);
        runtime.stateOutputIndex = -1;
        runtime.valueOutputIndex = -1;
        runtime.initialized = false;
        runtime.currentState = false;

        if (!gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Binary,
                SignalDirection::Status, SignalSourceType::BlockOutput, "");
        }
        runtime.stateOutputIndex = gSignals.findIndex(block.outputA);

        const String valueOutputId = signalExtractorValueOutputId(block.outputA);
        if (!gSignals.find(valueOutputId))
        {
            gSignals.registerDerivedSignal(valueOutputId, valueOutputId, SignalClass::Analog,
                SignalDirection::Status, SignalSourceType::BlockOutput, "");
        }
        runtime.valueOutputIndex = gSignals.findIndex(valueOutputId);

        gSignals.publishBinaryAt(runtime.stateOutputIndex, false, SignalQuality::Good, "extractor_ready");
        gSignals.publishAnalogAt(runtime.valueOutputIndex, 0.0f, 0.0f, SignalQuality::Good, "extractor_ready");

        signalExtractorResolvedCount++;
    }
}

void signalExtractorUpdate()
{
    int runtimeIndex = 0;

    if (!signalExtractorRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::SignalExtractor || block.inputA.isEmpty() || block.outputA.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= signalExtractorResolvedCount)
        {
            break;
        }

        SignalExtractorRuntime &runtime = signalExtractorRuntime[runtimeIndex];
        const SignalRecord *inputA = gSignals.getAt(runtime.inputAIndex);
        const SignalRecord *inputB = gSignals.getAt(runtime.inputBIndex);
        const SignalRecord *qualitySignal = gSignals.getAt(runtime.qualityIndex);

        if (!inputA)
        {
            gSignals.publishBinaryAt(runtime.stateOutputIndex, runtime.currentState, SignalQuality::Fault, "extract_input_missing");
            gSignals.publishAnalogAt(runtime.valueOutputIndex, 0.0f, 0.0f, SignalQuality::Fault, "extract_input_missing");
            runtimeIndex++;
            continue;
        }

        const String mode = block.mode.length() > 0 ? block.mode : "digital_direct";
        float workingValue = signalExtractorAsFloat(inputA);
        SignalQuality quality = inputA->state.quality;
        const char *statusText = "extract_direct";

        if (mode == "analog_diff_pair")
        {
            if (!inputB)
            {
                gSignals.publishBinaryAt(runtime.stateOutputIndex, runtime.currentState, SignalQuality::Fault, "extract_diff_missing");
                gSignals.publishAnalogAt(runtime.valueOutputIndex, 0.0f, 0.0f, SignalQuality::Fault, "extract_diff_missing");
                runtimeIndex++;
                continue;
            }

            workingValue = signalExtractorAsFloat(inputA) - signalExtractorAsFloat(inputB);
            quality = (inputA->state.quality == SignalQuality::Fault || inputB->state.quality == SignalQuality::Fault)
                ? SignalQuality::Fault
                : inputA->state.quality;
            statusText = "extract_diff";
        }
        else if (mode == "analog_threshold")
        {
            workingValue = signalExtractorAsFloat(inputA);
            statusText = "extract_threshold";
        }

        if (!runtime.initialized)
        {
            runtime.initialized = true;
            if (mode == "digital_direct")
            {
                runtime.currentState = signalExtractorAsBool(inputA);
            }
            else
            {
                runtime.currentState = signalExtractorUpdateHysteresis(false, workingValue, block.compareValueA, block.compareValueB);
            }
        }

        if (mode == "digital_direct")
        {
            runtime.currentState = signalExtractorAsBool(inputA);
        }
        else
        {
            runtime.currentState = signalExtractorUpdateHysteresis(runtime.currentState, workingValue, block.compareValueA, block.compareValueB);
        }

        if (qualitySignal && !signalExtractorAsBool(qualitySignal))
        {
            if (quality != SignalQuality::Fault)
            {
                quality = SignalQuality::Stale;
            }
            statusText = "extract_quality_blocked";
        }
        else if (quality == SignalQuality::Uninitialized)
        {
            quality = SignalQuality::Good;
        }

        gSignals.publishBinaryAt(runtime.stateOutputIndex, runtime.currentState, quality, statusText);
        gSignals.publishAnalogAt(runtime.valueOutputIndex, workingValue, workingValue, quality, statusText);
        runtimeIndex++;
    }
}
