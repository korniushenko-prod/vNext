#include "pin_manager.h"

PinManager gPins;

void PinManager::add(String name, int pin, String mode)
{
    if (count >= MAX_PINS) return;

    pins[count].name = name;
    pins[count].pin = pin;
    pins[count].mode = mode;
    pins[count].state = false;

    count++;
}

void PinManager::init()
{
    for (int i = 0; i < count; i++)
    {
        if (pins[i].mode == "output")
        {
            pinMode(pins[i].pin, OUTPUT);
        }
        else
        {
            pinMode(pins[i].pin, INPUT);
        }
    }
}

PinItem* PinManager::find(String name)
{
    for (int i = 0; i < count; i++)
    {
        if (pins[i].name == name)
            return &pins[i];
    }
    return nullptr;
}

bool PinManager::read(String name)
{
    PinItem* p = find(name);
    if (!p) return false;

    return digitalRead(p->pin);
}

void PinManager::write(String name, bool state)
{
    PinItem* p = find(name);
    if (!p) return;

    digitalWrite(p->pin, state);
    p->state = state;
}