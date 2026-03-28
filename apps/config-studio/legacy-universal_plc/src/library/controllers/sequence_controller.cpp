#include "sequence_controller.h"

namespace plc::library {

SequenceOutputs SequenceController::update(const SequenceInputs &inputs)
{
    if (inputs.requestReset)
    {
        state_ = SequenceState::Idle;
    }

    if (inputs.tripAny)
    {
        state_ = SequenceState::FaultLocked;
    }
    else if (inputs.requestStop || !inputs.demandMain || !inputs.permitRun)
    {
        state_ = SequenceState::Idle;
    }
    else if (inputs.requestStart && inputs.permitStart)
    {
        state_ = SequenceState::Starting;
    }

    if (state_ == SequenceState::Starting)
    {
        state_ = SequenceState::Running;
    }

    SequenceOutputs out;
    out.ready = inputs.permitStart && !inputs.tripAny;
    out.running = (state_ == SequenceState::Running);
    out.complete = (state_ == SequenceState::Complete);
    out.fault = (state_ == SequenceState::FaultLocked);
    out.state = state_;
    return out;
}

}  // namespace plc::library
