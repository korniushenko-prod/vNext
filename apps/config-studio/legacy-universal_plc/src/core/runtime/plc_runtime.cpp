#include "plc_runtime.h"

#include "../model/plc_types.h"

namespace plc {

Runtime &runtime()
{
    static Runtime instance;
    return instance;
}

void Runtime::bootstrapCoreModel()
{
    signalRegistry_.clear();
    signalRegistry_.registerSignal("system.healthy", model::DataType::Bool);
    signalRegistry_.registerSignal("system.running", model::DataType::Bool);
    signalRegistry_.registerSignal("system.fault", model::DataType::Bool);
    signalRegistry_.registerSignal("runtime.cycle_count", model::DataType::Int);
}

void Runtime::begin(uint32_t nowMs)
{
    snapshot_ = {};
    snapshot_.lastUpdateMs = nowMs;

    hal_.begin();
    alarmEngine_.begin();
    stateEngine_.begin();
    flowEngine_.begin();
    explain_.clear();

    bootstrapCoreModel();
    const compiler::CompileReport report = compiler_.compileBootstrapProject(0, signalRegistry_.count(), 0);
    snapshot_.healthy = report.ok && projectStore_.validateSchemaVersion(storage::kProjectSchemaVersion);
    snapshot_.registeredSignals = signalRegistry_.count();
    snapshot_.activeAlarms = alarmEngine_.activeCount();
    snapshot_.activeStateMachines = stateEngine_.activeMachineCount();
    snapshot_.activeFlows = flowEngine_.activeFlowCount();

    started_ = true;
}

void Runtime::update(uint32_t nowMs)
{
    if (!started_)
    {
        begin(nowMs);
    }

    hal_.tick();
    alarmEngine_.tick();
    stateEngine_.tick();
    flowEngine_.tick();

    snapshot_.cycleCount++;
    snapshot_.lastUpdateMs = nowMs;
    snapshot_.registeredSignals = signalRegistry_.count();
    snapshot_.activeAlarms = alarmEngine_.activeCount();
    snapshot_.activeStateMachines = stateEngine_.activeMachineCount();
    snapshot_.activeFlows = flowEngine_.activeFlowCount();
}

const RuntimeSnapshot &Runtime::snapshot() const
{
    return snapshot_;
}

}  // namespace plc
