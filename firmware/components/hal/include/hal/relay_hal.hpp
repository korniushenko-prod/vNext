#pragma once

#include <map>
#include <string>
#include <vector>

#include "hal/hal_common.hpp"

namespace controller::hal {

struct RelayChannelConfig {
  std::string id;
  RelayState safe_state{RelayState::off};
  RelayState startup_state{RelayState::off};
};

class RelayHal {
 public:
  virtual ~RelayHal() = default;

  virtual HalStatus initialize() = 0;
  virtual HalStatus set_state(const std::string& relay_id, RelayState state) = 0;
  virtual HalResult<RelayState> get_state(const std::string& relay_id) const = 0;
  virtual HalStatus apply_safe_state(const std::string& relay_id) = 0;
  virtual HalStatus apply_all_safe_states() = 0;
  virtual HalResult<RelayState> get_safe_state(const std::string& relay_id) const = 0;
};

class MockRelayHal final : public RelayHal {
 public:
  explicit MockRelayHal(std::vector<RelayChannelConfig> channels = {});

  HalStatus initialize() override;
  HalStatus set_state(const std::string& relay_id, RelayState state) override;
  HalResult<RelayState> get_state(const std::string& relay_id) const override;
  HalStatus apply_safe_state(const std::string& relay_id) override;
  HalStatus apply_all_safe_states() override;
  HalResult<RelayState> get_safe_state(const std::string& relay_id) const override;

 private:
  struct ChannelState {
    RelayState state{RelayState::off};
    RelayState safe_state{RelayState::off};
    RelayState startup_state{RelayState::off};
  };

  ChannelState* find_channel(const std::string& relay_id);
  const ChannelState* find_channel(const std::string& relay_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

}  // namespace controller::hal
