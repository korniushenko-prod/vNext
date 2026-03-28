#include "plc_flow_engine.h"

namespace plc::runtime_detail {

void FlowEngine::begin()
{
    activeFlowCount_ = 0;
}

void FlowEngine::tick()
{
}

size_t FlowEngine::activeFlowCount() const
{
    return activeFlowCount_;
}

}  // namespace plc::runtime_detail
