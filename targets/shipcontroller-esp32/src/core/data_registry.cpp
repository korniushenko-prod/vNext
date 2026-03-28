#include "data_registry.h"

DataRegistry gData;

void DataRegistry::registerValue(const String &key, float *value)
{
    if (count >= MAX_DATA_ITEMS) return;

    items[count].key = key;
    items[count].value = value;
    count++;
}

float DataRegistry::getValue(const String &key)
{
    for (int i = 0; i < count; i++)
    {
        if (items[i].key == key)
        {
            return *(items[i].value);
        }
    }

    return 0;
}