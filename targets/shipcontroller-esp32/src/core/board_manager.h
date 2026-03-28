#pragma once
#include "../config/config.h"

struct HardwarePinInfo {
    int gpio;
    PinPolicyClass pinClass;
    bool availableForChannel;
    bool internalPullup;
    bool isInputOnly;
    bool isStrapping;
    String owner;
    String reason;
    String resourceId;
    String channelId;
};

const BoardConfig* getActiveBoard();
const ChipTemplateConfig* getActiveChipTemplateConfig();
const BoardTemplateConfig* getActiveBoardTemplateConfig();
const BoardResourceConfig* findBoardResource(const BoardConfig &board, const String &resourceId);
bool resourceSupportsType(const BoardResourceConfig &resource, ChannelType type);
bool validateActiveBoard(String &errorMessage);
int buildHardwarePinMap(HardwarePinInfo *items, int maxItems);
const char* hardwarePinClassToString(PinPolicyClass pinClass);
