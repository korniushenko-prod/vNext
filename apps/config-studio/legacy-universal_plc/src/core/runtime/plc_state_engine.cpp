#include "plc_state_engine.h"

namespace plc::runtime_detail {

void StateEngine::begin()
{
    activeMachineCount_ = 0;
}

void StateEngine::tick()
{
}

size_t StateEngine::activeMachineCount() const
{
    return activeMachineCount_;
}

}  // namespace plc::runtime_detail
