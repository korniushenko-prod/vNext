#pragma once

#include <stdint.h>

namespace plc::model {

enum class DataType : uint8_t
{
    Bool,
    Float,
    Int,
    Enum,
    Event
};

enum class SignalKind : uint8_t
{
    Request,
    Command,
    Demand,
    Permissive,
    Trip,
    Alarm,
    Feedback,
    Status,
    State,
    Config,
    Derived
};

enum class ObjectCategory : uint8_t
{
    Controller,
    Group,
    Safety,
    Utility,
    Package,
    Hardware,
    View
};

enum class AlarmSeverity : uint8_t
{
    Info,
    Warning,
    Alarm,
    Trip
};

enum class GroupLogic : uint8_t
{
    AllTrue,
    AnyTrue,
    NOfM,
    CustomExpr
};

}  // namespace plc::model
