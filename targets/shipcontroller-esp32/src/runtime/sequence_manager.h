#pragma once

#include <Arduino.h>

struct SequenceTransitionDefinition {
    String id;
    String label;
    String toStateId;
    String whenSignalId;
    uint32_t delayMs;
    bool invert;
};

struct SequenceStateDefinition {
    String id;
    String label;
    String permissiveSignalId;
    uint32_t timeoutMs;
    String timeoutToStateId;
    String *actionsOn;
    int actionsOnCount;
    String *actionsOff;
    int actionsOffCount;
    SequenceTransitionDefinition *transitions;
    int transitionCount;
};

struct SequenceDefinition {
    String id;
    String label;
    String enableSignalId;
    String startSignalId;
    String tripSignalId;
    String resetSignalId;
    String initialStateId;
    String faultStateId;
    String doneStateId;
    bool autoStart;
    SequenceStateDefinition *states;
    int stateCount;
};

struct SequenceRuntimeState {
    bool enabled;
    bool running;
    bool waiting;
    bool done;
    bool faulted;
    int currentStateIndex;
    int pendingTransitionIndex;
    uint32_t stateSinceMs;
    uint32_t pendingTransitionSinceMs;
    uint32_t lastChangeMs;
    String statusText;
    String waitingReason;
    String detailText;
    String faultReason;
    int enabledSignalIndex;
    int runningSignalIndex;
    int readySignalIndex;
    int doneSignalIndex;
    int faultSignalIndex;
    int waitingSignalIndex;
    int currentStateIndexSignalIndex;
    int timeInStateSignalIndex;
    int *stateSignalIndexes;
};

struct SequenceEventRecord {
    uint32_t timestampMs;
    String sequenceId;
    String type;
    String fromStateId;
    String toStateId;
    String text;
};

class SequenceManager {
public:
    SequenceManager();

    void reset();
    bool configureFromConfig(String &errorMessage);
    void update();

    int getCount() const;
    int getRunningCount() const;
    int getFaultCount() const;
    int getDoneCount() const;
    const SequenceDefinition *getDefinitionAt(int index) const;
    const SequenceRuntimeState *getStateAt(int index) const;
    const SequenceStateDefinition *getCurrentStateAt(int index) const;
    const SequenceTransitionDefinition *getPendingTransitionAt(int index) const;

    int getRecentEventCount() const;
    const SequenceEventRecord *getRecentEventAt(int index) const;

    bool resetSequence(const String &sequenceId);

private:
    void freeDefinitions();
    void pushEvent(const String &sequenceId, const String &type,
        const String &fromStateId, const String &toStateId, const String &text);
    int findSequenceIndex(const String &sequenceId) const;
    int findStateIndex(const SequenceDefinition &definition, const String &stateId) const;
    bool publishOwnedSignals(int index);
    bool applyStateActions(int index);
    bool enterState(int index, int targetStateIndex, const String &eventType, const String &reasonText);
    void clearRuntimeState(int index, const String &statusText);
    void resetSequenceRuntime(int index, bool restartIfPossible, const String &eventType, const String &reasonText);

    SequenceDefinition *definitions;
    SequenceRuntimeState *runtimeStates;
    int sequenceCount;

    SequenceEventRecord *recentEvents;
    int recentEventCapacity;
    int recentEventCount;
    int recentEventStart;
};

extern SequenceManager gSequences;
