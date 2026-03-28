#include "plc_signal_registry.h"

namespace plc::runtime_detail {

void SignalRegistry::clear()
{
    count_ = 0;
    for (SignalSlot &slot : slots_)
    {
        slot = {};
    }
}

bool SignalRegistry::registerSignal(const char *id, model::DataType dataType)
{
    if (id == nullptr || count_ >= kMaxSignals)
    {
        return false;
    }

    slots_[count_].id = id;
    slots_[count_].dataType = dataType;
    slots_[count_].valid = true;
    count_++;
    return true;
}

size_t SignalRegistry::count() const
{
    return count_;
}

}  // namespace plc::runtime_detail
