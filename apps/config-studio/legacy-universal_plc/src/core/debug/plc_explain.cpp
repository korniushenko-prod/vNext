#include "plc_explain.h"

namespace plc::debug {

void ExplainEngine::clear()
{
    lastBlocker_ = nullptr;
}

void ExplainEngine::setLastBlocker(const char *message)
{
    lastBlocker_ = message;
}

const char *ExplainEngine::lastBlocker() const
{
    return lastBlocker_;
}

}  // namespace plc::debug
