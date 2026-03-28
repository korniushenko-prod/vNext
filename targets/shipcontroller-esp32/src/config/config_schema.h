#pragma once

#include <Arduino.h>

constexpr int MAX_BOARDS = 5;
constexpr int MAX_RESOURCES = 16;
constexpr int MAX_RESERVED_PINS = 8;
constexpr int MAX_RESOURCE_CAPABILITIES = 6;
constexpr int MAX_CHANNELS = 16;
constexpr int MAX_SIGNAL_DEFINITIONS = 16;
constexpr int MAX_TIMER_BLOCKS = 16;
constexpr int MAX_BLOCKS = 24;
constexpr int MAX_DISPLAY_SCREENS = 6;
constexpr int MAX_DISPLAY_WIDGETS = 16;
constexpr int MAX_PINS = 40;
constexpr int MAX_HARDWARE_PINS = 32;
constexpr int MAX_CHIP_TEMPLATES = 8;
constexpr int MAX_BOARD_TEMPLATES = 8;
constexpr int MAX_TEMPLATE_RULES = 16;
constexpr int MAX_TEMPLATE_RULE_PINS = 8;
constexpr int MAX_COMMS_BUSES = 8;
constexpr int MAX_COMMS_DEVICES = 16;
constexpr int MAX_EXTERNAL_RESOURCES = 32;

enum class ChannelType {
    Unknown = 0,
    DI,
    DO,
    AI,
    AO,
    Counter,
    PWM
};

enum class PinPolicyClass {
    Safe = 0,
    Warning,
    Shared,
    Exclusive,
    Forbidden
};

enum class BlockType {
    Unknown = 0,
    Timer,
    Selector,
    Button,
    Latch,
    Comparator,
    ScaleMap,
    LogicGate,
    EdgeDetect,
    Counter,
    Totalizer,
    RateEstimator,
    WindowAggregator,
    SignalExtractor,
    Hysteresis,
    Interlock,
    ModeAuthority,
    Freshness
};

enum class BusType {
    Unknown = 0,
    I2C,
    UART,
    RS485
};

enum class DisplayWidgetType {
    Unknown = 0,
    Label,
    Value,
    Status,
    Pair,
    Timer,
    Bar,
    Spacer
};

struct WiFiConfig {
    String mode;
    String ssid;
    String password;
    String apSsid;
    String apPassword;
    String startupPolicy;
};

struct I2CConfig {
    bool scan;
};

struct OledConfig {
    bool enabled;
    bool showIpOnFallback;
    int width;
    int height;
    int sda;
    int scl;
    int address;
};

struct LoRaConfig {
    bool enabled;
    int sck;
    int miso;
    int mosi;
    int cs;
    int rst;
    int dio0;
    int dio1;
    int dio2;
};

struct SdConfig {
    bool enabled;
    int cs;
    int mosi;
    int miso;
    int sck;
};

struct LedConfig {
    bool enabled;
    int pin;
};

struct BatterySenseConfig {
    bool enabled;
    int adcPin;
};

struct BusConfig {
    String id;
    String label;
    BusType type;
    bool enabled;
    int sda;
    int scl;
    uint32_t speed;
    bool scan;
    int tx;
    int rx;
    uint32_t baud;
    String parity;
    int stopBits;
    int dePin;
};

struct DeviceConfig {
    String id;
    String label;
    String driver;
    String busId;
    bool enabled;
    int address;
    uint32_t pollMs;
    uint32_t timeoutMs;
    int retryCount;
};

struct ExternalResourceConfig {
    String id;
    String label;
    String deviceId;
    String kind;
    ChannelType capability;
    int sourceIndex;
    String units;
};

struct DisplayFormatConfig {
    String units;
    int precision;
    String durationStyle;
    String trueText;
    String falseText;
    String prefix;
    String suffix;
    String emptyText;
};

struct DisplayStyleConfig {
    String font;
    String align;
    bool invert;
    bool emphasis;
    bool frame;
    String colorRole;
};

struct DisplayWidgetConfig {
    String id;
    DisplayWidgetType type;
    int x;
    int y;
    int w;
    int h;
    String label;
    String signalId;
    String visibleIfSignalId;
    DisplayFormatConfig format;
    DisplayStyleConfig style;
};

struct DisplayScreenConfig {
    String id;
    String label;
    String group;
    String visibleIfSignalId;
    uint32_t refreshMs;
    uint32_t autoCycleMs;
    DisplayWidgetConfig *widgets;
    uint8_t widgetCount;
};

struct DisplayConfig {
    bool enabled;
    String driver;
    int width;
    int height;
    int rotation;
    String startupScreenId;
    String defaultLanguage;
    DisplayScreenConfig *screens;
    uint8_t screenCount;
};

struct ReservedPinConfig {
    String name;
    int gpio;
};

struct BoardResourceConfig {
    String id;
    String label;
    int gpio;
    ChannelType capabilities[MAX_RESOURCE_CAPABILITIES];
    uint8_t capabilityCount;
};

struct BoardConfig {
    String name;
    String chip;
    String templateId;
    BoardResourceConfig resources[MAX_RESOURCES];
    uint8_t resourceCount;
    ReservedPinConfig reserved[MAX_RESERVED_PINS];
    uint8_t reservedCount;
};

struct SystemSection {
    String active_board;
    String active_board_template;
    String active_chip_template;
};

struct ChipTemplatePinConfig {
    int gpio;
    ChannelType capabilities[MAX_RESOURCE_CAPABILITIES];
    uint8_t capabilityCount;
    bool internalPullup;
    bool inputOnly;
    bool strapping;
    bool forbidden;
    String note;
};

struct ChipTemplateConfig {
    String id;
    String label;
    ChipTemplatePinConfig pins[MAX_HARDWARE_PINS];
    uint8_t pinCount;
};

struct BoardTemplateRuleConfig {
    String id;
    String featureKey;
    PinPolicyClass pinClass;
    String owner;
    String reason;
    bool alwaysOn;
    int pins[MAX_TEMPLATE_RULE_PINS];
    uint8_t pinCount;
};

struct BoardTemplateConfig {
    String id;
    String label;
    String chipTemplateId;
    BoardTemplateRuleConfig rules[MAX_TEMPLATE_RULES];
    uint8_t ruleCount;
};

struct ChannelConfig {
    String id;
    String resourceId;
    ChannelType type;
    bool inverted;
    bool initial;
    bool pullup;
};

struct SignalConfig {
    String id;
    String label;
    String type;
    String sourceSignalId;
    String substituteSignalId;
    String enableSignalId;
    String units;
};

struct BlockConfig {
    String id;
    BlockType type;
    String mode;
    String inputA;
    String inputB;
    String inputC;
    String controlSignal;
    String outputA;
    uint32_t periodMs;
    uint32_t durationMs;
    uint32_t debounceMs;
    uint32_t longPressMs;
    uint32_t doublePressMs;
    float compareValueA;
    float compareValueB;
    float extraValueC;
    float extraValueD;
    bool retrigger;
    bool retain;
    bool resetPriority;
    bool startImmediately;
};

struct BlocksConfig {
    BlockConfig items[MAX_BLOCKS];
    uint8_t blockCount;
};

struct SystemConfig {
    uint16_t configVersion;
    WiFiConfig wifi;
    I2CConfig i2c;
    OledConfig oled;
    LoRaConfig lora;
    SdConfig sd;
    LedConfig led;
    BatterySenseConfig battery;
    DisplayConfig display;
    SystemSection system;
    ChipTemplateConfig chipTemplates[MAX_CHIP_TEMPLATES];
    uint8_t chipTemplateCount;
    BoardTemplateConfig boardTemplates[MAX_BOARD_TEMPLATES];
    uint8_t boardTemplateCount;
    BoardConfig boards[MAX_BOARDS];
    uint8_t boardCount;
    BusConfig *buses;
    uint8_t busCount;
    DeviceConfig *devices;
    uint8_t deviceCount;
    ExternalResourceConfig *externalResources;
    uint8_t externalResourceCount;
    ChannelConfig channels[MAX_CHANNELS];
    uint8_t channelCount;
    SignalConfig signals[MAX_SIGNAL_DEFINITIONS];
    uint8_t signalCount;
    BlocksConfig blocks;
};

ChannelType parseChannelType(const String &value);
const char* channelTypeToString(ChannelType type);
bool channelTypeEquals(ChannelType type, const String &value);
BusType parseBusType(const String &value);
const char* busTypeToString(BusType type);
PinPolicyClass parsePinPolicyClass(const String &value);
const char* pinPolicyClassToString(PinPolicyClass pinClass);
BlockType parseBlockType(const String &value);
const char* blockTypeToString(BlockType type);
DisplayWidgetType parseDisplayWidgetType(const String &value);
const char* displayWidgetTypeToString(DisplayWidgetType type);
