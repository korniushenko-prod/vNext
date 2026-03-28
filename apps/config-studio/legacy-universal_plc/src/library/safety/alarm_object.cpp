#include "alarm_object.h"

namespace plc::library {

AlarmObject::AlarmObject(const AlarmObjectConfig &config)
    : config_(config)
{
}

AlarmObjectStatus AlarmObject::update(bool conditionIn, bool resetRequested, bool ackRequested)
{
    if (conditionIn)
    {
        status_.active = true;
        status_.latched = config_.latched;
        if (!config_.ackRequired)
        {
            status_.acknowledged = true;
        }
    }
    else if (!config_.latched)
    {
        status_.active = false;
    }

    if (ackRequested)
    {
        status_.acknowledged = true;
    }

    if (resetRequested && (!config_.ackRequired || status_.acknowledged))
    {
        status_.active = false;
        status_.latched = false;
    }

    return status_;
}

const AlarmObjectStatus &AlarmObject::status() const
{
    return status_;
}

}  // namespace plc::library
