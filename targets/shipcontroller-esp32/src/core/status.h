#pragma once

enum ModuleStatus {
    MODULE_OK,
    MODULE_FAIL,
    MODULE_UNKNOWN
};

struct SystemStatus {
    ModuleStatus lora;
    ModuleStatus oled;
};

extern SystemStatus gStatus;