#include "plc_alarm_engine.h"

namespace plc::runtime_detail {

void AlarmEngine::begin()
{
    activeCount_ = 0;
}

void AlarmEngine::tick()
{
}

size_t AlarmEngine::activeCount() const
{
    return activeCount_;
}

}  // namespace plc::runtime_detail
