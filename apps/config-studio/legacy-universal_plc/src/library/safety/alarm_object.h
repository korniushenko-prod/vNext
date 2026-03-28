#pragma once

#include "../../core/model/plc_types.h"

namespace plc::library {

struct AlarmObjectConfig
{
    model::AlarmSeverity severity = model::AlarmSeverity::Alarm;
    bool latched = true;
    bool ackRequired = false;
};

struct AlarmObjectStatus
{
    bool active = false;
    bool latched = false;
    bool acknowledged = false;
};

class AlarmObject
{
public:
    explicit AlarmObject(const AlarmObjectConfig &config = {});

    AlarmObjectStatus update(bool conditionIn, bool resetRequested, bool ackRequested);
    const AlarmObjectStatus &status() const;

private:
    AlarmObjectConfig config_ = {};
    AlarmObjectStatus status_ = {};
};

}  // namespace plc::library
