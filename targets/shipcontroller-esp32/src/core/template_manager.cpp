#include "template_manager.h"

BoardTemplate pico;

BoardTemplate* getTemplate(String chip)
{
    if (chip.indexOf("ESP32") >= 0)
    {
        pico.name = "esp32-pico";

        pico.count = 0;

        int validPins[] = {
            4,5,16,17,18,19,
            21,22,23,
            25,26,27,
            32,33,
            34,35,36,39
        };

        for (int i = 0; i < sizeof(validPins)/sizeof(int); i++)
        {
            PinCapability &p = pico.pins[pico.count];

            p.pin = validPins[i];
            p.input = true;
            p.output = !(p.pin >= 34); // input-only
            p.adc = (p.pin >= 32);
            p.pwm = (p.pin < 34);
            p.interrupt = true;

            pico.count++;
        }

        return &pico;
    }

    return nullptr;
}