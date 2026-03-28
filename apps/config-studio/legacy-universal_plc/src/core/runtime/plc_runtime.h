#pragma once

#include <stddef.h>
#include <stdint.h>

#include "../compiler/plc_compiler.h"
#include "../debug/plc_explain.h"
#include "../hal/plc_hal.h"
#include "../storage/plc_project_store.h"
#include "plc_alarm_engine.h"
#include "plc_flow_engine.h"
#include "plc_signal_registry.h"
#include "plc_state_engine.h"

namespace plc {

struct RuntimeSnapshot
{
    uint32_t cycleCount = 0;
    uint32_t lastUpdateMs = 0;
    bool healthy = true;
    size_t registeredSignals = 0;
    size_t activeAlarms = 0;
    size_t activeStateMachines = 0;
    size_t activeFlows = 0;
};

class Runtime
{
public:
    void begin(uint32_t nowMs = 0);
    void update(uint32_t nowMs);

    const RuntimeSnapshot &snapshot() const;

private:
    void bootstrapCoreModel();

    RuntimeSnapshot snapshot_ = {};
    runtime_detail::SignalRegistry signalRegistry_ = {};
    runtime_detail::AlarmEngine alarmEngine_ = {};
    runtime_detail::StateEngine stateEngine_ = {};
    runtime_detail::FlowEngine flowEngine_ = {};
    compiler::Compiler compiler_ = {};
    hal::Hal hal_ = {};
    debug::ExplainEngine explain_ = {};
    storage::ProjectStore projectStore_ = {};
    bool started_ = false;
};

Runtime &runtime();

}  // namespace plc
