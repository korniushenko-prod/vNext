#pragma once

#include <map>
#include <string>
#include <vector>

#include "hal/hal_common.hpp"

namespace controller::hal {

struct PulseInputChannelConfig {
  std::string id;
  PulseCount initial_count{0U};
  double initial_frequency_hz{0.0};
  bool resettable{true};
  InputValidity validity{InputValidity::valid};
};

class PulseInputHal {
 public:
  virtual ~PulseInputHal() = default;

  virtual HalStatus initialize() = 0;
  virtual HalResult<PulseCount> get_count(const std::string& input_id) const = 0;
  virtual HalStatus reset_count(const std::string& input_id) = 0;
  virtual HalResult<double> get_frequency_hz(const std::string& input_id) const = 0;
  virtual HalResult<InputValidity> get_validity(const std::string& input_id) const = 0;
};

class MockPulseInputHal final : public PulseInputHal {
 public:
  explicit MockPulseInputHal(std::vector<PulseInputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalResult<PulseCount> get_count(const std::string& input_id) const override;
  HalStatus reset_count(const std::string& input_id) override;
  HalResult<double> get_frequency_hz(const std::string& input_id) const override;
  HalResult<InputValidity> get_validity(const std::string& input_id) const override;

  HalStatus increment_mock_count(const std::string& input_id, PulseCount delta);
  HalStatus set_mock_frequency_hz(const std::string& input_id, double frequency_hz);
  HalStatus set_validity(const std::string& input_id, InputValidity validity);

 private:
  struct ChannelState {
    PulseCount count{0U};
    double frequency_hz{0.0};
    bool resettable{true};
    InputValidity validity{InputValidity::valid};
  };

  ChannelState* find_channel(const std::string& input_id);
  const ChannelState* find_channel(const std::string& input_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

}  // namespace controller::hal
