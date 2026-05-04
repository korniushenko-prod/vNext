#include "config/config_defaults.hpp"

namespace controller::config {

DeviceConfig factory_default_config() {
  DeviceConfig config{};
  config.schema_version = 1;
  config.config_version = 1;

  config.device = DeviceInfoConfig{
      "device_default",
      "ESP32-C3 Relay Controller",
      true,
      "Factory default safe configuration"};

  config.board = BoardConfig{
      "board_default",
      "Unassigned ESP32-C3 Board",
      true,
      "ESP32-C3",
      {},
      {},
      {},
      {},
      {},
      {},
      {}};

  config.relays = {
      RelayConfig{"relay_1", "Relay 1", false, ActuatorRole::generic, SafeState::off, std::nullopt},
      RelayConfig{"relay_2", "Relay 2", false, ActuatorRole::generic, SafeState::off, std::nullopt},
      RelayConfig{"relay_3", "Relay 3", false, ActuatorRole::generic, SafeState::off, std::nullopt},
      RelayConfig{"relay_4", "Relay 4", false, ActuatorRole::generic, SafeState::off, std::nullopt},
  };

  config.network = NetworkConfig{
      "network_default",
      "Local Network",
      true,
      "esp32-c3-controller",
      "",
      "",
      true};

  config.display = DisplayConfig{
      "display_default",
      "Local Display",
      false,
      "none",
      std::nullopt,
      std::nullopt};

  config.storage = StorageConfig{
      "storage_default",
      "Storage",
      true,
      true,
      1000U,
      300U};

  return config;
}

}  // namespace controller::config
