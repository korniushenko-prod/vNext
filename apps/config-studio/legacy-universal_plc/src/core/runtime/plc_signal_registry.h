#pragma once

#include <stddef.h>

#include "../model/plc_types.h"

namespace plc::runtime_detail {

struct SignalSlot
{
    const char *id = nullptr;
    model::DataType dataType = model::DataType::Bool;
    bool valid = false;
};

class SignalRegistry
{
public:
    static constexpr size_t kMaxSignals = 64;

    void clear();
    bool registerSignal(const char *id, model::DataType dataType);
    size_t count() const;

private:
    SignalSlot slots_[kMaxSignals] = {};
    size_t count_ = 0;
};

}  // namespace plc::runtime_detail
