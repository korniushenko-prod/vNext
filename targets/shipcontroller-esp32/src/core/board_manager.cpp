#include "board_manager.h"

#include "../templates/chip_template.h"

static const int STRAPPING_PINS[] = {0, 2, 5, 12, 15};

const BoardConfig* getActiveBoard()
{
    for (int i = 0; i < gConfig.boardCount; i++)
    {
        if (gConfig.boards[i].name == gConfig.system.active_board)
        {
            return &gConfig.boards[i];
        }
    }

    return nullptr;
}

const ChipTemplateConfig* getActiveChipTemplateConfig()
{
    String activeId = gConfig.system.active_chip_template;
    if (activeId.isEmpty())
    {
        const BoardConfig *board = getActiveBoard();
        if (board && !board->templateId.isEmpty())
        {
            for (int i = 0; i < gConfig.boardTemplateCount; i++)
            {
                if (gConfig.boardTemplates[i].id == board->templateId)
                {
                    activeId = gConfig.boardTemplates[i].chipTemplateId;
                    break;
                }
            }
        }
    }

    for (int i = 0; i < gConfig.chipTemplateCount; i++)
    {
        if (gConfig.chipTemplates[i].id == activeId)
        {
            return &gConfig.chipTemplates[i];
        }
    }

    return nullptr;
}

const BoardTemplateConfig* getActiveBoardTemplateConfig()
{
    String activeId = gConfig.system.active_board_template;
    if (activeId.isEmpty())
    {
        const BoardConfig *board = getActiveBoard();
        if (board) activeId = board->templateId;
    }

    for (int i = 0; i < gConfig.boardTemplateCount; i++)
    {
        if (gConfig.boardTemplates[i].id == activeId)
        {
            return &gConfig.boardTemplates[i];
        }
    }

    return nullptr;
}

const BoardResourceConfig* findBoardResource(const BoardConfig &board, const String &resourceId)
{
    for (int i = 0; i < board.resourceCount; i++)
    {
        if (board.resources[i].id == resourceId)
        {
            return &board.resources[i];
        }
    }

    return nullptr;
}

bool resourceSupportsType(const BoardResourceConfig &resource, ChannelType type)
{
    for (int i = 0; i < resource.capabilityCount; i++)
    {
        if (resource.capabilities[i] == type)
        {
            return true;
        }
    }

    return false;
}

static bool isReservedGpio(const BoardConfig &board, int gpio)
{
    for (int i = 0; i < board.reservedCount; i++)
    {
        if (board.reserved[i].gpio == gpio)
        {
            return true;
        }
    }

    return false;
}

static bool chipPinSupportsResource(const ChipPinTemplate &chipPin, const BoardResourceConfig &resource)
{
    for (int i = 0; i < resource.capabilityCount; i++)
    {
        bool supported = false;

        for (int j = 0; j < chipPin.capabilityCount; j++)
        {
            if (chipPin.capabilities[j] == resource.capabilities[i])
            {
                supported = true;
                break;
            }
        }

        if (!supported)
        {
            return false;
        }
    }

    return true;
}

static const ChipTemplatePinConfig* findChipTemplateConfigPin(const ChipTemplateConfig &chipTemplate, int gpio)
{
    for (int i = 0; i < chipTemplate.pinCount; i++)
    {
        if (chipTemplate.pins[i].gpio == gpio)
        {
            return &chipTemplate.pins[i];
        }
    }

    return nullptr;
}

static bool chipTemplateConfigSupportsResource(const ChipTemplatePinConfig &chipPin, const BoardResourceConfig &resource)
{
    if (chipPin.forbidden) return false;

    for (int i = 0; i < resource.capabilityCount; i++)
    {
        bool supported = false;

        for (int j = 0; j < chipPin.capabilityCount; j++)
        {
            if (chipPin.capabilities[j] == resource.capabilities[i])
            {
                supported = true;
                break;
            }
        }

        if (!supported)
        {
            return false;
        }
    }

    return true;
}

static bool isStrappingPin(int gpio)
{
    for (unsigned int i = 0; i < sizeof(STRAPPING_PINS) / sizeof(int); i++)
    {
        if (STRAPPING_PINS[i] == gpio)
        {
            return true;
        }
    }

    return false;
}

static bool isInputOnlyPin(int gpio)
{
    return gpio == 34 || gpio == 35 || gpio == 36 || gpio == 39;
}

static void applyPinClass(HardwarePinInfo &info, PinPolicyClass pinClass, bool availableForChannel, const String &owner, const String &reason)
{
    if (static_cast<int>(pinClass) > static_cast<int>(info.pinClass))
    {
        info.pinClass = pinClass;
        info.availableForChannel = availableForChannel;
        info.owner = owner;
        info.reason = reason;
    }
}

static bool isFeatureEnabled(const String &featureKey)
{
    if (featureKey == "oled") return gConfig.oled.enabled;
    if (featureKey == "lora") return gConfig.lora.enabled;
    if (featureKey == "sd") return gConfig.sd.enabled;
    if (featureKey == "led") return gConfig.led.enabled;
    if (featureKey == "battery") return gConfig.battery.enabled;
    if (featureKey == "usb_uart") return true;
    if (featureKey == "boot") return true;
    return false;
}

static void applyBoardTemplateRules(const BoardTemplateConfig &boardTemplate, HardwarePinInfo &info)
{
    for (int i = 0; i < boardTemplate.ruleCount; i++)
    {
        const BoardTemplateRuleConfig &rule = boardTemplate.rules[i];
        bool applies = rule.alwaysOn || isFeatureEnabled(rule.featureKey);
        if (!applies) continue;

        for (int j = 0; j < rule.pinCount; j++)
        {
            if (rule.pins[j] == info.gpio)
            {
                bool availableForChannel = rule.pinClass != PinPolicyClass::Exclusive && rule.pinClass != PinPolicyClass::Forbidden;
                applyPinClass(info, rule.pinClass, availableForChannel, rule.owner, rule.reason);
            }
        }
    }
}

static void applyLegacyBoardProfileRules(const BoardConfig &board, HardwarePinInfo &info)
{
    if (board.templateId == "lilygo_t3_v1_6_1")
    {
        if (info.gpio == 6 || info.gpio == 7 || info.gpio == 8 || info.gpio == 11 || info.gpio == 16 || info.gpio == 17)
        {
            applyPinClass(info, PinPolicyClass::Forbidden, false, "flash", "Connected to integrated flash/package internals");
            return;
        }

        if (info.gpio == 1 || info.gpio == 3)
            applyPinClass(info, PinPolicyClass::Warning, true, "usb_uart", "Shared with USB serial programming/monitor");

        if (gConfig.oled.enabled && (info.gpio == gConfig.oled.sda || info.gpio == gConfig.oled.scl))
            applyPinClass(info, PinPolicyClass::Exclusive, false, "oled", "Reserved by OLED interface");

        if (gConfig.lora.enabled && (info.gpio == gConfig.lora.sck || info.gpio == gConfig.lora.miso || info.gpio == gConfig.lora.mosi ||
            info.gpio == gConfig.lora.cs || info.gpio == gConfig.lora.rst || info.gpio == gConfig.lora.dio0 ||
            info.gpio == gConfig.lora.dio1 || info.gpio == gConfig.lora.dio2))
            applyPinClass(info, PinPolicyClass::Exclusive, false, "lora", "Reserved by LoRa radio");

        if (gConfig.sd.enabled && (info.gpio == gConfig.sd.cs || info.gpio == gConfig.sd.mosi || info.gpio == gConfig.sd.miso || info.gpio == gConfig.sd.sck))
            applyPinClass(info, PinPolicyClass::Exclusive, false, "sd", "Reserved by SD card interface");

        if (gConfig.led.enabled && info.gpio == gConfig.led.pin)
            applyPinClass(info, PinPolicyClass::Shared, true, "led", "On-board LED attached");

        if (gConfig.battery.enabled && info.gpio == gConfig.battery.adcPin)
            applyPinClass(info, PinPolicyClass::Warning, true, "battery", "Connected to battery sense divider");

        if (isStrappingPin(info.gpio))
            applyPinClass(info, PinPolicyClass::Warning, true, "boot", "Strapping pin; avoid unsafe boot-time loads");
    }
}

static void applyConfigReservations(const BoardConfig &board, HardwarePinInfo &info)
{
    for (int i = 0; i < board.reservedCount; i++)
    {
        if (board.reserved[i].gpio == info.gpio)
        {
            applyPinClass(info, PinPolicyClass::Exclusive, false, board.reserved[i].name, "Reserved by board configuration");
        }
    }

    for (int i = 0; i < board.resourceCount; i++)
    {
        if (board.resources[i].gpio == info.gpio)
        {
            info.resourceId = board.resources[i].id;
            break;
        }
    }

    for (int i = 0; i < gConfig.channelCount; i++)
    {
        const ChannelConfig &channel = gConfig.channels[i];
        const BoardResourceConfig *resource = findBoardResource(board, channel.resourceId);
        if (resource && resource->gpio == info.gpio)
        {
            info.channelId = channel.id;
            break;
        }
    }
}

bool validateActiveBoard(String &errorMessage)
{
    const BoardConfig *board = getActiveBoard();
    if (!board)
    {
        errorMessage = "Active board not found";
        return false;
    }

    const ChipTemplate *chipTemplate = getChipTemplate(board->chip);
    const ChipTemplateConfig *chipTemplateConfig = getActiveChipTemplateConfig();
    if (!chipTemplate && !chipTemplateConfig)
    {
        errorMessage = "Chip template not found for board " + board->name;
        return false;
    }

    HardwarePinInfo hardwarePins[MAX_HARDWARE_PINS];
    int hardwarePinCount = buildHardwarePinMap(hardwarePins, MAX_HARDWARE_PINS);

    for (int i = 0; i < board->resourceCount; i++)
    {
        const BoardResourceConfig &resource = board->resources[i];

        if (isReservedGpio(*board, resource.gpio))
        {
            errorMessage = "Resource " + resource.id + " uses reserved GPIO " + String(resource.gpio);
            return false;
        }

        if (chipTemplateConfig)
        {
            const ChipTemplatePinConfig *chipPin = findChipTemplateConfigPin(*chipTemplateConfig, resource.gpio);
            if (!chipPin)
            {
                errorMessage = "GPIO " + String(resource.gpio) + " is not allowed by active chip template";
                return false;
            }

            if (!chipTemplateConfigSupportsResource(*chipPin, resource))
            {
                errorMessage = "Resource " + resource.id + " requests unsupported capability on GPIO " + String(resource.gpio);
                return false;
            }
        }
        else
        {
            const ChipPinTemplate *chipPin = findChipPinTemplate(*chipTemplate, resource.gpio);
            if (!chipPin)
            {
                errorMessage = "GPIO " + String(resource.gpio) + " is not allowed by chip template";
                return false;
            }

            if (!chipPinSupportsResource(*chipPin, resource))
            {
                errorMessage = "Resource " + resource.id + " requests unsupported capability on GPIO " + String(resource.gpio);
                return false;
            }
        }

        for (int j = 0; j < hardwarePinCount; j++)
        {
            if (hardwarePins[j].gpio != resource.gpio) continue;

            if (hardwarePins[j].pinClass == PinPolicyClass::Exclusive || hardwarePins[j].pinClass == PinPolicyClass::Forbidden)
            {
                errorMessage = "GPIO " + String(resource.gpio) + " is not available: " + hardwarePins[j].reason;
                return false;
            }
        }
    }

    errorMessage = "";
    return true;
}

int buildHardwarePinMap(HardwarePinInfo *items, int maxItems)
{
    const BoardConfig *board = getActiveBoard();
    if (!board || maxItems <= 0)
    {
        return 0;
    }

    const ChipTemplate *chipTemplate = getChipTemplate(board->chip);
    const ChipTemplateConfig *chipTemplateConfig = getActiveChipTemplateConfig();
    if (!chipTemplate && !chipTemplateConfig)
    {
        return 0;
    }

    int count = 0;
    int pinCount = chipTemplateConfig ? chipTemplateConfig->pinCount : chipTemplate->pinCount;
    for (int i = 0; i < pinCount && count < maxItems; i++)
    {
        int gpio = chipTemplateConfig ? chipTemplateConfig->pins[i].gpio : chipTemplate->pins[i].gpio;
        HardwarePinInfo &info = items[count++];

        info.gpio = gpio;
        info.pinClass = PinPolicyClass::Safe;
        info.availableForChannel = true;
        info.internalPullup = chipTemplateConfig ? chipTemplateConfig->pins[i].internalPullup : chipTemplate->pins[i].internalPullup;
        info.isInputOnly = chipTemplateConfig ? chipTemplateConfig->pins[i].inputOnly : isInputOnlyPin(gpio);
        info.isStrapping = chipTemplateConfig ? chipTemplateConfig->pins[i].strapping : isStrappingPin(gpio);
        info.owner = "";
        info.reason = "";
        info.resourceId = "";
        info.channelId = "";

        const BoardTemplateConfig *boardTemplate = getActiveBoardTemplateConfig();
        if (boardTemplate)
            applyBoardTemplateRules(*boardTemplate, info);
        else
            applyLegacyBoardProfileRules(*board, info);
        applyConfigReservations(*board, info);
    }

    return count;
}

const char* hardwarePinClassToString(PinPolicyClass pinClass)
{
    switch (pinClass)
    {
        case PinPolicyClass::Safe: return "safe";
        case PinPolicyClass::Warning: return "warning";
        case PinPolicyClass::Shared: return "shared";
        case PinPolicyClass::Exclusive: return "exclusive";
        case PinPolicyClass::Forbidden: return "forbidden";
        default: return "safe";
    }
}
