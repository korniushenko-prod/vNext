#pragma once

#ifndef FEATURE_LORA
#define FEATURE_LORA 1
#endif

#ifndef FEATURE_OLED
#define FEATURE_OLED 1
#endif

#ifndef FEATURE_COMMS
#define FEATURE_COMMS 1
#endif

#ifndef FEATURE_MODBUS
#define FEATURE_MODBUS 1
#endif

static constexpr bool kFeatureLora = FEATURE_LORA != 0;
static constexpr bool kFeatureOled = FEATURE_OLED != 0;
static constexpr bool kFeatureComms = FEATURE_COMMS != 0;
static constexpr bool kFeatureModbus = FEATURE_MODBUS != 0;
