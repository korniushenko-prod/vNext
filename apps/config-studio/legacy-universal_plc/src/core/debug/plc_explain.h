#pragma once

namespace plc::debug {

class ExplainEngine
{
public:
    void clear();
    void setLastBlocker(const char *message);
    const char *lastBlocker() const;

private:
    const char *lastBlocker_ = nullptr;
};

}  // namespace plc::debug
