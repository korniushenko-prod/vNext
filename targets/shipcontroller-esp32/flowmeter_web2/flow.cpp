#include <Arduino.h>
#include "flow.h"
#include "app_state.h"
#include "storage.h"

// Сколько последних интервалов использовать для прогноза расхода
static const uint8_t FLOW_INTERVAL_WINDOW = 10;

// Вызывать при каждом принятом импульсе
void flowOnAcceptedPulse()
{
  const uint32_t nowMs = millis();

  // 1) Точный счет литров только по импульсам
  gTelem.pulseCount++;
  gTelem.dailyPulseCount++;

  gTelem.totalLiters += gSettings.litersPerPulse;
  gTelem.dailyLiters += gSettings.litersPerPulse;

  // 2) Интервал между текущим и предыдущим принятым импульсом
  if (gTelem.lastAcceptedPulseMs != 0)
  {
    const uint32_t intervalMs = nowMs - gTelem.lastAcceptedPulseMs;

    // защита от нулевого/битого интервала
    if (intervalMs > 0)
    {
      gTelem.lastAcceptedIntervalMs = intervalMs;

      gTelem.pulseIntervals[gTelem.intervalIndex] = intervalMs;
      gTelem.intervalIndex = (gTelem.intervalIndex + 1) % FLOW_INTERVAL_WINDOW;

      if (gTelem.intervalCount < FLOW_INTERVAL_WINDOW)
        gTelem.intervalCount++;
    }
  }

  gTelem.lastAcceptedPulseMs = nowMs;

  // 3) Средний интервал по тем значениям, которые уже есть
  if (gTelem.intervalCount > 0)
  {
    uint32_t sum = 0;
    for (uint8_t i = 0; i < gTelem.intervalCount; i++)
      sum += gTelem.pulseIntervals[i];

    gTelem.avgAcceptedIntervalMs = (float)sum / (float)gTelem.intervalCount;

    if (gTelem.avgAcceptedIntervalMs > 0.0f)
    {
      // L/min = litersPerPulse * 60000 / avgIntervalMs
      gTelem.lMin = gSettings.litersPerPulse * 60000.0f / gTelem.avgAcceptedIntervalMs;
    }
  }

  // 4) Производные расходы
  gTelem.l24h = gTelem.lMin * 60.0f * 24.0f;
  gTelem.t24h = (gTelem.l24h * gTelem.rhoT) / 1000.0f;

  gTelem.dirty = true;
}

// Вызывать раз в 1 секунду из loop()
// Здесь только контроль "поток остановился"
void flowUpdate()
{
  FuelPreset &fuel = gSettings.fuels[gSettings.activeFuel];
  gTelem.rhoT = computeRhoT(fuel.rho15, fuel.tempC);

  // нет интервалов — нет прогноза
  if (gTelem.intervalCount == 0 || gTelem.lastAcceptedPulseMs == 0)
  {
    gTelem.lMin = 0;
    gTelem.l24h = 0;
    gTelem.t24h = 0;
    return;
  }

  // защита от деления на 0
  if (gTelem.avgAcceptedIntervalMs < 1.0f)
    return;

  const uint32_t sinceLastPulse = millis() - gTelem.lastAcceptedPulseMs;

  // если поток остановился
  if (sinceLastPulse > (uint32_t)(gTelem.avgAcceptedIntervalMs * 3.0f))
  {
    gTelem.lMin = 0;
    gTelem.l24h = 0;
    gTelem.t24h = 0;
    return;
  }

  // расчет расхода
  float pulsesPerSecond = 1000.0f / gTelem.avgAcceptedIntervalMs;

  float litersPerSecond = pulsesPerSecond * gSettings.litersPerPulse;

  gTelem.lMin = litersPerSecond * 60.0f;

  gTelem.l24h = gTelem.lMin * 60.0f * 24.0f;

  gTelem.t24h = (gTelem.l24h * gTelem.rhoT) / 1000.0f;
}

void flowResetDaily()
{
  gTelem.dailyPulseCount = 0;
  gTelem.dailyLiters = 0.0f;
  gTelem.dirty = true;
}

void flowResetIntervals()
{
  for (uint8_t i = 0; i < FLOW_INTERVAL_WINDOW; i++)
    gTelem.pulseIntervals[i] = 0;

  gTelem.intervalIndex = 0;
  gTelem.intervalCount = 0;
  gTelem.lastAcceptedPulseMs = 0;
  gTelem.lastAcceptedIntervalMs = 0;
  gTelem.avgAcceptedIntervalMs = 0.0f;

  gTelem.lMin = 0.0f;
  gTelem.l24h = 0.0f;
  gTelem.t24h = 0.0f;

  gTelem.dirty = true;
}