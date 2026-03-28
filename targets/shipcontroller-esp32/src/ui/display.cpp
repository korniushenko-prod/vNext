#include <Arduino.h>
#include <math.h>
#include "../config/feature_flags.h"

#include "display.h"

#if FEATURE_OLED
#include "../config/config.h"
#include "../core/board_manager.h"
#include "../drivers/oled_driver.h"
#include "../runtime/alarm_manager.h"
#include "../runtime/sequence_manager.h"
#include "../runtime/display_types.h"
#include "../runtime/signal_registry.h"
#include "../runtime/system_source_registry.h"

namespace {

struct ResolvedDisplayWidget {
    const DisplayWidgetConfig *config = nullptr;
    int signalIndex = -1;
    int visibleIfSignalIndex = -1;
};

struct ResolvedDisplayScreen {
    const DisplayScreenConfig *config = nullptr;
    ResolvedDisplayWidget *widgets = nullptr;
    int widgetCount = 0;
    int visibleIfSignalIndex = -1;
    uint32_t lastRenderMs = 0;
};

ResolvedDisplayScreen *gResolvedScreens = nullptr;
int gResolvedScreenCount = 0;
int gActiveScreenIndex = 0;

void freeResolvedScreens()
{
    if (gResolvedScreens == nullptr)
    {
        gResolvedScreenCount = 0;
        gActiveScreenIndex = 0;
        return;
    }

    for (int i = 0; i < gResolvedScreenCount; i++)
    {
        delete[] gResolvedScreens[i].widgets;
        gResolvedScreens[i].widgets = nullptr;
        gResolvedScreens[i].widgetCount = 0;
    }

    delete[] gResolvedScreens;
    gResolvedScreens = nullptr;
    gResolvedScreenCount = 0;
    gActiveScreenIndex = 0;
}

bool signalConditionIsVisible(int signalIndex)
{
    if (signalIndex < 0)
    {
        return true;
    }

    return gSignals.readBinaryAt(signalIndex, false);
}

String twoDigits(uint32_t value)
{
    if (value < 10)
    {
        return "0" + String(value);
    }

    return String(value);
}

String formatDurationMs(float rawValue, const String &durationStyle, const String &unitHint, int precision)
{
    uint32_t valueMs = 0;
    if (unitHint == "ms")
    {
        valueMs = rawValue < 0 ? 0 : static_cast<uint32_t>(rawValue);
    }
    else
    {
        valueMs = rawValue < 0 ? 0 : static_cast<uint32_t>(rawValue * 1000.0f);
    }

    if (durationStyle == "ms")
    {
        return String(valueMs) + " ms";
    }

    if (durationStyle == "s")
    {
        return String(valueMs / 1000.0f, precision >= 0 ? precision : 1) + " s";
    }

    uint32_t totalSeconds = valueMs / 1000;
    uint32_t hours = totalSeconds / 3600;
    uint32_t minutes = (totalSeconds % 3600) / 60;
    uint32_t seconds = totalSeconds % 60;

    if (durationStyle == "hh:mm:ss" || hours > 0)
    {
        return twoDigits(hours) + ":" + twoDigits(minutes) + ":" + twoDigits(seconds);
    }

    return twoDigits(minutes) + ":" + twoDigits(seconds);
}

String formatDisplayValue(const ResolvedDisplayWidget &widget, const SignalRecord *signal)
{
    const DisplayFormatConfig &format = widget.config->format;

    if (isSystemSourceId(widget.config->signalId))
    {
        String body = readSystemSourceValue(widget.config->signalId);
        if (body.length() == 0)
        {
            body = format.emptyText.length() > 0 ? format.emptyText : "--";
        }
        return format.prefix + body + format.suffix;
    }

    if (signal == nullptr)
    {
        return format.emptyText.length() > 0 ? format.emptyText : "--";
    }

    if (signal->state.quality == SignalQuality::Fault)
    {
        return signal->state.statusText.length() > 0 ? signal->state.statusText : "fault";
    }

    if (widget.config->type == DisplayWidgetType::Status || signal->definition.signalClass == SignalClass::Binary)
    {
        String trueText = format.trueText.length() > 0 ? format.trueText : "ON";
        String falseText = format.falseText.length() > 0 ? format.falseText : "OFF";
        return signal->state.boolValue ? trueText : falseText;
    }

    String unitHint = format.units.length() > 0 ? format.units : signal->definition.units;
    int precision = format.precision >= 0 ? format.precision : 1;

    if (widget.config->type == DisplayWidgetType::Timer || format.durationStyle.length() > 0)
    {
        String durationStyle = format.durationStyle.length() > 0 ? format.durationStyle : "mm:ss";
        String body = formatDurationMs(signal->state.engineeringValue, durationStyle, unitHint, precision);
        return format.prefix + body + format.suffix;
    }

    String body = String(signal->state.engineeringValue, precision);
    String suffix = format.suffix;
    if (suffix.length() == 0 && unitHint.length() > 0)
    {
        suffix = " " + unitHint;
    }

    return format.prefix + body + suffix;
}

void drawTextAt(int x, int y, const String &text, bool inverted = false)
{
    if (!display)
    {
        return;
    }

    if (inverted)
    {
        int width = text.length() * 6;
        display->fillRect(x, y, width + 2, 8, SSD1306_WHITE);
        display->setTextColor(SSD1306_BLACK);
        display->setCursor(x + 1, y);
        display->print(text);
        display->setTextColor(SSD1306_WHITE);
        return;
    }

    display->setCursor(x, y);
    display->print(text);
}

void drawResolvedWidget(const ResolvedDisplayWidget &widget, int &flowY)
{
    if (!signalConditionIsVisible(widget.visibleIfSignalIndex))
    {
        return;
    }

    const DisplayWidgetConfig &config = *widget.config;
    const SignalRecord *signal = widget.signalIndex >= 0 ? gSignals.getAt(widget.signalIndex) : nullptr;
    bool useFlowLayout = (config.x == 0 && config.y == 0 && config.w == 0 && config.h == 0);
    int x = useFlowLayout ? 0 : config.x;
    int y = useFlowLayout ? flowY : config.y;

    switch (config.type)
    {
        case DisplayWidgetType::Label:
            drawTextAt(x, y, config.label, config.style.invert);
            if (useFlowLayout) flowY += 10;
            break;

        case DisplayWidgetType::Value:
        case DisplayWidgetType::Status:
        case DisplayWidgetType::Timer:
            drawTextAt(x, y, formatDisplayValue(widget, signal), config.style.invert);
            if (useFlowLayout) flowY += 10;
            break;

        case DisplayWidgetType::Pair:
            drawTextAt(x, y, config.label + ": " + formatDisplayValue(widget, signal), config.style.invert);
            if (useFlowLayout) flowY += 10;
            break;

        case DisplayWidgetType::Bar:
        {
            float value = signal ? signal->state.engineeringValue : 0.0f;
            if (value < 0.0f) value = 0.0f;
            if (value > 100.0f) value = 100.0f;
            int width = config.w > 0 ? config.w : 64;
            int height = config.h > 0 ? config.h : 8;
            int fillWidth = static_cast<int>(roundf((value / 100.0f) * (width - 2)));

            if (config.label.length() > 0)
            {
                drawTextAt(x, y, config.label, false);
                y += 10;
            }

            display->drawRect(x, y, width, height, SSD1306_WHITE);
            display->fillRect(x + 1, y + 1, fillWidth, height - 2, SSD1306_WHITE);
            if (useFlowLayout) flowY = y + height + 4;
            break;
        }

        case DisplayWidgetType::Spacer:
            flowY += (config.h > 0 ? config.h : 6);
            break;

        default:
            drawTextAt(x, y, config.label.length() > 0 ? config.label : config.id, false);
            if (useFlowLayout) flowY += 10;
            break;
    }
}

} // namespace

void displayUiInit()
{
    freeResolvedScreens();
}

bool displayUiConfigure()
{
    freeResolvedScreens();

    if (!gConfig.display.enabled || gConfig.display.screenCount <= 0 || gConfig.display.screens == nullptr)
    {
        return false;
    }

    gResolvedScreens = new ResolvedDisplayScreen[gConfig.display.screenCount];
    if (gResolvedScreens == nullptr)
    {
        Serial.println(F("DISPLAY: failed to allocate resolved screens"));
        return false;
    }

    gResolvedScreenCount = gConfig.display.screenCount;
    gActiveScreenIndex = 0;

    for (int screenIndex = 0; screenIndex < gResolvedScreenCount; screenIndex++)
    {
        ResolvedDisplayScreen &resolvedScreen = gResolvedScreens[screenIndex];
        DisplayScreenConfig &screen = gConfig.display.screens[screenIndex];

        resolvedScreen.config = &screen;
        resolvedScreen.visibleIfSignalIndex = gSignals.findIndex(screen.visibleIfSignalId);
        resolvedScreen.widgetCount = screen.widgetCount;
        resolvedScreen.lastRenderMs = 0;

        if (gConfig.display.startupScreenId == screen.id)
        {
            gActiveScreenIndex = screenIndex;
        }

        if (screen.widgetCount <= 0 || screen.widgets == nullptr)
        {
            continue;
        }

        resolvedScreen.widgets = new ResolvedDisplayWidget[screen.widgetCount];
        if (resolvedScreen.widgets == nullptr)
        {
            Serial.print(F("DISPLAY: failed to allocate widgets for screen "));
            Serial.println(screen.id);
            resolvedScreen.widgetCount = 0;
            continue;
        }

        for (int widgetIndex = 0; widgetIndex < screen.widgetCount; widgetIndex++)
        {
            const DisplayWidgetConfig &widget = screen.widgets[widgetIndex];
            ResolvedDisplayWidget &resolvedWidget = resolvedScreen.widgets[widgetIndex];
            resolvedWidget.config = &widget;
            resolvedWidget.signalIndex = gSignals.findIndex(widget.signalId);
            resolvedWidget.visibleIfSignalIndex = gSignals.findIndex(widget.visibleIfSignalId);
        }
    }

    return true;
}

bool displayUiHasScreens()
{
    return gResolvedScreens != nullptr && gResolvedScreenCount > 0;
}

bool displayUiRender()
{
    if (!display || !displayUiHasScreens())
    {
        return false;
    }

    if (gActiveScreenIndex < 0 || gActiveScreenIndex >= gResolvedScreenCount)
    {
        return false;
    }

    ResolvedDisplayScreen &screen = gResolvedScreens[gActiveScreenIndex];
    if (!signalConditionIsVisible(screen.visibleIfSignalIndex))
    {
        return false;
    }

    uint32_t now = millis();
    uint32_t refreshMs = screen.config->refreshMs > 0 ? screen.config->refreshMs : 500;
    if (now - screen.lastRenderMs < refreshMs)
    {
        return true;
    }

    screen.lastRenderMs = now;

    display->clearDisplay();
    display->setTextSize(1);
    display->setTextColor(SSD1306_WHITE);

    int flowY = 0;
    for (int i = 0; i < screen.widgetCount; i++)
    {
        drawResolvedWidget(screen.widgets[i], flowY);
    }

    display->display();
    return true;
}
#else

void displayUiInit()
{
}

bool displayUiConfigure()
{
    return false;
}

bool displayUiHasScreens()
{
    return false;
}

bool displayUiRender()
{
    return false;
}

#endif
