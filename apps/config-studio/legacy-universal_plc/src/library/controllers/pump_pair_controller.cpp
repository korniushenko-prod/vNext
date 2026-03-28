#include "pump_pair_controller.h"

namespace plc::library {

PumpPairOutputs PumpPairController::update(const PumpPairInputs &inputs)
{
    PumpPairOutputs out;
    out.ready = inputs.permitStart && !inputs.tripAny;

    if (inputs.requestReset)
    {
        state_ = PumpPairState::Idle;
    }

    if (inputs.tripAny)
    {
        state_ = PumpPairState::FaultLocked;
    }
    else if (!inputs.demandMain || !inputs.permitRun)
    {
        state_ = PumpPairState::Idle;
    }
    else if (inputs.requestForceBoth)
    {
        state_ = PumpPairState::RunBoth;
    }
    else if (inputs.selectorPrimaryIsDevice1)
    {
        state_ = inputs.feedbackPrimaryOk ? PumpPairState::RunPrimary :
            (inputs.feedbackStandbyOk ? PumpPairState::RunStandby : PumpPairState::FaultLocked);
    }
    else
    {
        state_ = inputs.feedbackStandbyOk ? PumpPairState::RunStandby :
            (inputs.feedbackPrimaryOk ? PumpPairState::RunPrimary : PumpPairState::FaultLocked);
    }

    out.state = state_;
    out.fault = (state_ == PumpPairState::FaultLocked);
    out.noAvailableDevice = out.fault;
    out.commandPrimaryDevice = (state_ == PumpPairState::RunPrimary || state_ == PumpPairState::RunBoth);
    out.commandStandbyDevice = (state_ == PumpPairState::RunStandby || state_ == PumpPairState::RunBoth);
    out.running = out.commandPrimaryDevice || out.commandStandbyDevice;
    return out;
}

}  // namespace plc::library
