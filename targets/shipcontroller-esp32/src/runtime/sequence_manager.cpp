#include "sequence_manager.h"

#include <ArduinoJson.h>

#include "../config/config_loader.h"
#include "../core/resource_manager.h"
#include "signal_registry.h"

namespace {

bool loadSequenceConfigDocument(JsonDocument &doc)
{
    return loadConfigDocumentFromStorage(doc);
}

String sequenceSignalId(const String &sequenceId, const String &suffix)
{
    return "sequence." + sequenceId + "." + suffix;
}

String sequenceStateSignalId(const String &sequenceId, const String &stateId)
{
    return "sequence." + sequenceId + ".state." + stateId;
}

String defaultSequenceLabel(const String &sequenceId)
{
    return sequenceId.length() > 0 ? sequenceId : "sequence";
}

struct SequenceActionTarget {
    String targetId;
    bool forceChannel;
    bool forceSignal;
};

SequenceActionTarget parseSequenceActionTarget(const String &rawTarget)
{
    SequenceActionTarget target;
    target.targetId = rawTarget;
    target.forceChannel = false;
    target.forceSignal = false;

    if (rawTarget.startsWith("channel:"))
    {
        target.targetId = rawTarget.substring(8);
        target.forceChannel = true;
    }
    else if (rawTarget.startsWith("signal:"))
    {
        target.targetId = rawTarget.substring(7);
        target.forceSignal = true;
    }
    else if (rawTarget.startsWith("command:"))
    {
        target.targetId = rawTarget.substring(8);
        target.forceSignal = true;
    }

    target.targetId.trim();
    return target;
}

bool writeSequenceActionTarget(const String &rawTargetId, bool value)
{
    const SequenceActionTarget target = parseSequenceActionTarget(rawTargetId);
    if (target.targetId.isEmpty())
    {
        return false;
    }

    if (target.forceSignal)
    {
        return gSignals.publishBinary(target.targetId, value, SignalQuality::Good, "sequence_action");
    }

    if (target.forceChannel)
    {
        if (!gResources.hasChannel(target.targetId))
        {
            return false;
        }
        gResources.writeDigital(target.targetId, value);
        gSignals.publishBinary(target.targetId, value, SignalQuality::Good, "sequence_action");
        return true;
    }

    if (gResources.hasChannel(target.targetId))
    {
        gResources.writeDigital(target.targetId, value);
        gSignals.publishBinary(target.targetId, value, SignalQuality::Good, "sequence_action");
        return true;
    }

    return gSignals.publishBinary(target.targetId, value, SignalQuality::Good, "sequence_action");
}

} // namespace

SequenceManager gSequences;

SequenceManager::SequenceManager()
    : definitions(nullptr), runtimeStates(nullptr), sequenceCount(0),
      recentEvents(nullptr), recentEventCapacity(0), recentEventCount(0), recentEventStart(0)
{
}

void SequenceManager::freeDefinitions()
{
    if (runtimeStates != nullptr)
    {
        for (int i = 0; i < sequenceCount; i++)
        {
            if (runtimeStates[i].stateSignalIndexes != nullptr)
            {
                delete[] runtimeStates[i].stateSignalIndexes;
                runtimeStates[i].stateSignalIndexes = nullptr;
            }
        }
    }

    if (definitions != nullptr)
    {
        for (int i = 0; i < sequenceCount; i++)
        {
            SequenceDefinition &definition = definitions[i];
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "enabled"));
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "running"));
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "ready"));
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "done"));
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "fault"));
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "waiting"));
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "current_state_index"));
            gSignals.unregisterSignal(sequenceSignalId(definition.id, "time_in_state_ms"));

            for (int stateIndex = 0; stateIndex < definition.stateCount; stateIndex++)
            {
                SequenceStateDefinition &state = definition.states[stateIndex];
                gSignals.unregisterSignal(sequenceStateSignalId(definition.id, state.id));

                if (state.actionsOn != nullptr)
                {
                    delete[] state.actionsOn;
                    state.actionsOn = nullptr;
                }
                if (state.actionsOff != nullptr)
                {
                    delete[] state.actionsOff;
                    state.actionsOff = nullptr;
                }
                if (state.transitions != nullptr)
                {
                    delete[] state.transitions;
                    state.transitions = nullptr;
                }
                state.actionsOnCount = 0;
                state.actionsOffCount = 0;
                state.transitionCount = 0;
            }

            if (definition.states != nullptr)
            {
                delete[] definition.states;
                definition.states = nullptr;
            }
            definition.stateCount = 0;
        }

        delete[] definitions;
        definitions = nullptr;
    }

    if (runtimeStates != nullptr)
    {
        delete[] runtimeStates;
        runtimeStates = nullptr;
    }
}

void SequenceManager::reset()
{
    freeDefinitions();

    if (recentEvents != nullptr)
    {
        delete[] recentEvents;
        recentEvents = nullptr;
    }

    sequenceCount = 0;
    recentEventCapacity = 0;
    recentEventCount = 0;
    recentEventStart = 0;
}

void SequenceManager::pushEvent(const String &sequenceId, const String &type,
    const String &fromStateId, const String &toStateId, const String &text)
{
    if (recentEvents == nullptr || recentEventCapacity <= 0)
    {
        return;
    }

    const int targetIndex = (recentEventStart + recentEventCount) % recentEventCapacity;
    SequenceEventRecord &eventRecord = recentEvents[targetIndex];
    eventRecord.timestampMs = millis();
    eventRecord.sequenceId = sequenceId;
    eventRecord.type = type;
    eventRecord.fromStateId = fromStateId;
    eventRecord.toStateId = toStateId;
    eventRecord.text = text;

    if (recentEventCount < recentEventCapacity)
    {
        recentEventCount++;
    }
    else
    {
        recentEventStart = (recentEventStart + 1) % recentEventCapacity;
    }
}

int SequenceManager::findSequenceIndex(const String &sequenceId) const
{
    for (int i = 0; i < sequenceCount; i++)
    {
        if (definitions[i].id == sequenceId)
        {
            return i;
        }
    }
    return -1;
}

int SequenceManager::findStateIndex(const SequenceDefinition &definition, const String &stateId) const
{
    if (stateId.isEmpty())
    {
        return -1;
    }

    for (int i = 0; i < definition.stateCount; i++)
    {
        if (definition.states[i].id == stateId)
        {
            return i;
        }
    }
    return -1;
}

void SequenceManager::clearRuntimeState(int index, const String &statusText)
{
    if (index < 0 || index >= sequenceCount)
    {
        return;
    }

    SequenceRuntimeState &runtime = runtimeStates[index];
    runtime.running = false;
    runtime.waiting = false;
    runtime.done = false;
    runtime.faulted = false;
    runtime.currentStateIndex = -1;
    runtime.pendingTransitionIndex = -1;
    runtime.stateSinceMs = 0;
    runtime.pendingTransitionSinceMs = 0;
    runtime.lastChangeMs = millis();
    runtime.statusText = statusText;
    runtime.waitingReason = "";
    runtime.detailText = "";
    runtime.faultReason = "";
}

bool SequenceManager::enterState(int index, int targetStateIndex, const String &eventType, const String &reasonText)
{
    if (index < 0 || index >= sequenceCount)
    {
        return false;
    }

    SequenceDefinition &definition = definitions[index];
    SequenceRuntimeState &runtime = runtimeStates[index];
    if (targetStateIndex < 0 || targetStateIndex >= definition.stateCount)
    {
        return false;
    }

    const String fromStateId = (runtime.currentStateIndex >= 0 && runtime.currentStateIndex < definition.stateCount)
        ? definition.states[runtime.currentStateIndex].id
        : "";
    const SequenceStateDefinition &targetState = definition.states[targetStateIndex];
    const uint32_t now = millis();

    runtime.currentStateIndex = targetStateIndex;
    runtime.pendingTransitionIndex = -1;
    runtime.pendingTransitionSinceMs = 0;
    runtime.stateSinceMs = now;
    runtime.lastChangeMs = now;
    runtime.waiting = false;
    runtime.waitingReason = "";
    runtime.detailText = reasonText;
    runtime.enabled = true;
    runtime.done = false;
    runtime.faulted = false;
    runtime.running = true;
    runtime.statusText = "running";
    runtime.faultReason = "";

    if (!definition.faultStateId.isEmpty() && targetState.id == definition.faultStateId)
    {
        runtime.running = false;
        runtime.faulted = true;
        runtime.statusText = "fault";
        runtime.faultReason = reasonText;
    }
    else if (!definition.doneStateId.isEmpty() && targetState.id == definition.doneStateId)
    {
        runtime.running = false;
        runtime.done = true;
        runtime.statusText = "done";
    }

    pushEvent(definition.id, eventType, fromStateId, targetState.id,
        definition.label + ": " + (targetState.label.length() > 0 ? targetState.label : targetState.id) +
        (reasonText.isEmpty() ? "" : " (" + reasonText + ")"));
    return true;
}

void SequenceManager::resetSequenceRuntime(int index, bool restartIfPossible, const String &eventType, const String &reasonText)
{
    if (index < 0 || index >= sequenceCount)
    {
        return;
    }

    SequenceDefinition &definition = definitions[index];
    SequenceRuntimeState &runtime = runtimeStates[index];
    const String fromStateId = (runtime.currentStateIndex >= 0 && runtime.currentStateIndex < definition.stateCount)
        ? definition.states[runtime.currentStateIndex].id
        : "";

    clearRuntimeState(index, "ready");
    runtime.enabled = definition.enableSignalId.isEmpty() ? true : gSignals.readBinary(definition.enableSignalId, false);
    pushEvent(definition.id, eventType, fromStateId, "", definition.label + ": reset");

    if (!restartIfPossible || !runtime.enabled)
    {
        runtime.statusText = runtime.enabled ? "ready" : "disabled";
        return;
    }

    const int initialStateIndex = findStateIndex(definition, definition.initialStateId);
    if (initialStateIndex >= 0)
    {
        enterState(index, initialStateIndex, "start", reasonText);
    }
}

bool SequenceManager::publishOwnedSignals(int index)
{
    if (index < 0 || index >= sequenceCount)
    {
        return false;
    }

    const SequenceDefinition &definition = definitions[index];
    SequenceRuntimeState &runtime = runtimeStates[index];
    const uint32_t now = millis();
    const float timeInStateMs = runtime.currentStateIndex >= 0 ? static_cast<float>(now - runtime.stateSinceMs) : 0.0f;
    const bool ready = runtime.enabled && !runtime.faulted;

    gSignals.publishBinaryAt(runtime.enabledSignalIndex, runtime.enabled, SignalQuality::Good,
        runtime.enabled ? "sequence_enabled" : "sequence_disabled");
    gSignals.publishBinaryAt(runtime.runningSignalIndex, runtime.running, SignalQuality::Good,
        runtime.running ? "sequence_running" : "sequence_stopped");
    gSignals.publishBinaryAt(runtime.readySignalIndex, ready, SignalQuality::Good,
        ready ? "sequence_ready" : runtime.statusText);
    gSignals.publishBinaryAt(runtime.doneSignalIndex, runtime.done, SignalQuality::Good,
        runtime.done ? "sequence_done" : runtime.statusText);
    gSignals.publishBinaryAt(runtime.faultSignalIndex, runtime.faulted, SignalQuality::Good,
        runtime.faulted ? "sequence_fault" : runtime.statusText);
    gSignals.publishBinaryAt(runtime.waitingSignalIndex, runtime.waiting, SignalQuality::Good,
        runtime.waiting ? runtime.waitingReason : runtime.statusText);
    gSignals.publishAnalogAt(runtime.currentStateIndexSignalIndex,
        static_cast<float>(runtime.currentStateIndex),
        static_cast<float>(runtime.currentStateIndex),
        SignalQuality::Good, runtime.statusText);
    gSignals.publishAnalogAt(runtime.timeInStateSignalIndex, timeInStateMs, timeInStateMs,
        SignalQuality::Good, runtime.statusText);

    for (int stateIndex = 0; stateIndex < definition.stateCount; stateIndex++)
    {
        const bool active = runtime.currentStateIndex == stateIndex;
        gSignals.publishBinaryAt(runtime.stateSignalIndexes[stateIndex], active,
            SignalQuality::Good, active ? "sequence_state_active" : "sequence_state_idle");
    }

    return true;
}

bool SequenceManager::applyStateActions(int index)
{
    if (index < 0 || index >= sequenceCount)
    {
        return false;
    }

    const SequenceDefinition &definition = definitions[index];
    const SequenceRuntimeState &runtime = runtimeStates[index];
    if (runtime.currentStateIndex < 0 || runtime.currentStateIndex >= definition.stateCount)
    {
        return false;
    }

    const SequenceStateDefinition &state = definition.states[runtime.currentStateIndex];
    for (int i = 0; i < state.actionsOnCount; i++)
    {
        writeSequenceActionTarget(state.actionsOn[i], true);
    }
    for (int i = 0; i < state.actionsOffCount; i++)
    {
        writeSequenceActionTarget(state.actionsOff[i], false);
    }
    return true;
}

bool SequenceManager::configureFromConfig(String &errorMessage)
{
    reset();

    JsonDocument doc;
    if (!loadSequenceConfigDocument(doc))
    {
        return true;
    }

    JsonObject sequencesObject = doc["sequences"].as<JsonObject>();
    if (sequencesObject.isNull())
    {
        return true;
    }

    sequenceCount = sequencesObject.size();
    if (sequenceCount <= 0)
    {
        sequenceCount = 0;
        return true;
    }

    definitions = new SequenceDefinition[sequenceCount];
    runtimeStates = new SequenceRuntimeState[sequenceCount];
    recentEventCapacity = 24;
    recentEvents = new SequenceEventRecord[recentEventCapacity];
    if (definitions == nullptr || runtimeStates == nullptr || recentEvents == nullptr)
    {
        errorMessage = "Failed to allocate sequence runtime";
        reset();
        return false;
    }

    int sequenceIndex = 0;
    for (JsonPair pair : sequencesObject)
    {
        JsonObject sequenceObject = pair.value().as<JsonObject>();
        SequenceDefinition &definition = definitions[sequenceIndex];
        SequenceRuntimeState &runtime = runtimeStates[sequenceIndex];

        definition.id = pair.key().c_str();
        definition.label = sequenceObject["label"] | defaultSequenceLabel(definition.id);
        definition.enableSignalId = sequenceObject["enable_signal"] | "";
        definition.startSignalId = sequenceObject["start_signal"] | "";
        definition.tripSignalId = sequenceObject["trip_signal"] | "";
        definition.resetSignalId = sequenceObject["reset_signal"] | "";
        definition.initialStateId = sequenceObject["initial_state"] | "";
        definition.faultStateId = sequenceObject["fault_state"] | "";
        definition.doneStateId = sequenceObject["done_state"] | "";
        definition.autoStart = sequenceObject["auto_start"] | true;
        definition.states = nullptr;
        definition.stateCount = 0;

        JsonObject statesObject = sequenceObject["states"].as<JsonObject>();
        if (!statesObject.isNull() && statesObject.size() > 0)
        {
            definition.stateCount = statesObject.size();
            definition.states = new SequenceStateDefinition[definition.stateCount];
            if (definition.states == nullptr)
            {
                errorMessage = "Failed to allocate sequence states";
                reset();
                return false;
            }

            int stateIndex = 0;
            for (JsonPair statePair : statesObject)
            {
                JsonObject stateObject = statePair.value().as<JsonObject>();
                SequenceStateDefinition &state = definition.states[stateIndex];
                state.id = statePair.key().c_str();
                state.label = stateObject["label"] | state.id;
                state.permissiveSignalId = stateObject["permissive_signal"] | "";
                state.timeoutMs = stateObject["timeout_ms"] | 0UL;
                state.timeoutToStateId = stateObject["timeout_to"] | "";
                state.actionsOn = nullptr;
                state.actionsOnCount = 0;
                state.actionsOff = nullptr;
                state.actionsOffCount = 0;
                state.transitions = nullptr;
                state.transitionCount = 0;

                JsonArray actionsOnArray = stateObject["actions_on"].as<JsonArray>();
                if (!actionsOnArray.isNull() && actionsOnArray.size() > 0)
                {
                    state.actionsOnCount = actionsOnArray.size();
                    state.actionsOn = new String[state.actionsOnCount];
                    if (state.actionsOn == nullptr)
                    {
                        errorMessage = "Failed to allocate sequence actions_on";
                        reset();
                        return false;
                    }
                    int actionIndex = 0;
                    for (JsonVariant action : actionsOnArray)
                    {
                        state.actionsOn[actionIndex++] = action.as<const char*>() ? String(action.as<const char*>()) : "";
                    }
                }

                JsonArray actionsOffArray = stateObject["actions_off"].as<JsonArray>();
                if (!actionsOffArray.isNull() && actionsOffArray.size() > 0)
                {
                    state.actionsOffCount = actionsOffArray.size();
                    state.actionsOff = new String[state.actionsOffCount];
                    if (state.actionsOff == nullptr)
                    {
                        errorMessage = "Failed to allocate sequence actions_off";
                        reset();
                        return false;
                    }
                    int actionIndex = 0;
                    for (JsonVariant action : actionsOffArray)
                    {
                        state.actionsOff[actionIndex++] = action.as<const char*>() ? String(action.as<const char*>()) : "";
                    }
                }

                JsonObject transitionsObject = stateObject["transitions"].as<JsonObject>();
                if (!transitionsObject.isNull() && transitionsObject.size() > 0)
                {
                    state.transitionCount = transitionsObject.size();
                    state.transitions = new SequenceTransitionDefinition[state.transitionCount];
                    if (state.transitions == nullptr)
                    {
                        errorMessage = "Failed to allocate sequence transitions";
                        reset();
                        return false;
                    }

                    int transitionIndex = 0;
                    for (JsonPair transitionPair : transitionsObject)
                    {
                        JsonObject transitionObject = transitionPair.value().as<JsonObject>();
                        SequenceTransitionDefinition &transition = state.transitions[transitionIndex++];
                        transition.id = transitionPair.key().c_str();
                        transition.label = transitionObject["label"] | transition.id;
                        transition.toStateId = transitionObject["to"] | "";
                        transition.whenSignalId = transitionObject["when_signal"] | "";
                        transition.delayMs = transitionObject["delay_ms"] | 0UL;
                        transition.invert = transitionObject["invert"] | false;
                    }
                }

                stateIndex++;
            }
        }

        runtime.enabled = false;
        runtime.running = false;
        runtime.waiting = false;
        runtime.done = false;
        runtime.faulted = false;
        runtime.currentStateIndex = -1;
        runtime.pendingTransitionIndex = -1;
        runtime.stateSinceMs = 0;
        runtime.pendingTransitionSinceMs = 0;
        runtime.lastChangeMs = 0;
        runtime.statusText = "idle";
        runtime.waitingReason = "";
        runtime.detailText = "";
        runtime.faultReason = "";
        runtime.stateSignalIndexes = nullptr;

        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "enabled"),
            definition.label + " enabled", SignalClass::Binary, SignalDirection::Status, SignalSourceType::Virtual);
        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "running"),
            definition.label + " running", SignalClass::Binary, SignalDirection::Status, SignalSourceType::Virtual);
        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "ready"),
            definition.label + " ready", SignalClass::Binary, SignalDirection::Status, SignalSourceType::Virtual);
        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "done"),
            definition.label + " done", SignalClass::Binary, SignalDirection::Status, SignalSourceType::Virtual);
        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "fault"),
            definition.label + " fault", SignalClass::Binary, SignalDirection::Status, SignalSourceType::Virtual);
        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "waiting"),
            definition.label + " waiting", SignalClass::Binary, SignalDirection::Status, SignalSourceType::Virtual);
        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "current_state_index"),
            definition.label + " state index", SignalClass::Analog, SignalDirection::Status, SignalSourceType::Virtual);
        gSignals.registerDerivedSignal(sequenceSignalId(definition.id, "time_in_state_ms"),
            definition.label + " time in state", SignalClass::Analog, SignalDirection::Status, SignalSourceType::Virtual, "ms");

        runtime.enabledSignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "enabled"));
        runtime.runningSignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "running"));
        runtime.readySignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "ready"));
        runtime.doneSignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "done"));
        runtime.faultSignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "fault"));
        runtime.waitingSignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "waiting"));
        runtime.currentStateIndexSignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "current_state_index"));
        runtime.timeInStateSignalIndex = gSignals.findIndex(sequenceSignalId(definition.id, "time_in_state_ms"));

        if (definition.stateCount > 0)
        {
            runtime.stateSignalIndexes = new int[definition.stateCount];
            if (runtime.stateSignalIndexes == nullptr)
            {
                errorMessage = "Failed to allocate sequence state signals";
                reset();
                return false;
            }

            for (int stateIndex = 0; stateIndex < definition.stateCount; stateIndex++)
            {
                gSignals.registerDerivedSignal(sequenceStateSignalId(definition.id, definition.states[stateIndex].id),
                    definition.label + " / " + definition.states[stateIndex].label,
                    SignalClass::Binary, SignalDirection::Status, SignalSourceType::Virtual);
                runtime.stateSignalIndexes[stateIndex] = gSignals.findIndex(sequenceStateSignalId(definition.id, definition.states[stateIndex].id));
            }
        }

        sequenceIndex++;
    }

    return true;
}

void SequenceManager::update()
{
    const uint32_t now = millis();

    for (int sequenceIndex = 0; sequenceIndex < sequenceCount; sequenceIndex++)
    {
        SequenceDefinition &definition = definitions[sequenceIndex];
        SequenceRuntimeState &runtime = runtimeStates[sequenceIndex];

    const bool enabled = definition.enableSignalId.isEmpty()
            ? true
            : gSignals.readBinary(definition.enableSignalId, false);
        const bool startSignal = !definition.startSignalId.isEmpty() && gSignals.readBinary(definition.startSignalId, false);
        const bool resetSignal = !definition.resetSignalId.isEmpty() && gSignals.readBinary(definition.resetSignalId, false);
        const bool tripSignal = !definition.tripSignalId.isEmpty() && gSignals.readBinary(definition.tripSignalId, false);

        if (!enabled)
        {
            if (runtime.enabled || runtime.currentStateIndex >= 0 || runtime.running || runtime.done || runtime.faulted)
            {
                clearRuntimeState(sequenceIndex, "disabled");
                runtime.enabled = false;
                runtime.detailText = definition.enableSignalId;
            }
            publishOwnedSignals(sequenceIndex);
            continue;
        }

        runtime.enabled = true;

        if (resetSignal)
        {
            resetSequenceRuntime(sequenceIndex,
                definition.autoStart || definition.startSignalId.isEmpty() || startSignal,
                "reset", "reset_signal");
            publishOwnedSignals(sequenceIndex);
            continue;
        }

        if (runtime.currentStateIndex < 0 && !runtime.done && !runtime.faulted)
        {
            const bool shouldStart = definition.autoStart || definition.startSignalId.isEmpty() || startSignal;
            if (shouldStart)
            {
                const int initialStateIndex = findStateIndex(definition, definition.initialStateId);
                if (initialStateIndex >= 0)
                {
                    enterState(sequenceIndex, initialStateIndex, "start",
                        definition.startSignalId.isEmpty() ? "auto_start" : "start_signal");
                }
                else
                {
                    runtime.statusText = "missing_initial_state";
                    runtime.detailText = definition.initialStateId;
                }
            }
            else
            {
                runtime.statusText = "ready";
                runtime.waiting = true;
                runtime.waitingReason = definition.startSignalId;
                runtime.detailText = "await_start_signal";
            }
        }

        if (tripSignal && runtime.currentStateIndex >= 0 && !runtime.faulted)
        {
            const int faultStateIndex = findStateIndex(definition, definition.faultStateId);
            if (faultStateIndex >= 0)
            {
                enterState(sequenceIndex, faultStateIndex, "fault", "trip_signal");
            }
            else
            {
                runtime.faulted = true;
                runtime.running = false;
                runtime.statusText = "fault";
                runtime.waiting = false;
                runtime.waitingReason = "trip_signal";
                runtime.detailText = definition.tripSignalId.length() > 0 ? definition.tripSignalId : "trip_signal";
                runtime.faultReason = runtime.detailText;
                pushEvent(definition.id, "fault", "",
                    runtime.currentStateIndex >= 0 ? definition.states[runtime.currentStateIndex].id : "",
                    definition.label + ": trip");
            }
        }

        if (runtime.currentStateIndex >= 0 && runtime.currentStateIndex < definition.stateCount)
        {
            const SequenceStateDefinition &state = definition.states[runtime.currentStateIndex];
            applyStateActions(sequenceIndex);

            if (!runtime.faulted && !runtime.done)
            {
                const bool permissiveOk = state.permissiveSignalId.isEmpty()
                    ? true
                    : gSignals.readBinary(state.permissiveSignalId, false);

                if (!permissiveOk)
                {
                    runtime.running = true;
                    runtime.waiting = true;
                    runtime.statusText = "waiting";
                    runtime.waitingReason = state.permissiveSignalId;
                    runtime.detailText = "permissive_blocked";
                    runtime.pendingTransitionIndex = -1;
                    runtime.pendingTransitionSinceMs = 0;
                }
                else
                {
                    bool transitioned = false;

                    if (state.timeoutMs > 0 && !state.timeoutToStateId.isEmpty() &&
                        (now - runtime.stateSinceMs) >= state.timeoutMs)
                    {
                        const int timeoutStateIndex = findStateIndex(definition, state.timeoutToStateId);
                        if (timeoutStateIndex >= 0)
                        {
                            transitioned = enterState(sequenceIndex, timeoutStateIndex, "timeout", state.id);
                        }
                    }

                    if (!transitioned)
                    {
                        bool pendingDelay = false;
                        runtime.waiting = false;
                        runtime.waitingReason = "";
                        runtime.statusText = "running";
                        runtime.detailText = "";

                        for (int transitionIndex = 0; transitionIndex < state.transitionCount; transitionIndex++)
                        {
                            const SequenceTransitionDefinition &transition = state.transitions[transitionIndex];
                            bool condition = gSignals.readBinary(transition.whenSignalId, false);
                            if (transition.invert)
                            {
                                condition = !condition;
                            }

                            if (!condition)
                            {
                                if (runtime.pendingTransitionIndex == transitionIndex)
                                {
                                    runtime.pendingTransitionIndex = -1;
                                    runtime.pendingTransitionSinceMs = 0;
                                }
                                continue;
                            }

                            const int targetStateIndex = findStateIndex(definition, transition.toStateId);
                            if (targetStateIndex < 0)
                            {
                                runtime.waiting = true;
                                runtime.statusText = "missing_transition_target";
                                runtime.waitingReason = transition.toStateId;
                                runtime.detailText = transition.id;
                                break;
                            }

                            if (transition.delayMs == 0)
                            {
                                transitioned = enterState(sequenceIndex, targetStateIndex, "transition", transition.id);
                                break;
                            }

                            if (runtime.pendingTransitionIndex != transitionIndex)
                            {
                                runtime.pendingTransitionIndex = transitionIndex;
                                runtime.pendingTransitionSinceMs = now;
                            }

                            if ((now - runtime.pendingTransitionSinceMs) >= transition.delayMs)
                            {
                                transitioned = enterState(sequenceIndex, targetStateIndex, "transition", transition.id);
                                break;
                            }

                            pendingDelay = true;
                            runtime.waiting = true;
                            runtime.statusText = "transition_delay";
                            runtime.waitingReason = transition.label.length() > 0 ? transition.label : transition.id;
                            runtime.detailText = transition.whenSignalId;
                            break;
                        }

                        if (!transitioned && !pendingDelay && state.transitionCount > 0)
                        {
                            runtime.waiting = true;
                            runtime.statusText = "waiting";
                            runtime.waitingReason = "await_transition";
                            runtime.detailText = state.id;
                        }
                    }
                }
            }
        }

        publishOwnedSignals(sequenceIndex);
    }
}

int SequenceManager::getCount() const
{
    return sequenceCount;
}

int SequenceManager::getRunningCount() const
{
    int count = 0;
    for (int i = 0; i < sequenceCount; i++)
    {
        if (runtimeStates[i].running)
        {
            count++;
        }
    }
    return count;
}

int SequenceManager::getFaultCount() const
{
    int count = 0;
    for (int i = 0; i < sequenceCount; i++)
    {
        if (runtimeStates[i].faulted)
        {
            count++;
        }
    }
    return count;
}

int SequenceManager::getDoneCount() const
{
    int count = 0;
    for (int i = 0; i < sequenceCount; i++)
    {
        if (runtimeStates[i].done)
        {
            count++;
        }
    }
    return count;
}

const SequenceDefinition *SequenceManager::getDefinitionAt(int index) const
{
    if (index < 0 || index >= sequenceCount) return nullptr;
    return &definitions[index];
}

const SequenceRuntimeState *SequenceManager::getStateAt(int index) const
{
    if (index < 0 || index >= sequenceCount) return nullptr;
    return &runtimeStates[index];
}

const SequenceStateDefinition *SequenceManager::getCurrentStateAt(int index) const
{
    if (index < 0 || index >= sequenceCount) return nullptr;
    const SequenceRuntimeState &runtime = runtimeStates[index];
    if (runtime.currentStateIndex < 0 || runtime.currentStateIndex >= definitions[index].stateCount)
    {
        return nullptr;
    }
    return &definitions[index].states[runtime.currentStateIndex];
}

const SequenceTransitionDefinition *SequenceManager::getPendingTransitionAt(int index) const
{
    if (index < 0 || index >= sequenceCount) return nullptr;
    const SequenceRuntimeState &runtime = runtimeStates[index];
    const SequenceDefinition &definition = definitions[index];
    if (runtime.currentStateIndex < 0 || runtime.currentStateIndex >= definition.stateCount)
    {
        return nullptr;
    }
    const SequenceStateDefinition &state = definition.states[runtime.currentStateIndex];
    if (runtime.pendingTransitionIndex < 0 || runtime.pendingTransitionIndex >= state.transitionCount)
    {
        return nullptr;
    }
    return &state.transitions[runtime.pendingTransitionIndex];
}

int SequenceManager::getRecentEventCount() const
{
    return recentEventCount;
}

const SequenceEventRecord *SequenceManager::getRecentEventAt(int index) const
{
    if (index < 0 || index >= recentEventCount || recentEventCapacity <= 0)
    {
        return nullptr;
    }
    const int realIndex = (recentEventStart + index) % recentEventCapacity;
    return &recentEvents[realIndex];
}

bool SequenceManager::resetSequence(const String &sequenceId)
{
    const int index = findSequenceIndex(sequenceId);
    if (index < 0)
    {
        return false;
    }

    const SequenceDefinition &definition = definitions[index];
    resetSequenceRuntime(index,
        definition.autoStart || definition.startSignalId.isEmpty(),
        "reset", "service_reset");
    publishOwnedSignals(index);
    return true;
}
