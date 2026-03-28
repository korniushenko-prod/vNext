#include <math.h>
#include <stdlib.h>

#include "../config/config.h"
#include "../runtime/signal_registry.h"

#include "mode_authority.h"

struct ModeAuthorityRuntime {
    int primaryIndex;
    int secondaryIndex;
    int serviceIndex;
    int controlIndex;
    int outputIndex;
    int modeIndexSignalIndex;
    int validSignalIndex;
    int primaryActiveSignalIndex;
    int secondaryActiveSignalIndex;
    int serviceActiveSignalIndex;
    bool hasService;
    SignalClass outputClass;
};

static ModeAuthorityRuntime *modeAuthorityRuntime = nullptr;
static int modeAuthorityResolvedCount = 0;

struct ModeAuthorityLabels {
    String primary;
    String secondary;
    String service;
    bool hasService;
};

static ModeAuthorityLabels getModeAuthorityLabels(const String &mode)
{
    ModeAuthorityLabels labels;
    labels.primary = "local";
    labels.secondary = "remote";
    labels.service = "service";
    labels.hasService = false;

    if (mode == "auto_manual")
    {
        labels.primary = "auto";
        labels.secondary = "manual";
    }
    else if (mode == "local_remote_service")
    {
        labels.primary = "local";
        labels.secondary = "remote";
        labels.hasService = true;
    }
    else if (mode == "auto_manual_service")
    {
        labels.primary = "auto";
        labels.secondary = "manual";
        labels.hasService = true;
    }

    return labels;
}

static int decodeModeSelection(const SignalRecord *controlSignal, bool hasService)
{
    if (!controlSignal)
    {
        return 0;
    }

    int selectedIndex = 0;
    if (controlSignal->definition.signalClass == SignalClass::Binary)
    {
        selectedIndex = controlSignal->state.boolValue ? 1 : 0;
    }
    else
    {
        selectedIndex = static_cast<int>(lroundf(controlSignal->state.engineeringValue));
    }

    const int maxIndex = hasService ? 2 : 1;
    if (selectedIndex < 0) selectedIndex = 0;
    if (selectedIndex > maxIndex) selectedIndex = maxIndex;
    return selectedIndex;
}

static SignalClass resolveOutputClass(const SignalRecord *sourceSignal)
{
    if (!sourceSignal)
    {
        return SignalClass::Binary;
    }

    if (sourceSignal->definition.signalClass == SignalClass::Binary)
    {
        return SignalClass::Binary;
    }

    return SignalClass::Analog;
}

void modeAuthorityInit()
{
    if (modeAuthorityRuntime)
    {
        free(modeAuthorityRuntime);
        modeAuthorityRuntime = nullptr;
    }
    modeAuthorityResolvedCount = 0;
}

void modeAuthorityConfigure()
{
    modeAuthorityInit();

    int configuredCount = 0;
    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type == BlockType::ModeAuthority && !block.outputA.isEmpty() && !block.inputA.isEmpty() && !block.inputB.isEmpty())
        {
            configuredCount++;
        }
    }

    if (configuredCount <= 0)
    {
        return;
    }

    modeAuthorityRuntime = static_cast<ModeAuthorityRuntime *>(calloc(static_cast<size_t>(configuredCount), sizeof(ModeAuthorityRuntime)));
    if (!modeAuthorityRuntime)
    {
        return;
    }

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::ModeAuthority || block.outputA.isEmpty() || block.inputA.isEmpty() || block.inputB.isEmpty())
        {
            continue;
        }

        if (modeAuthorityResolvedCount >= configuredCount)
        {
            break;
        }

        const ModeAuthorityLabels labels = getModeAuthorityLabels(block.mode);
        ModeAuthorityRuntime &runtime = modeAuthorityRuntime[modeAuthorityResolvedCount];
        runtime.primaryIndex = -1;
        runtime.secondaryIndex = -1;
        runtime.serviceIndex = -1;
        runtime.controlIndex = -1;
        runtime.outputIndex = -1;
        runtime.modeIndexSignalIndex = -1;
        runtime.validSignalIndex = -1;
        runtime.primaryActiveSignalIndex = -1;
        runtime.secondaryActiveSignalIndex = -1;
        runtime.serviceActiveSignalIndex = -1;
        runtime.hasService = false;
        runtime.outputClass = SignalClass::Binary;
        runtime.primaryIndex = gSignals.findIndex(block.inputA);
        runtime.secondaryIndex = gSignals.findIndex(block.inputB);
        runtime.serviceIndex = block.inputC.isEmpty() ? -1 : gSignals.findIndex(block.inputC);
        runtime.controlIndex = gSignals.findIndex(block.controlSignal);
        runtime.hasService = labels.hasService;

        const SignalRecord *classProbe = gSignals.find(block.inputA);
        if (!classProbe) classProbe = gSignals.find(block.inputB);
        if (!classProbe && labels.hasService) classProbe = gSignals.find(block.inputC);
        runtime.outputClass = resolveOutputClass(classProbe);

        if (!gSignals.find(block.outputA))
        {
            SignalDirection direction = SignalDirection::Status;
            String units = "";
            if (classProbe)
            {
                direction = classProbe->definition.direction;
                units = classProbe->definition.units;
            }
            gSignals.registerDerivedSignal(block.outputA, block.outputA, runtime.outputClass,
                direction, SignalSourceType::BlockOutput, units);
        }
        runtime.outputIndex = gSignals.findIndex(block.outputA);

        const String base = block.id;
        gSignals.registerDerivedSignal(base + ".mode_index", base + ".mode_index",
            SignalClass::Enum, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + ".valid", base + ".valid",
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + "." + labels.primary, base + "." + labels.primary,
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(base + "." + labels.secondary, base + "." + labels.secondary,
            SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        if (labels.hasService)
        {
            gSignals.registerDerivedSignal(base + "." + labels.service, base + "." + labels.service,
                SignalClass::Binary, SignalDirection::Status, SignalSourceType::BlockOutput, "");
        }

        runtime.modeIndexSignalIndex = gSignals.findIndex(base + ".mode_index");
        runtime.validSignalIndex = gSignals.findIndex(base + ".valid");
        runtime.primaryActiveSignalIndex = gSignals.findIndex(base + "." + labels.primary);
        runtime.secondaryActiveSignalIndex = gSignals.findIndex(base + "." + labels.secondary);
        runtime.serviceActiveSignalIndex = labels.hasService ? gSignals.findIndex(base + "." + labels.service) : -1;
        modeAuthorityResolvedCount++;
    }
}

void modeAuthorityUpdate()
{
    int runtimeIndex = 0;

    for (int i = 0; i < gConfig.blocks.blockCount; i++)
    {
        const BlockConfig &block = gConfig.blocks.items[i];
        if (block.type != BlockType::ModeAuthority || block.outputA.isEmpty() || block.inputA.isEmpty() || block.inputB.isEmpty())
        {
            continue;
        }

        if (runtimeIndex >= modeAuthorityResolvedCount)
        {
            break;
        }

        const ModeAuthorityLabels labels = getModeAuthorityLabels(block.mode);
        ModeAuthorityRuntime &runtime = modeAuthorityRuntime[runtimeIndex];

        const SignalRecord *primarySignal = gSignals.getAt(runtime.primaryIndex);
        const SignalRecord *secondarySignal = gSignals.getAt(runtime.secondaryIndex);
        const SignalRecord *serviceSignal = runtime.hasService ? gSignals.getAt(runtime.serviceIndex) : nullptr;
        const SignalRecord *controlSignal = gSignals.getAt(runtime.controlIndex);

        const int selectedMode = decodeModeSelection(controlSignal, runtime.hasService);
        const SignalRecord *selectedSignal = selectedMode == 0 ? primarySignal : (selectedMode == 1 ? secondarySignal : serviceSignal);

        const bool valid = selectedSignal != nullptr;
        const bool primaryActive = selectedMode == 0 && valid;
        const bool secondaryActive = selectedMode == 1 && valid;
        const bool serviceActive = runtime.hasService && selectedMode == 2 && valid;

        gSignals.publishAnalogAt(runtime.modeIndexSignalIndex, static_cast<float>(selectedMode), static_cast<float>(selectedMode),
            valid ? SignalQuality::Good : SignalQuality::Fault, valid ? "mode_selected" : "mode_invalid");
        gSignals.publishBinaryAt(runtime.validSignalIndex, valid, valid ? SignalQuality::Good : SignalQuality::Fault,
            valid ? "mode_valid" : "mode_invalid");
        gSignals.publishBinaryAt(runtime.primaryActiveSignalIndex, primaryActive, SignalQuality::Good,
            primaryActive ? labels.primary : "idle");
        gSignals.publishBinaryAt(runtime.secondaryActiveSignalIndex, secondaryActive, SignalQuality::Good,
            secondaryActive ? labels.secondary : "idle");
        if (runtime.hasService && runtime.serviceActiveSignalIndex >= 0)
        {
            gSignals.publishBinaryAt(runtime.serviceActiveSignalIndex, serviceActive, SignalQuality::Good,
                serviceActive ? labels.service : "idle");
        }

        if (!selectedSignal)
        {
            if (runtime.outputClass == SignalClass::Binary)
            {
                gSignals.publishBinaryAt(runtime.outputIndex, false, SignalQuality::Fault, "mode source missing");
            }
            else
            {
                gSignals.publishAnalogAt(runtime.outputIndex, 0.0f, 0.0f, SignalQuality::Fault, "mode source missing");
            }
            runtimeIndex++;
            continue;
        }

        const String selectedStatus = selectedMode == 0 ? labels.primary : (selectedMode == 1 ? labels.secondary : labels.service);
        if (runtime.outputClass == SignalClass::Binary || selectedSignal->definition.signalClass == SignalClass::Binary)
        {
            gSignals.publishBinaryAt(runtime.outputIndex, selectedSignal->state.boolValue,
                selectedSignal->state.quality, selectedStatus);
        }
        else
        {
            gSignals.publishAnalogAt(runtime.outputIndex, selectedSignal->state.rawValue,
                selectedSignal->state.engineeringValue, selectedSignal->state.quality, selectedStatus);
        }

        runtimeIndex++;
    }
}
