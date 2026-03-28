#pragma once

#include <stdint.h>

namespace plc::library {

enum class PumpPairState : uint8_t
{
    Idle,
    RunPrimary,
    RunStandby,
    RunBoth,
    FaultLocked
};

struct PumpPairInputs
{
    bool demandMain = false;
    bool permitStart = true;
    bool permitRun = true;
    bool tripAny = false;
    bool requestForceBoth = false;
    bool feedbackPrimaryOk = false;
    bool feedbackStandbyOk = false;
    bool selectorPrimaryIsDevice1 = true;
    bool requestReset = false;
};

struct PumpPairOutputs
{
    bool commandPrimaryDevice = false;
    bool commandStandbyDevice = false;
    bool ready = false;
    bool running = false;
    bool fault = false;
    bool noAvailableDevice = false;
    PumpPairState state = PumpPairState::Idle;
};

class PumpPairController
{
public:
    PumpPairOutputs update(const PumpPairInputs &inputs);

private:
    PumpPairState state_ = PumpPairState::Idle;
};

}  // namespace plc::library
