#include "config_schema.h"

ChannelType parseChannelType(const String &value)
{
    if (value == "di") return ChannelType::DI;
    if (value == "do") return ChannelType::DO;
    if (value == "ai") return ChannelType::AI;
    if (value == "ao") return ChannelType::AO;
    if (value == "counter") return ChannelType::Counter;
    if (value == "pwm") return ChannelType::PWM;
    return ChannelType::Unknown;
}

const char* channelTypeToString(ChannelType type)
{
    switch (type)
    {
        case ChannelType::DI: return "di";
        case ChannelType::DO: return "do";
        case ChannelType::AI: return "ai";
        case ChannelType::AO: return "ao";
        case ChannelType::Counter: return "counter";
        case ChannelType::PWM: return "pwm";
        default: return "unknown";
    }
}

bool channelTypeEquals(ChannelType type, const String &value)
{
    return value == channelTypeToString(type);
}

BusType parseBusType(const String &value)
{
    if (value == "i2c") return BusType::I2C;
    if (value == "uart") return BusType::UART;
    if (value == "rs485") return BusType::RS485;
    return BusType::Unknown;
}

const char* busTypeToString(BusType type)
{
    switch (type)
    {
        case BusType::I2C: return "i2c";
        case BusType::UART: return "uart";
        case BusType::RS485: return "rs485";
        default: return "unknown";
    }
}

PinPolicyClass parsePinPolicyClass(const String &value)
{
    if (value == "warning") return PinPolicyClass::Warning;
    if (value == "shared") return PinPolicyClass::Shared;
    if (value == "exclusive") return PinPolicyClass::Exclusive;
    if (value == "forbidden") return PinPolicyClass::Forbidden;
    return PinPolicyClass::Safe;
}

const char* pinPolicyClassToString(PinPolicyClass pinClass)
{
    switch (pinClass)
    {
        case PinPolicyClass::Warning: return "warning";
        case PinPolicyClass::Shared: return "shared";
        case PinPolicyClass::Exclusive: return "exclusive";
        case PinPolicyClass::Forbidden: return "forbidden";
        default: return "safe";
    }
}

BlockType parseBlockType(const String &value)
{
    if (value == "timer") return BlockType::Timer;
    if (value == "selector") return BlockType::Selector;
    if (value == "button") return BlockType::Button;
    if (value == "latch") return BlockType::Latch;
    if (value == "comparator") return BlockType::Comparator;
    if (value == "scale_map") return BlockType::ScaleMap;
    if (value == "logic_gate") return BlockType::LogicGate;
    if (value == "edge_detect") return BlockType::EdgeDetect;
    if (value == "counter") return BlockType::Counter;
    if (value == "totalizer") return BlockType::Totalizer;
    if (value == "rate_estimator") return BlockType::RateEstimator;
    if (value == "window_aggregator") return BlockType::WindowAggregator;
    if (value == "signal_extractor") return BlockType::SignalExtractor;
    if (value == "hysteresis") return BlockType::Hysteresis;
    if (value == "interlock") return BlockType::Interlock;
    if (value == "mode_authority") return BlockType::ModeAuthority;
    if (value == "freshness") return BlockType::Freshness;
    return BlockType::Unknown;
}

const char* blockTypeToString(BlockType type)
{
    switch (type)
    {
        case BlockType::Timer: return "timer";
        case BlockType::Selector: return "selector";
        case BlockType::Button: return "button";
        case BlockType::Latch: return "latch";
        case BlockType::Comparator: return "comparator";
        case BlockType::ScaleMap: return "scale_map";
        case BlockType::LogicGate: return "logic_gate";
        case BlockType::EdgeDetect: return "edge_detect";
        case BlockType::Counter: return "counter";
        case BlockType::Totalizer: return "totalizer";
        case BlockType::RateEstimator: return "rate_estimator";
        case BlockType::WindowAggregator: return "window_aggregator";
        case BlockType::SignalExtractor: return "signal_extractor";
        case BlockType::Hysteresis: return "hysteresis";
        case BlockType::Interlock: return "interlock";
        case BlockType::ModeAuthority: return "mode_authority";
        case BlockType::Freshness: return "freshness";
        default: return "unknown";
    }
}

DisplayWidgetType parseDisplayWidgetType(const String &value)
{
    if (value == "label") return DisplayWidgetType::Label;
    if (value == "value") return DisplayWidgetType::Value;
    if (value == "status") return DisplayWidgetType::Status;
    if (value == "pair") return DisplayWidgetType::Pair;
    if (value == "timer") return DisplayWidgetType::Timer;
    if (value == "bar") return DisplayWidgetType::Bar;
    if (value == "spacer") return DisplayWidgetType::Spacer;
    return DisplayWidgetType::Unknown;
}

const char* displayWidgetTypeToString(DisplayWidgetType type)
{
    switch (type)
    {
        case DisplayWidgetType::Label: return "label";
        case DisplayWidgetType::Value: return "value";
        case DisplayWidgetType::Status: return "status";
        case DisplayWidgetType::Pair: return "pair";
        case DisplayWidgetType::Timer: return "timer";
        case DisplayWidgetType::Bar: return "bar";
        case DisplayWidgetType::Spacer: return "spacer";
        default: return "unknown";
    }
}
