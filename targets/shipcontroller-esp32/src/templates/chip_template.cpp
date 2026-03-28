#include "chip_template.h"

static void addCapability(ChipPinTemplate &pin, ChannelType capability)
{
    if (pin.capabilityCount >= MAX_RESOURCE_CAPABILITIES) return;
    pin.capabilities[pin.capabilityCount++] = capability;
}

static ChipTemplate esp32Template;
static bool esp32TemplateInitialized = false;

static void ensureEsp32Template()
{
    if (esp32TemplateInitialized) return;

    esp32Template.id = "esp32";
    esp32Template.name = "ESP32";
    esp32Template.pinCount = 0;

    const int validPins[] = {
        0, 1, 2, 3, 4, 5,
        9, 10, 12, 13, 14, 15,
        18, 19, 21, 22, 23,
        25, 26, 27,
        32, 33, 34, 35, 36, 39
    };

    for (unsigned int i = 0; i < sizeof(validPins) / sizeof(int); i++)
    {
        ChipPinTemplate &pin = esp32Template.pins[esp32Template.pinCount++];
        pin.gpio = validPins[i];
        pin.internalPullup = !(pin.gpio == 34 || pin.gpio == 35 || pin.gpio == 36 || pin.gpio == 39);
        pin.capabilityCount = 0;

        addCapability(pin, ChannelType::DI);
        addCapability(pin, ChannelType::Counter);

        if (!(pin.gpio == 34 || pin.gpio == 35 || pin.gpio == 36 || pin.gpio == 39))
        {
            addCapability(pin, ChannelType::DO);
            addCapability(pin, ChannelType::PWM);
        }

        if (
            pin.gpio == 0 || pin.gpio == 2 || pin.gpio == 4 ||
            pin.gpio == 12 || pin.gpio == 13 || pin.gpio == 14 || pin.gpio == 15 ||
            pin.gpio == 25 || pin.gpio == 26 || pin.gpio == 27 ||
            pin.gpio == 32 || pin.gpio == 33 || pin.gpio == 34 ||
            pin.gpio == 35 || pin.gpio == 36 || pin.gpio == 39
        )
        {
            addCapability(pin, ChannelType::AI);
        }
    }

    esp32TemplateInitialized = true;
}

const ChipTemplate* getChipTemplate(const String &chipId)
{
    if (chipId == "esp32" || chipId.indexOf("ESP32") >= 0)
    {
        ensureEsp32Template();
        return &esp32Template;
    }

    return nullptr;
}

const ChipPinTemplate* findChipPinTemplate(const ChipTemplate &chipTemplate, int gpio)
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
