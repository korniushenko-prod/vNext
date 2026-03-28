#pragma once

#include <stddef.h>
#include <stdint.h>

#include "plc_types.h"

namespace plc::model {

struct PortModel
{
    const char *id = nullptr;
    const char *name = nullptr;
    const char *direction = nullptr;
    SignalKind signalKind = SignalKind::Status;
    DataType dataType = DataType::Bool;
    bool required = false;
    bool multiple = false;
    const char *description = nullptr;
};

struct BindingModel
{
    const char *id = nullptr;
    const char *signalId = nullptr;
    const char *moduleId = nullptr;
    const char *channelId = nullptr;
    const char *ioType = nullptr;
};

struct SignalModel
{
    const char *id = nullptr;
    const char *name = nullptr;
    SignalKind kind = SignalKind::Derived;
    DataType dataType = DataType::Bool;
    const char *sourceObjectId = nullptr;
    const char *sourcePort = nullptr;
};

struct LinkModel
{
    const char *id = nullptr;
    const char *sourceObjectId = nullptr;
    const char *sourcePort = nullptr;
    const char *targetObjectId = nullptr;
    const char *targetPort = nullptr;
    const char *kind = nullptr;
    const char *semantic = nullptr;
};

struct GroupModel
{
    const char *id = nullptr;
    const char *type = nullptr;
    GroupLogic logic = GroupLogic::AllTrue;
};

struct AlarmModel
{
    const char *id = nullptr;
    const char *name = nullptr;
    AlarmSeverity severity = AlarmSeverity::Alarm;
    bool latched = false;
    const char *conditionSignalId = nullptr;
};

struct TransitionModel
{
    const char *id = nullptr;
    const char *fromState = nullptr;
    const char *toState = nullptr;
    const char *triggerType = nullptr;
    const char *triggerRef = nullptr;
    const char *guardExpr = nullptr;
    int priority = 0;
};

struct StateModel
{
    const char *id = nullptr;
    const char *name = nullptr;
    uint32_t timeoutMs = 0;
    const char *localFlowId = nullptr;
};

struct StateMachineModel
{
    const char *id = nullptr;
    const char *name = nullptr;
    const char *initialState = nullptr;
};

struct FlowModel
{
    const char *id = nullptr;
    const char *name = nullptr;
};

struct ViewModel
{
    const char *id = nullptr;
    const char *type = nullptr;
    const char *name = nullptr;
    const char *scope = nullptr;
};

struct ObjectModel
{
    const char *id = nullptr;
    const char *type = nullptr;
    ObjectCategory category = ObjectCategory::Controller;
    const char *name = nullptr;
    const char *templateId = nullptr;
    const PortModel *inputs = nullptr;
    size_t inputCount = 0;
    const PortModel *outputs = nullptr;
    size_t outputCount = 0;
    const BindingModel *bindings = nullptr;
    size_t bindingCount = 0;
};

struct SystemModel
{
    const char *id = nullptr;
    const char *name = nullptr;
    const ObjectModel *objects = nullptr;
    size_t objectCount = 0;
    const SignalModel *signals = nullptr;
    size_t signalCount = 0;
    const LinkModel *links = nullptr;
    size_t linkCount = 0;
};

struct ProjectMeta
{
    const char *id = nullptr;
    const char *name = nullptr;
    const char *description = nullptr;
    const char *author = nullptr;
    const char *createdAt = nullptr;
    const char *updatedAt = nullptr;
};

struct ProjectSettings
{
    uint32_t tickMs = 100;
    const char *timezone = "UTC";
    const char *defaultView = nullptr;
    bool autosave = true;
    bool simulationEnabled = true;
    bool debugEnabled = true;
};

struct ProjectModel
{
    ProjectMeta meta = {};
    ProjectSettings settings = {};
    SystemModel system = {};
};

}  // namespace plc::model
