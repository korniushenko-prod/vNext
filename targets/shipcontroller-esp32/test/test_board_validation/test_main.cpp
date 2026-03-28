#include <Arduino.h>
#include <unity.h>

#include "../../src/config/config.h"
#include "../../src/core/board_manager.h"

#include "../../src/config/config.cpp"
#include "../../src/config/config_schema.cpp"
#include "../../src/templates/chip_template.cpp"
#include "../../src/core/board_manager.cpp"

static void addCapability(BoardResourceConfig &resource, ChannelType type)
{
    resource.capabilities[resource.capabilityCount++] = type;
}

static void addCapability(ChipTemplatePinConfig &pin, ChannelType type)
{
    pin.capabilities[pin.capabilityCount++] = type;
}

static void resetConfigState()
{
    loadDefaultConfig();
    gConfig.boardCount = 0;
    gConfig.chipTemplateCount = 0;
    gConfig.boardTemplateCount = 0;
    gConfig.channelCount = 0;
    gConfig.blocks.timerCount = 0;
    gConfig.system.active_board = "test_board";
    gConfig.system.active_board_template = "";
    gConfig.system.active_chip_template = "";
    gConfig.oled.enabled = false;
    gConfig.lora.enabled = false;
    gConfig.sd.enabled = false;
    gConfig.led.enabled = false;
    gConfig.battery.enabled = false;
}

static ChipTemplateConfig &addChipTemplate(const String &id)
{
    ChipTemplateConfig &chip = gConfig.chipTemplates[gConfig.chipTemplateCount++];
    chip.id = id;
    chip.label = id;
    chip.pinCount = 0;
    return chip;
}

static ChipTemplatePinConfig &addChipPin(ChipTemplateConfig &chip, int gpio, bool pullup, bool inputOnly = false)
{
    ChipTemplatePinConfig &pin = chip.pins[chip.pinCount++];
    pin.gpio = gpio;
    pin.capabilityCount = 0;
    pin.internalPullup = pullup;
    pin.inputOnly = inputOnly;
    pin.strapping = false;
    pin.forbidden = false;
    pin.note = "";
    return pin;
}

static BoardTemplateConfig &addBoardTemplate(const String &id, const String &chipTemplateId)
{
    BoardTemplateConfig &boardTemplate = gConfig.boardTemplates[gConfig.boardTemplateCount++];
    boardTemplate.id = id;
    boardTemplate.label = id;
    boardTemplate.chipTemplateId = chipTemplateId;
    boardTemplate.ruleCount = 0;
    return boardTemplate;
}

static BoardTemplateRuleConfig &addRule(BoardTemplateConfig &boardTemplate, const String &feature, PinPolicyClass pinClass, int gpio)
{
    BoardTemplateRuleConfig &rule = boardTemplate.rules[boardTemplate.ruleCount++];
    rule.id = "rule_" + String(boardTemplate.ruleCount);
    rule.featureKey = feature;
    rule.pinClass = pinClass;
    rule.owner = feature;
    rule.reason = "test";
    rule.alwaysOn = false;
    rule.pinCount = 1;
    rule.pins[0] = gpio;
    return rule;
}

static BoardConfig &addBoard(const String &name, const String &chip, const String &templateId)
{
    BoardConfig &board = gConfig.boards[gConfig.boardCount++];
    board.name = name;
    board.chip = chip;
    board.templateId = templateId;
    board.resourceCount = 0;
    board.reservedCount = 0;
    return board;
}

static BoardResourceConfig &addResource(BoardConfig &board, const String &id, int gpio)
{
    BoardResourceConfig &resource = board.resources[board.resourceCount++];
    resource.id = id;
    resource.label = id;
    resource.gpio = gpio;
    resource.capabilityCount = 0;
    return resource;
}

void test_active_chip_template_follows_board_template()
{
    resetConfigState();

    ChipTemplateConfig &chip = addChipTemplate("esp32_custom");
    ChipTemplatePinConfig &pin = addChipPin(chip, 25, true);
    addCapability(pin, ChannelType::DI);
    addCapability(pin, ChannelType::DO);

    addBoardTemplate("lilygo_like", "esp32_custom");
    addBoard("test_board", "esp32", "lilygo_like");

    const ChipTemplateConfig *active = getActiveChipTemplateConfig();
    TEST_ASSERT_NOT_NULL(active);
    TEST_ASSERT_EQUAL_STRING("esp32_custom", active->id.c_str());
}

void test_active_chip_override_takes_priority()
{
    resetConfigState();

    ChipTemplateConfig &boardChip = addChipTemplate("esp32_board");
    ChipTemplatePinConfig &boardPin = addChipPin(boardChip, 25, false);
    addCapability(boardPin, ChannelType::DI);

    ChipTemplateConfig &overrideChip = addChipTemplate("esp32_override");
    ChipTemplatePinConfig &overridePin = addChipPin(overrideChip, 25, true);
    addCapability(overridePin, ChannelType::DI);

    addBoardTemplate("lilygo_like", "esp32_board");
    addBoard("test_board", "esp32", "lilygo_like");
    gConfig.system.active_chip_template = "esp32_override";

    const ChipTemplateConfig *active = getActiveChipTemplateConfig();
    TEST_ASSERT_NOT_NULL(active);
    TEST_ASSERT_EQUAL_STRING("esp32_override", active->id.c_str());
    TEST_ASSERT_TRUE(active->pins[0].internalPullup);
}

void test_validate_active_board_blocks_exclusive_pin_from_enabled_feature()
{
    resetConfigState();

    ChipTemplateConfig &chip = addChipTemplate("esp32_custom");
    ChipTemplatePinConfig &pin25 = addChipPin(chip, 25, true);
    addCapability(pin25, ChannelType::DI);
    addCapability(pin25, ChannelType::DO);

    BoardTemplateConfig &boardTemplate = addBoardTemplate("lilygo_like", "esp32_custom");
    addRule(boardTemplate, "oled", PinPolicyClass::Exclusive, 25);

    BoardConfig &board = addBoard("test_board", "esp32", "lilygo_like");
    BoardResourceConfig &resource = addResource(board, "r1", 25);
    addCapability(resource, ChannelType::DO);

    gConfig.oled.enabled = true;

    String errorMessage;
    TEST_ASSERT_FALSE(validateActiveBoard(errorMessage));
    TEST_ASSERT_TRUE(errorMessage.indexOf("not available") >= 0);
}

void test_build_hardware_map_marks_shared_led_pin_assignable()
{
    resetConfigState();

    ChipTemplateConfig &chip = addChipTemplate("esp32_custom");
    ChipTemplatePinConfig &pin25 = addChipPin(chip, 25, true);
    addCapability(pin25, ChannelType::DI);
    addCapability(pin25, ChannelType::DO);
    addCapability(pin25, ChannelType::PWM);

    BoardTemplateConfig &boardTemplate = addBoardTemplate("lilygo_like", "esp32_custom");
    addRule(boardTemplate, "led", PinPolicyClass::Shared, 25);

    BoardConfig &board = addBoard("test_board", "esp32", "lilygo_like");
    BoardResourceConfig &resource = addResource(board, "r1", 25);
    addCapability(resource, ChannelType::DO);

    gConfig.led.enabled = true;
    gConfig.led.pin = 25;

    HardwarePinInfo pins[MAX_HARDWARE_PINS];
    int count = buildHardwarePinMap(pins, MAX_HARDWARE_PINS);

    TEST_ASSERT_EQUAL(1, count);
    TEST_ASSERT_EQUAL(25, pins[0].gpio);
    TEST_ASSERT_EQUAL(PinPolicyClass::Shared, pins[0].pinClass);
    TEST_ASSERT_TRUE(pins[0].availableForChannel);
}

void setup()
{
    delay(2000);
    UNITY_BEGIN();
    RUN_TEST(test_active_chip_template_follows_board_template);
    RUN_TEST(test_active_chip_override_takes_priority);
    RUN_TEST(test_validate_active_board_blocks_exclusive_pin_from_enabled_feature);
    RUN_TEST(test_build_hardware_map_marks_shared_led_pin_assignable);
    UNITY_END();
}

void loop()
{
}
