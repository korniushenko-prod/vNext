#pragma once

#include <Arduino.h>

enum class SignalClass {
    Binary = 0,
    Analog,
    Counter,
    Enum,
    Text
};

enum class SignalDirection {
    Input = 0,
    Output,
    Internal,
    Command,
    Status
};

enum class SignalSourceType {
    LocalDI = 0,
    LocalDOFeedback,
    LocalAI,
    LocalAOFeedback,
    Counter,
    Frequency,
    ModbusRegister,
    SerialParser,
    CanValue,
    ExternalADC,
    ExternalDAC,
    Virtual,
    Manual,
    Substituted,
    BlockOutput
};

enum class SignalQuality {
    Uninitialized = 0,
    Good,
    Stale,
    Substituted,
    Fault,
    OutOfRange
};

enum class SignalMode {
    Auto = 0,
    Manual,
    Local,
    Remote,
    Service
};

const char* signalClassToString(SignalClass value);
const char* signalDirectionToString(SignalDirection value);
const char* signalSourceTypeToString(SignalSourceType value);
const char* signalQualityToString(SignalQuality value);
const char* signalModeToString(SignalMode value);
