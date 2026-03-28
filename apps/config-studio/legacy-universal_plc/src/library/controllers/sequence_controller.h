#pragma once

#include <stdint.h>

namespace plc::library {

enum class SequenceState : uint8_t
{
    Idle,
    Starting,
    Running,
    Complete,
    FaultLocked
};

struct SequenceInputs
{
    bool requestStart = false;
    bool requestStop = false;
    bool requestReset = false;
    bool demandMain = false;
    bool permitStart = true;
    bool permitRun = true;
    bool tripAny = false;
};

struct SequenceOutputs
{
    bool ready = false;
    bool running = false;
    bool complete = false;
    bool fault = false;
    SequenceState state = SequenceState::Idle;
};

class SequenceController
{
public:
    SequenceOutputs update(const SequenceInputs &inputs);

private:
    SequenceState state_ = SequenceState::Idle;
};

}  // namespace plc::library
