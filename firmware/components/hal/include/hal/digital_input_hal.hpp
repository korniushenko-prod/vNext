#pragma once

#include <cstdint>
#include <map>
#include <string>
#include <vector>

#include "hal/hal_common.hpp"

namespace controller::hal {

struct DigitalInputChannelConfig {
  std::string id;
  InputPolarity polarity{InputPolarity::active_high};
  std::uint32_t debounce_ms{0U};
  bool initial_raw_state{false};
  InputValidity validity{InputValidity::valid};
};

class DigitalInputHal {
 public:
  virtual ~DigitalInputHal() = default;

  virtual HalStatus initialize() = 0;
  virtual HalResult<bool> read_raw(const std::string& input_id) const = 0;
  virtual HalResult<bool> read_debounced(const std::string& input_id, MonotonicTimeMs now_ms) = 0;
  virtual HalStatus configure_debounce(const std::string& input_id, std::uint32_t debounce_ms) = 0;
  virtual HalStatus configure_polarity(const std::string& input_id, InputPolarity polarity) = 0;
  virtual HalResult<InputValidity> get_validity(const std::string& input_id) const = 0;
};

class MockDigitalInputHal final : public DigitalInputHal {
 public:
  explicit MockDigitalInputHal(std::vector<DigitalInputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalResult<bool> read_raw(const std::string& input_id) const override;
  HalResult<bool> read_debounced(const std::string& input_id, MonotonicTimeMs now_ms) override;
  HalStatus configure_debounce(const std::string& input_id, std::uint32_t debounce_ms) override;
  HalStatus configure_polarity(const std::string& input_id, InputPolarity polarity) override;
  HalResult<InputValidity> get_validity(const std::string& input_id) const override;

  HalStatus set_mock_raw_state(const std::string& input_id, bool raw_state, MonotonicTimeMs now_ms);
  HalStatus set_validity(const std::string& input_id, InputValidity validity);

 private:
  struct ChannelState {
    InputPolarity polarity{InputPolarity::active_high};
    std::uint32_t debounce_ms{0U};
    InputValidity validity{InputValidity::valid};
    bool raw_state{false};
    bool pending_state{false};
    bool debounced_state{false};
    MonotonicTimeMs last_change_ms{0U};
  };

  static bool apply_polarity(bool raw_state, InputPolarity polarity);
  ChannelState* find_channel(const std::string& input_id);
  const ChannelState* find_channel(const std::string& input_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

}  // namespace controller::hal
