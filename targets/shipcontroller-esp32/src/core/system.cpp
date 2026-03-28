#include <Arduino.h>
#include <Wire.h>
#include "system.h"
#include "../config/config.h"
#include "../drivers/i2c_scanner.h"
#include "../drivers/lora_driver.h"
#include "../drivers/oled_driver.h"
#include "../ui/ui.h"
#include "../config/config_loader.h"
#include "../modules/flowmeter.h"
#include "../modules/button.h"
#include "../modules/comparator.h"
#include "../modules/edge_detect.h"
#include "../modules/counter.h"
#include "../modules/totalizer.h"
#include "../modules/rate_estimator.h"
#include "../modules/window_aggregator.h"
#include "../modules/signal_extractor.h"
#include "../modules/freshness.h"
#include "../modules/latch.h"
#include "../modules/logic_gate.h"
#include "../modules/mode_authority.h"
#include "../modules/hysteresis.h"
#include "../modules/interlock.h"
#include "../modules/scale_map.h"
#include "../modules/selector.h"
#include "../modules/timer.h"
#include "../web/web.h"
#include "../core/board_manager.h"
#include "../core/resource_manager.h"
#include "../core/data_registry.h"
#include "../runtime/comms_registry.h"
#include "../runtime/alarm_manager.h"
#include "../runtime/sequence_manager.h"
#include "../runtime/signal_registry.h"
#include "../runtime/retained_value_store.h"

namespace {

void beginConfiguredI2cBus()
{
    int sda = gConfig.oled.sda;
    int scl = gConfig.oled.scl;

    for (int i = 0; i < gConfig.busCount; i++)
    {
        const BusConfig &bus = gConfig.buses[i];
        if (bus.enabled && bus.type == BusType::I2C)
        {
            sda = bus.sda;
            scl = bus.scl;
            break;
        }
    }

    Wire.begin(sda, scl);
}

}  // namespace

void systemInit()
{
    Serial.println("SYSTEM INIT");

    loadDefaultConfig();
    loadConfigFromFile();
    gRetainedValues.begin();

    String boardError;
    if (!validateActiveBoard(boardError))
    {
        Serial.println("BOARD ERROR: " + boardError);
    }
    else if (!gResources.configureFromConfig(boardError))
    {
        Serial.println("RESOURCE ERROR: " + boardError);
    }
    else
    {
        gResources.initHardware();
        gResources.runInputDiagnostics();
        if (!gSignals.configureFromConfig(boardError))
        {
            Serial.println("SIGNAL ERROR: " + boardError);
        }
        else
        {
            gSignals.updateFromRuntime();
        }

    }

    beginConfiguredI2cBus();

    if (!gComms.configureFromConfig(boardError))
    {
        Serial.println("COMMS ERROR: " + boardError);
    }
    else if (!gAlarms.configureFromConfig(boardError))
    {
        Serial.println("ALARM ERROR: " + boardError);
    }
    else if (!gSequences.configureFromConfig(boardError))
    {
        Serial.println("SEQUENCE ERROR: " + boardError);
    }

    webInit();

    i2cScan();
    loraInit();
    oledInit();

    flowInit();
    buttonInit();
    comparatorInit();
    counterInit();
    totalizerInit();
    rateEstimatorInit();
    windowAggregatorInit();
    signalExtractorInit();
    edgeDetectInit();
    freshnessInit();
    hysteresisInit();
    interlockInit();
    logicGateInit();
    modeAuthorityInit();
    scaleMapInit();
    timerInit();
    latchInit();
    selectorInit();
    buttonConfigure();
    comparatorConfigure();
    counterConfigure();
    totalizerConfigure();
    rateEstimatorConfigure();
    windowAggregatorConfigure();
    signalExtractorConfigure();
    edgeDetectConfigure();
    freshnessConfigure();
    hysteresisConfigure();
    interlockConfigure();
    logicGateConfigure();
    modeAuthorityConfigure();
    scaleMapConfigure();
    timerConfigure();
    latchConfigure();
    uiInit();
    selectorConfigure();
    uiConfigure();

    const BoardConfig* b = getActiveBoard();
    if (b)
    {
        Serial.println("Active board:");
        Serial.println(b->name);
        Serial.println("Chip: " + b->chip);

        for (int i = 0; i < b->resourceCount; i++)
        {
            Serial.println(b->resources[i].id + " -> GPIO" + String(b->resources[i].gpio));
        }
    }
}

void systemUpdate()
{
    webUpdate();
    gComms.update();
    gResources.update();
    gSignals.updateFromRuntime();

    flowUpdate();
    buttonUpdate();
    comparatorUpdate();
    counterUpdate();
    totalizerUpdate();
    rateEstimatorUpdate();
    windowAggregatorUpdate();
    signalExtractorUpdate();
    edgeDetectUpdate();
    freshnessUpdate();
    hysteresisUpdate();
    interlockUpdate();
    logicGateUpdate();
    modeAuthorityUpdate();
    scaleMapUpdate();
    timerUpdate();
    latchUpdate();
    selectorUpdate();
    gSequences.update();
    gAlarms.update();
    uiUpdate();
}
