#include "../core/data_registry.h"
#include "../core/resource_manager.h"
#include "../config/config.h"
#include "../runtime/signal_registry.h"

float timerRemaining = 0;

struct TimerRuntime {
    int triggerIndex;
    int enableIndex;
    int remainingSignalIndex;
    int activeSignalIndex;
    int phaseRemainingSignalIndex;
    int phaseStateSignalIndex;
    int runningSignalIndex;
    bool prevTrigger;
    bool outputState;
    bool intervalStarted;
    bool intervalOnPhase;
    unsigned long stateStartMs;
};

static float timerRemainingByIndex[MAX_TIMER_BLOCKS];
static bool timerActiveByIndex[MAX_TIMER_BLOCKS];
static TimerRuntime timerRuntime[MAX_TIMER_BLOCKS];
static int timerResolvedCount = 0;

static const char *timerModeOrDefault(const BlockConfig &block)
{
    return block.mode.length() > 0 ? block.mode.c_str() : "pulse";
}

static bool timerOutputIsChannel(const String &outputId)
{
    return gResources.hasChannel(outputId);
}

static void writeTimerOutput(const String &outputId, bool value)
{
    if (timerOutputIsChannel(outputId))
    {
        gResources.writeDigital(outputId, value);
        return;
    }

    if (!gSignals.find(outputId))
    {
        gSignals.registerDerivedSignal(outputId, outputId, SignalClass::Binary,
            SignalDirection::Output, SignalSourceType::BlockOutput, "");
    }

    gSignals.publishBinary(outputId, value, SignalQuality::Good, value ? "on" : "off");
}

void timerInit()
{
    gData.registerValue("timer.remaining", &timerRemaining);
    gSignals.registerDerivedSignal("timer.remaining", "Timer Remaining", SignalClass::Analog,
        SignalDirection::Status, SignalSourceType::BlockOutput, "s");

    for (int i = 0; i < MAX_TIMER_BLOCKS; i++)
    {
        timerRemainingByIndex[i] = 0;
        timerActiveByIndex[i] = false;
        timerRuntime[i].triggerIndex = -1;
        timerRuntime[i].enableIndex = -1;
        timerRuntime[i].remainingSignalIndex = -1;
        timerRuntime[i].activeSignalIndex = -1;
        timerRuntime[i].phaseRemainingSignalIndex = -1;
        timerRuntime[i].phaseStateSignalIndex = -1;
        timerRuntime[i].runningSignalIndex = -1;
        timerRuntime[i].prevTrigger = false;
        timerRuntime[i].outputState = false;
        timerRuntime[i].intervalStarted = false;
        timerRuntime[i].intervalOnPhase = false;
        timerRuntime[i].stateStartMs = 0;

        String key = "timer." + String(i + 1) + ".remaining";
        gData.registerValue(key, &timerRemainingByIndex[i]);
    }
}

void timerConfigure()
{
    timerResolvedCount = 0;

    for (int i = 0; i < MAX_TIMER_BLOCKS; i++)
    {
        timerRuntime[i].triggerIndex = -1;
        timerRuntime[i].enableIndex = -1;
        timerRuntime[i].remainingSignalIndex = -1;
        timerRuntime[i].activeSignalIndex = -1;
        timerRuntime[i].phaseRemainingSignalIndex = -1;
        timerRuntime[i].phaseStateSignalIndex = -1;
        timerRuntime[i].runningSignalIndex = -1;
        timerRuntime[i].prevTrigger = false;
        timerRuntime[i].outputState = false;
        timerRuntime[i].intervalStarted = false;
        timerRuntime[i].intervalOnPhase = false;
        timerRuntime[i].stateStartMs = 0;
        gSignals.unregisterSignal("timer." + String(i + 1) + ".remaining");
        gSignals.unregisterSignal("timer." + String(i + 1) + ".active");
        gSignals.unregisterSignal("timer." + String(i + 1) + ".phase_remaining");
        gSignals.unregisterSignal("timer." + String(i + 1) + ".phase_state");
        gSignals.unregisterSignal("timer." + String(i + 1) + ".running");
    }

    for (int blockIndex = 0; blockIndex < gConfig.blocks.blockCount; blockIndex++)
    {
        const BlockConfig &block = gConfig.blocks.items[blockIndex];
        if (block.type != BlockType::Timer || timerResolvedCount >= MAX_TIMER_BLOCKS)
        {
            continue;
        }

        TimerRuntime &runtime = timerRuntime[timerResolvedCount];
        runtime.triggerIndex = gSignals.findIndex(block.inputA);
        runtime.enableIndex = gSignals.findIndex(block.inputB);

        const String remainingId = "timer." + String(timerResolvedCount + 1) + ".remaining";
        const String activeId = "timer." + String(timerResolvedCount + 1) + ".active";
        const String phaseRemainingId = "timer." + String(timerResolvedCount + 1) + ".phase_remaining";
        const String phaseStateId = "timer." + String(timerResolvedCount + 1) + ".phase_state";
        const String runningId = "timer." + String(timerResolvedCount + 1) + ".running";
        gSignals.registerDerivedSignal(remainingId, remainingId, SignalClass::Analog,
            SignalDirection::Status, SignalSourceType::BlockOutput, "s");
        gSignals.registerDerivedSignal(activeId, activeId, SignalClass::Binary,
            SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(phaseRemainingId, phaseRemainingId, SignalClass::Analog,
            SignalDirection::Status, SignalSourceType::BlockOutput, "s");
        gSignals.registerDerivedSignal(phaseStateId, phaseStateId, SignalClass::Enum,
            SignalDirection::Status, SignalSourceType::BlockOutput, "");
        gSignals.registerDerivedSignal(runningId, runningId, SignalClass::Binary,
            SignalDirection::Status, SignalSourceType::BlockOutput, "");
        runtime.remainingSignalIndex = gSignals.findIndex(remainingId);
        runtime.activeSignalIndex = gSignals.findIndex(activeId);
        runtime.phaseRemainingSignalIndex = gSignals.findIndex(phaseRemainingId);
        runtime.phaseStateSignalIndex = gSignals.findIndex(phaseStateId);
        runtime.runningSignalIndex = gSignals.findIndex(runningId);

        if (!block.outputA.isEmpty() && !timerOutputIsChannel(block.outputA) && !gSignals.find(block.outputA))
        {
            gSignals.registerDerivedSignal(block.outputA, block.outputA, SignalClass::Binary,
                SignalDirection::Output, SignalSourceType::BlockOutput, "");
        }

        timerResolvedCount++;
    }
}

static void updatePulseMode(const BlockConfig &block, TimerRuntime &runtime, bool trigger, unsigned long now,
    float &remaining, float &phaseRemaining, bool &running)
{
    if (trigger && !runtime.prevTrigger)
    {
        runtime.stateStartMs = now;
        runtime.outputState = true;
    }

    if (runtime.outputState)
    {
        const unsigned long elapsed = now - runtime.stateStartMs;
        if (elapsed >= block.durationMs)
        {
            runtime.outputState = false;
            remaining = 0;
        }
        else
        {
            remaining = (block.durationMs - elapsed) / 1000.0f;
            phaseRemaining = remaining;
        }
    }

    running = runtime.outputState;
}

static void updateDelayOnMode(const BlockConfig &block, TimerRuntime &runtime, bool trigger, unsigned long now,
    float &remaining, float &phaseRemaining, bool &running)
{
    if (trigger)
    {
        if (!runtime.prevTrigger)
        {
            runtime.stateStartMs = now;
        }

        const unsigned long elapsed = now - runtime.stateStartMs;
        runtime.outputState = elapsed >= block.durationMs;
        remaining = runtime.outputState ? 0.0f : (block.durationMs - elapsed) / 1000.0f;
        phaseRemaining = remaining;
        running = true;
    }
    else
    {
        runtime.outputState = false;
        remaining = 0;
        phaseRemaining = 0;
        running = false;
        runtime.stateStartMs = now;
    }
}

static void updateDelayOffMode(const BlockConfig &block, TimerRuntime &runtime, bool trigger, unsigned long now,
    float &remaining, float &phaseRemaining, bool &running)
{
    if (trigger)
    {
        runtime.outputState = true;
        remaining = 0;
        phaseRemaining = 0;
        running = true;
        runtime.stateStartMs = now;
    }
    else
    {
        if (runtime.prevTrigger)
        {
            runtime.stateStartMs = now;
        }

        const unsigned long elapsed = now - runtime.stateStartMs;
        if (elapsed >= block.durationMs)
        {
            runtime.outputState = false;
            remaining = 0;
            phaseRemaining = 0;
            running = false;
        }
        else
        {
            runtime.outputState = true;
            remaining = (block.durationMs - elapsed) / 1000.0f;
            phaseRemaining = remaining;
            running = true;
        }
    }
}

static void updateIntervalMode(const BlockConfig &block, TimerRuntime &runtime, bool enabled, unsigned long now,
    float &remaining, float &phaseRemaining, bool &running)
{
    const unsigned long fullCycleMs = block.periodMs;
    const unsigned long onDurationMs = block.durationMs;
    const unsigned long offDurationMs = fullCycleMs > onDurationMs ? (fullCycleMs - onDurationMs) : 0;

    if (!enabled || fullCycleMs == 0)
    {
        runtime.outputState = false;
        runtime.intervalStarted = false;
        runtime.intervalOnPhase = false;
        remaining = 0;
        phaseRemaining = 0;
        running = false;
        return;
    }

    running = true;

    if (!runtime.intervalStarted)
    {
        runtime.intervalStarted = true;
        runtime.intervalOnPhase = block.startImmediately || offDurationMs == 0;
        runtime.stateStartMs = now;
    }

    const unsigned long elapsed = now - runtime.stateStartMs;
    if (runtime.intervalOnPhase)
    {
        runtime.outputState = true;
        if (onDurationMs == 0 || offDurationMs == 0)
        {
            remaining = 0;
            phaseRemaining = 0;
        }
        else if (elapsed >= onDurationMs)
        {
            runtime.intervalOnPhase = false;
            runtime.stateStartMs = now;
            runtime.outputState = false;
            remaining = 0;
            phaseRemaining = offDurationMs / 1000.0f;
        }
        else
        {
            remaining = (onDurationMs - elapsed) / 1000.0f;
            phaseRemaining = remaining;
        }
        return;
    }

    runtime.outputState = false;
    if (offDurationMs == 0)
    {
        runtime.intervalOnPhase = true;
        runtime.stateStartMs = now;
        runtime.outputState = true;
        remaining = onDurationMs / 1000.0f;
        phaseRemaining = remaining;
    }
    else if (elapsed >= offDurationMs)
    {
        runtime.intervalOnPhase = true;
        runtime.stateStartMs = now;
        runtime.outputState = true;
        remaining = onDurationMs / 1000.0f;
        phaseRemaining = remaining;
    }
    else
    {
        remaining = 0;
        phaseRemaining = (offDurationMs - elapsed) / 1000.0f;
    }
}

void timerUpdate()
{
    timerRemaining = 0;
    const unsigned long now = millis();
    int timerIndex = 0;

    for (int blockIndex = 0; blockIndex < gConfig.blocks.blockCount; blockIndex++)
    {
        const BlockConfig &block = gConfig.blocks.items[blockIndex];
        if (block.type != BlockType::Timer)
        {
            continue;
        }

        if (timerIndex >= timerResolvedCount)
        {
            break;
        }

        TimerRuntime &runtime = timerRuntime[timerIndex];
        const bool trigger = gSignals.readBinaryAt(runtime.triggerIndex, false);
        const bool enable = block.inputB.length() > 0 ? gSignals.readBinaryAt(runtime.enableIndex, false) : true;
        const String mode = block.mode.length() > 0 ? block.mode : "pulse";

        float remaining = 0;
        float phaseRemaining = 0;
        bool running = false;
        if (mode == "delay_on")
        {
            updateDelayOnMode(block, runtime, trigger, now, remaining, phaseRemaining, running);
        }
        else if (mode == "delay_off")
        {
            updateDelayOffMode(block, runtime, trigger, now, remaining, phaseRemaining, running);
        }
        else if (mode == "interval")
        {
            updateIntervalMode(block, runtime, true, now, remaining, phaseRemaining, running);
        }
        else if (mode == "interval_while_enabled")
        {
            updateIntervalMode(block, runtime, enable, now, remaining, phaseRemaining, running);
        }
        else
        {
            updatePulseMode(block, runtime, trigger, now, remaining, phaseRemaining, running);
        }

        runtime.prevTrigger = trigger;
        timerRemainingByIndex[timerIndex] = remaining;
        timerActiveByIndex[timerIndex] = runtime.outputState;
        if (remaining > timerRemaining)
        {
            timerRemaining = remaining;
        }

        int phaseState = 0;
        const char *phaseStateText = "inactive";
        if (running)
        {
            phaseState = runtime.outputState ? 1 : 2;
            phaseStateText = runtime.outputState ? "on_phase" : "off_phase";
        }

        if (!block.outputA.isEmpty())
        {
            writeTimerOutput(block.outputA, runtime.outputState);
        }

        gSignals.publishAnalogAt(runtime.remainingSignalIndex, remaining, remaining, SignalQuality::Good,
            runtime.outputState ? "running" : "idle");
        gSignals.publishBinaryAt(runtime.activeSignalIndex, runtime.outputState, SignalQuality::Good,
            runtime.outputState ? "active" : "inactive");
        gSignals.publishAnalogAt(runtime.phaseRemainingSignalIndex, phaseRemaining, phaseRemaining, SignalQuality::Good,
            phaseStateText);
        gSignals.publishAnalogAt(runtime.phaseStateSignalIndex, static_cast<float>(phaseState), static_cast<float>(phaseState), SignalQuality::Good,
            phaseStateText);
        gSignals.publishBinaryAt(runtime.runningSignalIndex, running, SignalQuality::Good,
            running ? "running" : "inactive");
        timerIndex++;
    }

    gSignals.publishAnalog("timer.remaining", timerRemaining, timerRemaining, SignalQuality::Good, "ok");
}
