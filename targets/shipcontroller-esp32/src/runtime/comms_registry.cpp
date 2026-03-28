#include "comms_registry.h"
#include "../config/feature_flags.h"

#if FEATURE_COMMS
#include <Wire.h>
#if FEATURE_MODBUS
#include <HardwareSerial.h>
#endif
#include <math.h>

#include "../config/config.h"
#include "../config/config_loader.h"
#include <ArduinoJson.h>

namespace {

constexpr uint8_t ADS1115_REG_CONVERSION = 0x00;
constexpr uint8_t ADS1115_REG_CONFIG = 0x01;
constexpr uint16_t ADS1115_CONFIG_OS_SINGLE = 0x8000;
constexpr uint16_t ADS1115_CONFIG_PGA_4_096 = 0x0200;
constexpr uint16_t ADS1115_CONFIG_MODE_SINGLE = 0x0100;
constexpr uint16_t ADS1115_CONFIG_DR_860 = 0x00E0;
constexpr uint16_t ADS1115_CONFIG_COMP_DISABLE = 0x0003;
constexpr uint8_t MCP4728_MULTI_WRITE_CMD = 0x40;
#if FEATURE_MODBUS
constexpr uint8_t MODBUS_FC_READ_COILS = 0x01;
constexpr uint8_t MODBUS_FC_READ_DISCRETE_INPUTS = 0x02;
constexpr uint8_t MODBUS_FC_READ_HOLDING_REGISTERS = 0x03;
constexpr uint8_t MODBUS_FC_READ_INPUT_REGISTERS = 0x04;
constexpr uint8_t MODBUS_FC_WRITE_SINGLE_COIL = 0x05;
constexpr uint8_t MODBUS_FC_WRITE_SINGLE_REGISTER = 0x06;

HardwareSerial gModbusSerial(2);
#endif

String findPrimaryI2cBusId()
{
    for (int i = 0; i < gConfig.busCount; i++)
    {
        const BusConfig &bus = gConfig.buses[i];
        if (bus.enabled && bus.type == BusType::I2C)
        {
            return bus.id;
        }
    }

    return "";
}

String findPrimarySerialBusId()
{
#if FEATURE_MODBUS
    for (int i = 0; i < gConfig.busCount; i++)
    {
        const BusConfig &bus = gConfig.buses[i];
        if (bus.enabled && (bus.type == BusType::UART || bus.type == BusType::RS485))
        {
            return bus.id;
        }
    }

    return "";
#else
    return "";
#endif
}

uint32_t serialConfigForBus(const BusConfig &bus)
{
#if FEATURE_MODBUS
    const bool even = bus.parity == "even";
    const bool odd = bus.parity == "odd";
    const bool twoStop = bus.stopBits >= 2;
    if (even) return twoStop ? SERIAL_8E2 : SERIAL_8E1;
    if (odd) return twoStop ? SERIAL_8O2 : SERIAL_8O1;
    return twoStop ? SERIAL_8N2 : SERIAL_8N1;
#else
    (void)bus;
    return 0;
#endif
}

void setRs485Direction(const BusConfig &bus, bool txMode)
{
#if FEATURE_MODBUS
    if (bus.type == BusType::RS485 && bus.dePin >= 0)
    {
        digitalWrite(bus.dePin, txMode ? HIGH : LOW);
    }
#else
    (void)bus;
    (void)txMode;
#endif
}

void clearModbusSerialInput()
{
#if FEATURE_MODBUS
    while (gModbusSerial.available() > 0)
    {
        gModbusSerial.read();
    }
#endif
}

uint16_t modbusCrc16(const uint8_t *data, size_t length)
{
#if FEATURE_MODBUS
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; i++)
    {
        crc ^= data[i];
        for (int bit = 0; bit < 8; bit++)
        {
            if (crc & 0x0001)
            {
                crc >>= 1;
                crc ^= 0xA001;
            }
            else
            {
                crc >>= 1;
            }
        }
    }
    return crc;
#else
    (void)data;
    (void)length;
    return 0;
#endif
}

bool modbusExchangeFrame(const BusConfig &bus, const uint8_t *request, size_t requestLen,
                         uint8_t *response, size_t responseCapacity, int &responseLen,
                         uint32_t timeoutMs)
{
#if FEATURE_MODBUS
    responseLen = 0;
    clearModbusSerialInput();
    setRs485Direction(bus, true);
    delayMicroseconds(100);
    gModbusSerial.write(request, requestLen);
    gModbusSerial.flush();
    delayMicroseconds(100);
    setRs485Direction(bus, false);

    const uint32_t start = millis();
    uint32_t lastByteAt = 0;
    bool sawAnyByte = false;
    while ((millis() - start) < timeoutMs)
    {
        while (gModbusSerial.available() > 0 && responseLen < static_cast<int>(responseCapacity))
        {
            response[responseLen++] = static_cast<uint8_t>(gModbusSerial.read());
            lastByteAt = millis();
            sawAnyByte = true;
        }

        if (sawAnyByte && (millis() - lastByteAt) > 4)
        {
            break;
        }
        delay(1);
    }

    return responseLen > 0;
#else
    (void)bus;
    (void)request;
    (void)requestLen;
    (void)response;
    (void)responseCapacity;
    (void)timeoutMs;
    responseLen = 0;
    return false;
#endif
}

bool modbusValidateFrame(const uint8_t *response, int responseLen)
{
#if FEATURE_MODBUS
    if (responseLen < 5)
    {
        return false;
    }
    const uint16_t expected = modbusCrc16(response, static_cast<size_t>(responseLen - 2));
    const uint16_t received = static_cast<uint16_t>(response[responseLen - 2]) |
                              (static_cast<uint16_t>(response[responseLen - 1]) << 8);
    return expected == received;
#else
    (void)response;
    (void)responseLen;
    return false;
#endif
}

bool modbusReadSingleRegister(const BusConfig &bus, uint8_t slaveId, uint8_t functionCode,
                              uint16_t address, uint16_t &value, uint32_t timeoutMs)
{
#if FEATURE_MODBUS
    uint8_t request[8] = {
        slaveId,
        functionCode,
        static_cast<uint8_t>((address >> 8) & 0xFF),
        static_cast<uint8_t>(address & 0xFF),
        0x00,
        0x01,
        0x00,
        0x00
    };
    const uint16_t crc = modbusCrc16(request, 6);
    request[6] = static_cast<uint8_t>(crc & 0xFF);
    request[7] = static_cast<uint8_t>((crc >> 8) & 0xFF);

    uint8_t response[16] = {0};
    int responseLen = 0;
    if (!modbusExchangeFrame(bus, request, sizeof(request), response, sizeof(response), responseLen, timeoutMs))
    {
        return false;
    }
    if (!modbusValidateFrame(response, responseLen) || responseLen < 7)
    {
        return false;
    }
    if (response[0] != slaveId)
    {
        return false;
    }
    if (response[1] == static_cast<uint8_t>(functionCode | 0x80))
    {
        return false;
    }
    if (response[1] != functionCode || response[2] != 2)
    {
        return false;
    }

    value = static_cast<uint16_t>(response[3]) << 8;
    value |= static_cast<uint16_t>(response[4]);
    return true;
#else
    (void)bus;
    (void)slaveId;
    (void)functionCode;
    (void)address;
    (void)timeoutMs;
    value = 0;
    return false;
#endif
}

bool modbusReadSingleBit(const BusConfig &bus, uint8_t slaveId, uint8_t functionCode,
                         uint16_t address, bool &value, uint32_t timeoutMs)
{
#if FEATURE_MODBUS
    uint8_t request[8] = {
        slaveId,
        functionCode,
        static_cast<uint8_t>((address >> 8) & 0xFF),
        static_cast<uint8_t>(address & 0xFF),
        0x00,
        0x01,
        0x00,
        0x00
    };
    const uint16_t crc = modbusCrc16(request, 6);
    request[6] = static_cast<uint8_t>(crc & 0xFF);
    request[7] = static_cast<uint8_t>((crc >> 8) & 0xFF);

    uint8_t response[16] = {0};
    int responseLen = 0;
    if (!modbusExchangeFrame(bus, request, sizeof(request), response, sizeof(response), responseLen, timeoutMs))
    {
        return false;
    }
    if (!modbusValidateFrame(response, responseLen) || responseLen < 6)
    {
        return false;
    }
    if (response[0] != slaveId)
    {
        return false;
    }
    if (response[1] == static_cast<uint8_t>(functionCode | 0x80))
    {
        return false;
    }
    if (response[1] != functionCode || response[2] < 1)
    {
        return false;
    }

    value = (response[3] & 0x01) != 0;
    return true;
#else
    (void)bus;
    (void)slaveId;
    (void)functionCode;
    (void)address;
    (void)timeoutMs;
    value = false;
    return false;
#endif
}

bool modbusWriteSingleRegister(const BusConfig &bus, uint8_t slaveId, uint16_t address, uint16_t value,
                               uint32_t timeoutMs)
{
#if FEATURE_MODBUS
    uint8_t request[8] = {
        slaveId,
        MODBUS_FC_WRITE_SINGLE_REGISTER,
        static_cast<uint8_t>((address >> 8) & 0xFF),
        static_cast<uint8_t>(address & 0xFF),
        static_cast<uint8_t>((value >> 8) & 0xFF),
        static_cast<uint8_t>(value & 0xFF),
        0x00,
        0x00
    };
    const uint16_t crc = modbusCrc16(request, 6);
    request[6] = static_cast<uint8_t>(crc & 0xFF);
    request[7] = static_cast<uint8_t>((crc >> 8) & 0xFF);

    uint8_t response[16] = {0};
    int responseLen = 0;
    if (!modbusExchangeFrame(bus, request, sizeof(request), response, sizeof(response), responseLen, timeoutMs))
    {
        return false;
    }
    if (!modbusValidateFrame(response, responseLen) || responseLen < 8)
    {
        return false;
    }
    return response[0] == slaveId && response[1] == MODBUS_FC_WRITE_SINGLE_REGISTER;
#else
    (void)bus;
    (void)slaveId;
    (void)address;
    (void)value;
    (void)timeoutMs;
    return false;
#endif
}

bool modbusWriteSingleCoil(const BusConfig &bus, uint8_t slaveId, uint16_t address, bool value,
                           uint32_t timeoutMs)
{
#if FEATURE_MODBUS
    const uint16_t coilValue = value ? 0xFF00 : 0x0000;
    uint8_t request[8] = {
        slaveId,
        MODBUS_FC_WRITE_SINGLE_COIL,
        static_cast<uint8_t>((address >> 8) & 0xFF),
        static_cast<uint8_t>(address & 0xFF),
        static_cast<uint8_t>((coilValue >> 8) & 0xFF),
        static_cast<uint8_t>(coilValue & 0xFF),
        0x00,
        0x00
    };
    const uint16_t crc = modbusCrc16(request, 6);
    request[6] = static_cast<uint8_t>(crc & 0xFF);
    request[7] = static_cast<uint8_t>((crc >> 8) & 0xFF);

    uint8_t response[16] = {0};
    int responseLen = 0;
    if (!modbusExchangeFrame(bus, request, sizeof(request), response, sizeof(response), responseLen, timeoutMs))
    {
        return false;
    }
    if (!modbusValidateFrame(response, responseLen) || responseLen < 8)
    {
        return false;
    }
    return response[0] == slaveId && response[1] == MODBUS_FC_WRITE_SINGLE_COIL;
#else
    (void)bus;
    (void)slaveId;
    (void)address;
    (void)value;
    (void)timeoutMs;
    return false;
#endif
}

uint16_t ads1115MuxForChannel(int channelIndex)
{
    switch (channelIndex)
    {
        case 0: return 0x4000;
        case 1: return 0x5000;
        case 2: return 0x6000;
        case 3: return 0x7000;
        default: return 0;
    }
}

bool ads1115WriteRegister(uint8_t address, uint8_t reg, uint16_t value)
{
    Wire.beginTransmission(address);
    Wire.write(reg);
    Wire.write(static_cast<uint8_t>((value >> 8) & 0xFF));
    Wire.write(static_cast<uint8_t>(value & 0xFF));
    return Wire.endTransmission() == 0;
}

bool ads1115ReadRegister(uint8_t address, uint8_t reg, uint16_t &value)
{
    Wire.beginTransmission(address);
    Wire.write(reg);
    if (Wire.endTransmission(false) != 0)
    {
        return false;
    }

    const int bytesRead = Wire.requestFrom(static_cast<int>(address), 2);
    if (bytesRead != 2)
    {
        return false;
    }

    value = static_cast<uint16_t>(Wire.read()) << 8;
    value |= static_cast<uint16_t>(Wire.read());
    return true;
}

bool ads1115ReadSingleEndedRaw(uint8_t address, int channelIndex, int &rawValue)
{
    const uint16_t mux = ads1115MuxForChannel(channelIndex);
    if (mux == 0)
    {
        return false;
    }

    const uint16_t config =
        ADS1115_CONFIG_OS_SINGLE |
        mux |
        ADS1115_CONFIG_PGA_4_096 |
        ADS1115_CONFIG_MODE_SINGLE |
        ADS1115_CONFIG_DR_860 |
        ADS1115_CONFIG_COMP_DISABLE;

    if (!ads1115WriteRegister(address, ADS1115_REG_CONFIG, config))
    {
        return false;
    }

    delay(2);

    uint16_t rawRegister = 0;
    if (!ads1115ReadRegister(address, ADS1115_REG_CONVERSION, rawRegister))
    {
        return false;
    }

    int16_t signedValue = static_cast<int16_t>(rawRegister);
    if (signedValue < 0)
    {
        signedValue = 0;
    }

    rawValue = static_cast<int>(signedValue);
    return true;
}

bool mcp4728WriteChannelRaw(uint8_t address, int channelIndex, int rawValue)
{
    if (channelIndex < 0 || channelIndex > 3)
    {
        return false;
    }

    if (rawValue < 0) rawValue = 0;
    if (rawValue > 4095) rawValue = 4095;

    Wire.beginTransmission(address);
    Wire.write(static_cast<uint8_t>(MCP4728_MULTI_WRITE_CMD | ((channelIndex & 0x03) << 1)));
    Wire.write(static_cast<uint8_t>((rawValue >> 8) & 0x0F));
    Wire.write(static_cast<uint8_t>(rawValue & 0xFF));
    return Wire.endTransmission() == 0;
}

void loadVirtualAiDefaults(VirtualAiDeviceSettings &settings)
{
    settings.mode = "triangle";
    settings.minRaw = 0;
    settings.maxRaw = 32767;
    settings.manualRaw = 12000;
    settings.periodMs = 4000;
}

bool loadDeviceConfigDocument(JsonDocument &doc)
{
    return loadConfigDocumentFromStorage(doc);
}

int clampIntValue(int value, int low, int high)
{
    if (value < low) return low;
    if (value > high) return high;
    return value;
}

int virtualAiValueFor(const VirtualAiDeviceSettings &settings, uint32_t now, int sourceIndex)
{
    const int minRaw = settings.minRaw <= settings.maxRaw ? settings.minRaw : settings.maxRaw;
    const int maxRaw = settings.maxRaw >= settings.minRaw ? settings.maxRaw : settings.minRaw;
    const int span = maxRaw - minRaw;
    if (span <= 0)
    {
        return clampIntValue(settings.manualRaw, minRaw, maxRaw);
    }

    const uint32_t periodMs = settings.periodMs > 0 ? settings.periodMs : 4000UL;
    const uint32_t phaseOffset = static_cast<uint32_t>(sourceIndex >= 0 ? sourceIndex : 0) * (periodMs / 8UL);
    const uint32_t shifted = (now + phaseOffset) % periodMs;
    const float t = static_cast<float>(shifted) / static_cast<float>(periodMs);
    const String mode = settings.mode;

    if (mode == "manual" || mode == "constant")
    {
        return clampIntValue(settings.manualRaw, minRaw, maxRaw);
    }

    if (mode == "ramp")
    {
        return minRaw + static_cast<int>(roundf(static_cast<float>(span) * t));
    }

    float triangle = t < 0.5f ? (t * 2.0f) : (2.0f - t * 2.0f);
    return minRaw + static_cast<int>(roundf(static_cast<float>(span) * triangle));
}

}  // namespace

#endif  // FEATURE_COMMS

CommsRegistry gComms;

const ExternalResourceConfig* findExternalResourceConfig(const String &resourceId)
{
    if (gConfig.externalResources == nullptr)
    {
        return nullptr;
    }

    for (int i = 0; i < gConfig.externalResourceCount; i++)
    {
        if (gConfig.externalResources[i].id == resourceId)
        {
            return &gConfig.externalResources[i];
        }
    }

    return nullptr;
}

bool externalResourceSupportsType(const ExternalResourceConfig &resource, ChannelType type)
{
    return resource.capability == type;
}

CommsRegistry::CommsRegistry()
    : busStates(nullptr), busCount(0), deviceStates(nullptr), deviceCount(0),
      virtualAiSettings(nullptr),
      externalResourceStates(nullptr), externalResourceCount(0)
{
}

void CommsRegistry::reset()
{
#if FEATURE_COMMS
    delete[] busStates;
    busStates = nullptr;
    busCount = 0;

    delete[] deviceStates;
    deviceStates = nullptr;
    deviceCount = 0;

    delete[] virtualAiSettings;
    virtualAiSettings = nullptr;

    delete[] externalResourceStates;
    externalResourceStates = nullptr;
    externalResourceCount = 0;
#else
    busStates = nullptr;
    busCount = 0;
    deviceStates = nullptr;
    deviceCount = 0;
    virtualAiSettings = nullptr;
    externalResourceStates = nullptr;
    externalResourceCount = 0;
#endif
}

bool CommsRegistry::configureFromConfig(String &errorMessage)
{
#if FEATURE_COMMS
    errorMessage = "";
    reset();

    if (gConfig.busCount > 0)
    {
        busStates = new BusRuntimeState[gConfig.busCount];
        if (busStates == nullptr)
        {
            errorMessage = "Failed to allocate bus runtime states";
            return false;
        }
        busCount = gConfig.busCount;

        for (int i = 0; i < busCount; i++)
        {
            const BusConfig &bus = gConfig.buses[i];
            BusRuntimeState &state = busStates[i];
            state.lastError = "";
            state.initialized = false;

            if (!bus.enabled)
            {
                state.status = "disabled";
                continue;
            }

            if (bus.type == BusType::I2C)
            {
                state.initialized = bus.id == findPrimaryI2cBusId();
                state.status = state.initialized ? "configured" : "inactive_bus";
                if (!state.initialized)
                {
                    state.lastError = "Only the primary I2C bus is active in v1";
                }
                continue;
            }

            if (bus.type == BusType::UART || bus.type == BusType::RS485)
            {
#if FEATURE_MODBUS
                state.initialized = bus.id == findPrimarySerialBusId();
                state.status = state.initialized ? "configured" : "inactive_bus";
                if (!state.initialized)
                {
                    state.lastError = "Only the primary UART/RS485 bus is active in v1";
                    continue;
                }

                gModbusSerial.begin(bus.baud > 0 ? bus.baud : 9600UL, serialConfigForBus(bus), bus.rx, bus.tx);
                if (bus.type == BusType::RS485 && bus.dePin >= 0)
                {
                    pinMode(bus.dePin, OUTPUT);
                    digitalWrite(bus.dePin, LOW);
                }
                continue;
#else
                state.initialized = false;
                state.status = "feature_disabled";
                state.lastError = "UART/RS485 comms disabled at build time";
                continue;
#endif
            }

            state.initialized = true;
            state.status = "configured";
        }
    }

    if (gConfig.deviceCount > 0)
    {
        deviceStates = new DeviceRuntimeState[gConfig.deviceCount];
        if (deviceStates == nullptr)
        {
            errorMessage = "Failed to allocate device runtime states";
            reset();
            return false;
        }
        deviceCount = gConfig.deviceCount;
        virtualAiSettings = new VirtualAiDeviceSettings[gConfig.deviceCount];
        if (virtualAiSettings == nullptr)
        {
            errorMessage = "Failed to allocate virtual device settings";
            reset();
            return false;
        }

        JsonDocument configDoc;
        const bool haveConfigDoc = loadDeviceConfigDocument(configDoc);
        JsonObject configDevices = haveConfigDoc ? configDoc["devices"].as<JsonObject>() : JsonObject();

        for (int i = 0; i < deviceCount; i++)
        {
            const DeviceConfig &device = gConfig.devices[i];
            DeviceRuntimeState &state = deviceStates[i];
            VirtualAiDeviceSettings &virtualSettings = virtualAiSettings[i];
            loadVirtualAiDefaults(virtualSettings);

            if (!configDevices.isNull())
            {
                JsonObject configDevice = configDevices[device.id].as<JsonObject>();
                if (!configDevice.isNull())
                {
                    virtualSettings.mode = configDevice["virtual_mode"] | virtualSettings.mode;
                    virtualSettings.minRaw = configDevice["virtual_min_raw"] | virtualSettings.minRaw;
                    virtualSettings.maxRaw = configDevice["virtual_max_raw"] | virtualSettings.maxRaw;
                    virtualSettings.manualRaw = configDevice["virtual_manual_raw"] | virtualSettings.manualRaw;
                    virtualSettings.periodMs = configDevice["virtual_period_ms"] | virtualSettings.periodMs;
                }
            }

            state.online = false;
            state.lastOkMs = 0;
            state.lastPollMs = 0;
            state.errorCount = 0;

            if (!device.enabled)
            {
                state.status = "disabled";
                continue;
            }

            int busIndex = findBusIndex(device.busId);
            if (busIndex < 0)
            {
                state.status = "missing_bus";
                continue;
            }

            if (!busStates[busIndex].initialized)
            {
                state.status = "bus_unavailable";
                continue;
            }

            state.status = "configured";
        }
    }

    if (gConfig.externalResourceCount > 0)
    {
        externalResourceStates = new ExternalResourceRuntimeState[gConfig.externalResourceCount];
        if (externalResourceStates == nullptr)
        {
            errorMessage = "Failed to allocate external resource runtime states";
            reset();
            return false;
        }
        externalResourceCount = gConfig.externalResourceCount;

        for (int i = 0; i < externalResourceCount; i++)
        {
            const ExternalResourceConfig &resource = gConfig.externalResources[i];
            ExternalResourceRuntimeState &state = externalResourceStates[i];
            state.timestampMs = 0;
            state.analogRaw = 0;
            state.digitalValue = false;

            int deviceIndex = findDeviceIndex(resource.deviceId);
            if (deviceIndex < 0)
            {
            state.online = false;
            state.quality = "fault";
            state.status = "missing_device";
            continue;
        }

        const DeviceRuntimeState &deviceState = deviceStates[deviceIndex];
        state.online = deviceState.status == "configured" || deviceState.online;
        state.quality = state.online ? "stale" : "fault";
        state.status = state.online ? "configured" : deviceState.status;
        if (resource.kind == "analog_out" && resource.capability == ChannelType::AO && state.online)
        {
            state.quality = "good";
            state.status = "ready";
        }
    }
}

    return true;
#else
    errorMessage = "";
    reset();
    return true;
#endif
}

void CommsRegistry::update()
{
#if FEATURE_COMMS
    const uint32_t now = millis();

    for (int deviceIndex = 0; deviceIndex < deviceCount; deviceIndex++)
    {
        const DeviceConfig &device = gConfig.devices[deviceIndex];
        DeviceRuntimeState &deviceState = deviceStates[deviceIndex];

        if (!device.enabled)
        {
            deviceState.online = false;
            deviceState.status = "disabled";
            continue;
        }

        const int busIndex = findBusIndex(device.busId);
        if (busIndex < 0)
        {
            deviceState.online = false;
            deviceState.status = "missing_bus";
            continue;
        }

        const BusConfig &bus = gConfig.buses[busIndex];
        const BusRuntimeState &busState = busStates[busIndex];
        if (!busState.initialized)
        {
            deviceState.online = false;
            deviceState.status = busState.status;
            continue;
        }

        if (deviceState.lastPollMs != 0 && device.pollMs > 0 && (now - deviceState.lastPollMs) < device.pollMs)
        {
            continue;
        }

        deviceState.lastPollMs = now;

        if (device.driver == "virtual_ai")
        {
            bool anyPolled = false;
            for (int resourceIndex = 0; resourceIndex < externalResourceCount; resourceIndex++)
            {
                const ExternalResourceConfig &resource = gConfig.externalResources[resourceIndex];
                if (resource.deviceId != device.id)
                {
                    continue;
                }

                ExternalResourceRuntimeState &resourceState = externalResourceStates[resourceIndex];
                resourceState.online = false;

                if (resource.kind != "analog_in" || resource.capability != ChannelType::AI)
                {
                    resourceState.quality = "fault";
                    resourceState.status = "unsupported_resource";
                    continue;
                }

                anyPolled = true;
                resourceState.online = true;
                resourceState.quality = "good";
                resourceState.status = "good";
                resourceState.timestampMs = now;
                resourceState.analogRaw = virtualAiValueFor(virtualAiSettings[deviceIndex], now, resource.sourceIndex);
            }

            if (!anyPolled)
            {
                deviceState.online = false;
                deviceState.status = "no_resources";
                continue;
            }

            deviceState.online = true;
            deviceState.lastOkMs = now;
            deviceState.status = "online";
            continue;
        }

        if (device.driver == "mcp4728")
        {
            bool anyResource = false;
            bool hadError = false;

            for (int resourceIndex = 0; resourceIndex < externalResourceCount; resourceIndex++)
            {
                const ExternalResourceConfig &resource = gConfig.externalResources[resourceIndex];
                if (resource.deviceId != device.id)
                {
                    continue;
                }

                ExternalResourceRuntimeState &resourceState = externalResourceStates[resourceIndex];
                resourceState.online = false;

                if (resource.kind != "analog_out" || resource.capability != ChannelType::AO)
                {
                    resourceState.quality = "fault";
                    resourceState.status = "unsupported_resource";
                    hadError = true;
                    continue;
                }

                if (resource.sourceIndex < 0 || resource.sourceIndex > 3)
                {
                    resourceState.quality = "fault";
                    resourceState.status = "invalid_channel";
                    hadError = true;
                    continue;
                }

                anyResource = true;
                resourceState.online = true;
                if (resourceState.timestampMs == 0)
                {
                    resourceState.quality = "good";
                    resourceState.status = "ready";
                }
            }

            if (!anyResource)
            {
                deviceState.online = false;
                deviceState.status = "no_resources";
                continue;
            }

            deviceState.online = true;
            if (deviceState.lastOkMs == 0)
            {
                deviceState.lastOkMs = now;
            }
            deviceState.status = hadError ? "partial_error" : "ready";
            continue;
        }

        if (device.driver == "modbus_rtu")
        {
#if FEATURE_MODBUS
            if (bus.type != BusType::UART && bus.type != BusType::RS485)
            {
                deviceState.online = false;
                deviceState.status = "unsupported_bus";
                continue;
            }

            bool anyResource = false;
            bool anySuccess = false;
            bool hadError = false;

            for (int resourceIndex = 0; resourceIndex < externalResourceCount; resourceIndex++)
            {
                const ExternalResourceConfig &resource = gConfig.externalResources[resourceIndex];
                if (resource.deviceId != device.id)
                {
                    continue;
                }

                anyResource = true;
                ExternalResourceRuntimeState &resourceState = externalResourceStates[resourceIndex];
                resourceState.online = false;

                if (resource.sourceIndex < 0 || resource.sourceIndex > 65535)
                {
                    resourceState.quality = "fault";
                    resourceState.status = "invalid_address";
                    hadError = true;
                    continue;
                }

                bool ok = false;
                uint16_t regValue = 0;
                bool bitValue = false;

                if (resource.kind == "register" && resource.capability == ChannelType::AI)
                {
                    ok = modbusReadSingleRegister(bus, static_cast<uint8_t>(device.address & 0xFF),
                                                  MODBUS_FC_READ_INPUT_REGISTERS,
                                                  static_cast<uint16_t>(resource.sourceIndex),
                                                  regValue, device.timeoutMs);
                    if (ok)
                    {
                        resourceState.analogRaw = static_cast<int>(regValue);
                    }
                }
                else if (resource.kind == "register" && resource.capability == ChannelType::AO)
                {
                    ok = modbusReadSingleRegister(bus, static_cast<uint8_t>(device.address & 0xFF),
                                                  MODBUS_FC_READ_HOLDING_REGISTERS,
                                                  static_cast<uint16_t>(resource.sourceIndex),
                                                  regValue, device.timeoutMs);
                    if (ok)
                    {
                        resourceState.analogRaw = static_cast<int>(regValue);
                    }
                }
                else if (resource.kind == "coil" && resource.capability == ChannelType::DI)
                {
                    ok = modbusReadSingleBit(bus, static_cast<uint8_t>(device.address & 0xFF),
                                             MODBUS_FC_READ_DISCRETE_INPUTS,
                                             static_cast<uint16_t>(resource.sourceIndex),
                                             bitValue, device.timeoutMs);
                    if (ok)
                    {
                        resourceState.digitalValue = bitValue;
                    }
                }
                else if (resource.kind == "coil" && resource.capability == ChannelType::DO)
                {
                    ok = modbusReadSingleBit(bus, static_cast<uint8_t>(device.address & 0xFF),
                                             MODBUS_FC_READ_COILS,
                                             static_cast<uint16_t>(resource.sourceIndex),
                                             bitValue, device.timeoutMs);
                    if (ok)
                    {
                        resourceState.digitalValue = bitValue;
                    }
                }
                else
                {
                    resourceState.quality = "fault";
                    resourceState.status = "unsupported_resource";
                    hadError = true;
                    continue;
                }

                if (ok)
                {
                    resourceState.online = true;
                    resourceState.quality = "good";
                    resourceState.status = "good";
                    resourceState.timestampMs = now;
                    anySuccess = true;
                }
                else
                {
                    resourceState.quality = "comm_loss";
                    resourceState.status = "read_error";
                    hadError = true;
                }
            }

            if (!anyResource)
            {
                deviceState.online = false;
                deviceState.status = "no_resources";
                continue;
            }

            deviceState.online = anySuccess;
            if (anySuccess)
            {
                deviceState.lastOkMs = now;
            }
            else
            {
                deviceState.errorCount++;
            }
            deviceState.status = anySuccess ? (hadError ? "partial_error" : "online") : "timeout";
            continue;
#else
            deviceState.online = false;
            deviceState.status = "feature_disabled";
            continue;
#endif
        }

        if (device.driver != "ads1115")
        {
            deviceState.online = false;
            deviceState.status = "unsupported_driver";
            continue;
        }

        if (bus.type != BusType::I2C)
        {
            deviceState.online = false;
            deviceState.status = "unsupported_bus";
            continue;
        }

        bool anyPolled = false;
        bool anySuccess = false;
        bool hadError = false;

        for (int resourceIndex = 0; resourceIndex < externalResourceCount; resourceIndex++)
        {
            const ExternalResourceConfig &resource = gConfig.externalResources[resourceIndex];
            if (resource.deviceId != device.id)
            {
                continue;
            }

            ExternalResourceRuntimeState &resourceState = externalResourceStates[resourceIndex];
            resourceState.online = false;

            if (resource.kind != "analog_in" || resource.capability != ChannelType::AI)
            {
                resourceState.quality = "fault";
                resourceState.status = "unsupported_resource";
                hadError = true;
                continue;
            }

            if (resource.sourceIndex < 0 || resource.sourceIndex > 3)
            {
                resourceState.quality = "fault";
                resourceState.status = "invalid_channel";
                hadError = true;
                continue;
            }

            anyPolled = true;
            int rawValue = 0;
            if (!ads1115ReadSingleEndedRaw(static_cast<uint8_t>(device.address), resource.sourceIndex, rawValue))
            {
                resourceState.quality = "comm_loss";
                resourceState.status = "comm_error";
                hadError = true;
                continue;
            }

            anySuccess = true;
            resourceState.online = true;
            resourceState.quality = "good";
            resourceState.status = "good";
            resourceState.timestampMs = now;
            resourceState.analogRaw = rawValue;
        }

        if (!anyPolled)
        {
            deviceState.online = false;
            deviceState.status = "no_resources";
            continue;
        }

        if (anySuccess && !hadError)
        {
            deviceState.online = true;
            deviceState.lastOkMs = now;
            deviceState.status = "online";
        }
        else if (anySuccess)
        {
            deviceState.online = true;
            deviceState.lastOkMs = now;
            deviceState.errorCount++;
            deviceState.status = "partial_error";
        }
        else
        {
            deviceState.online = false;
            deviceState.errorCount++;
            deviceState.status = "comm_error";
        }
    }
#endif
}

int CommsRegistry::getBusCount() const
{
#if FEATURE_COMMS
    return busCount;
#else
    return 0;
#endif
}

int CommsRegistry::getDeviceCount() const
{
#if FEATURE_COMMS
    return deviceCount;
#else
    return 0;
#endif
}

int CommsRegistry::getExternalResourceCount() const
{
#if FEATURE_COMMS
    return externalResourceCount;
#else
    return 0;
#endif
}

const BusRuntimeState *CommsRegistry::getBusStateAt(int index) const
{
#if FEATURE_COMMS
    if (index < 0 || index >= busCount || busStates == nullptr)
    {
        return nullptr;
    }
    return &busStates[index];
#else
    (void)index;
    return nullptr;
#endif
}

const DeviceRuntimeState *CommsRegistry::getDeviceStateAt(int index) const
{
#if FEATURE_COMMS
    if (index < 0 || index >= deviceCount || deviceStates == nullptr)
    {
        return nullptr;
    }
    return &deviceStates[index];
#else
    (void)index;
    return nullptr;
#endif
}

const ExternalResourceRuntimeState *CommsRegistry::getExternalResourceStateAt(int index) const
{
#if FEATURE_COMMS
    if (index < 0 || index >= externalResourceCount || externalResourceStates == nullptr)
    {
        return nullptr;
    }
    return &externalResourceStates[index];
#else
    (void)index;
    return nullptr;
#endif
}

int CommsRegistry::findBusIndex(const String &busId) const
{
#if FEATURE_COMMS
    for (int i = 0; i < gConfig.busCount; i++)
    {
        if (gConfig.buses != nullptr && gConfig.buses[i].id == busId)
        {
            return i;
        }
    }
    return -1;
#else
    (void)busId;
    return -1;
#endif
}

int CommsRegistry::findDeviceIndex(const String &deviceId) const
{
#if FEATURE_COMMS
    for (int i = 0; i < gConfig.deviceCount; i++)
    {
        if (gConfig.devices != nullptr && gConfig.devices[i].id == deviceId)
        {
            return i;
        }
    }
    return -1;
#else
    (void)deviceId;
    return -1;
#endif
}

int CommsRegistry::findExternalResourceIndex(const String &resourceId) const
{
#if FEATURE_COMMS
    for (int i = 0; i < gConfig.externalResourceCount; i++)
    {
        if (gConfig.externalResources != nullptr && gConfig.externalResources[i].id == resourceId)
        {
            return i;
        }
    }
    return -1;
#else
    (void)resourceId;
    return -1;
#endif
}

const ExternalResourceRuntimeState *CommsRegistry::findExternalResourceState(const String &resourceId) const
{
    int index = findExternalResourceIndex(resourceId);
    return getExternalResourceStateAt(index);
}

int CommsRegistry::readExternalAnalogRaw(const String &resourceId, int fallback) const
{
#if FEATURE_COMMS
    const ExternalResourceRuntimeState *state = findExternalResourceState(resourceId);
    if (state == nullptr)
    {
        return fallback;
    }

    return state->analogRaw;
#else
    (void)resourceId;
    return fallback;
#endif
}

bool CommsRegistry::readExternalDigitalValue(const String &resourceId, bool fallback) const
{
#if FEATURE_COMMS
    const ExternalResourceRuntimeState *state = findExternalResourceState(resourceId);
    if (state == nullptr)
    {
        return fallback;
    }

    return state->digitalValue;
#else
    (void)resourceId;
    return fallback;
#endif
}

bool CommsRegistry::writeExternalAnalogRaw(const String &resourceId, int rawValue)
{
#if FEATURE_COMMS
    const int resourceIndex = findExternalResourceIndex(resourceId);
    if (resourceIndex < 0 || resourceIndex >= externalResourceCount || externalResourceStates == nullptr)
    {
        return false;
    }

    const ExternalResourceConfig &resource = gConfig.externalResources[resourceIndex];
    if (resource.capability != ChannelType::AO)
    {
        return false;
    }

    const int deviceIndex = findDeviceIndex(resource.deviceId);
    if (deviceIndex < 0 || deviceIndex >= deviceCount || deviceStates == nullptr)
    {
        return false;
    }

    const DeviceConfig &device = gConfig.devices[deviceIndex];
    DeviceRuntimeState &deviceState = deviceStates[deviceIndex];
    ExternalResourceRuntimeState &resourceState = externalResourceStates[resourceIndex];
    const uint32_t now = millis();

    bool ok = false;
    if (device.driver == "mcp4728")
    {
        const int busIndex = findBusIndex(device.busId);
        if (busIndex >= 0 && busStates != nullptr && busStates[busIndex].initialized && gConfig.buses[busIndex].type == BusType::I2C)
        {
            ok = mcp4728WriteChannelRaw(static_cast<uint8_t>(device.address), resource.sourceIndex, rawValue);
        }
    }
    else if (device.driver == "modbus_rtu")
    {
#if FEATURE_MODBUS
        const int busIndex = findBusIndex(device.busId);
        if (busIndex >= 0 && busStates != nullptr &&
            busStates[busIndex].initialized &&
            (gConfig.buses[busIndex].type == BusType::UART || gConfig.buses[busIndex].type == BusType::RS485) &&
            resource.kind == "register")
        {
            if (rawValue < 0) rawValue = 0;
            if (rawValue > 65535) rawValue = 65535;
            ok = modbusWriteSingleRegister(gConfig.buses[busIndex],
                                           static_cast<uint8_t>(device.address & 0xFF),
                                           static_cast<uint16_t>(resource.sourceIndex),
                                           static_cast<uint16_t>(rawValue),
                                           device.timeoutMs);
        }
#endif
    }

    if (ok)
    {
        resourceState.online = true;
        resourceState.quality = "good";
        resourceState.status = "written";
        resourceState.timestampMs = now;
        resourceState.analogRaw = rawValue;
        deviceState.online = true;
        deviceState.lastOkMs = now;
        deviceState.status = "online";
        return true;
    }

    resourceState.online = false;
    resourceState.quality = "comm_loss";
    resourceState.status = "write_error";
    deviceState.online = false;
    deviceState.errorCount++;
    deviceState.status = "write_error";
    return false;
#else
    (void)resourceId;
    (void)rawValue;
    return false;
#endif
}

bool CommsRegistry::writeExternalDigitalValue(const String &resourceId, bool value)
{
#if FEATURE_COMMS
    const int resourceIndex = findExternalResourceIndex(resourceId);
    if (resourceIndex < 0 || resourceIndex >= externalResourceCount || externalResourceStates == nullptr)
    {
        return false;
    }

    const ExternalResourceConfig &resource = gConfig.externalResources[resourceIndex];
    if (resource.kind != "coil" || resource.capability != ChannelType::DO)
    {
        return false;
    }

    const int deviceIndex = findDeviceIndex(resource.deviceId);
    if (deviceIndex < 0 || deviceIndex >= deviceCount || deviceStates == nullptr)
    {
        return false;
    }

    const DeviceConfig &device = gConfig.devices[deviceIndex];
    DeviceRuntimeState &deviceState = deviceStates[deviceIndex];
    ExternalResourceRuntimeState &resourceState = externalResourceStates[resourceIndex];
    const uint32_t now = millis();

    bool ok = false;
    if (device.driver == "modbus_rtu")
    {
#if FEATURE_MODBUS
        const int busIndex = findBusIndex(device.busId);
        if (busIndex >= 0 && busStates != nullptr &&
            busStates[busIndex].initialized &&
            (gConfig.buses[busIndex].type == BusType::UART || gConfig.buses[busIndex].type == BusType::RS485))
        {
            ok = modbusWriteSingleCoil(gConfig.buses[busIndex],
                                       static_cast<uint8_t>(device.address & 0xFF),
                                       static_cast<uint16_t>(resource.sourceIndex),
                                       value,
                                       device.timeoutMs);
        }
#endif
    }

    if (ok)
    {
        resourceState.online = true;
        resourceState.quality = "good";
        resourceState.status = "written";
        resourceState.timestampMs = now;
        resourceState.digitalValue = value;
        deviceState.online = true;
        deviceState.lastOkMs = now;
        deviceState.status = "online";
        return true;
    }

    resourceState.online = false;
    resourceState.quality = "comm_loss";
    resourceState.status = "write_error";
    deviceState.online = false;
    deviceState.errorCount++;
    deviceState.status = "write_error";
    return false;
#else
    (void)resourceId;
    (void)value;
    return false;
#endif
}
