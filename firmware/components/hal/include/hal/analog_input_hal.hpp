#pragma once

#include <map>
#include <string>
#include <vector>

#include "hal/hal_common.hpp"

namespace controller::hal {

struct AnalogInputChannelConfig {
  std::string id;
  AnalogScaling scaling{};
  bool clamp_enabled{false};
  AnalogRawValue initial_raw_value{0};
  InputValidity validity{InputValidity::valid};
};

class AnalogInputHal {
 public:
  virtual ~AnalogInputHal() = default;

  virtual HalStatus initialize() = 0;
  virtual HalResult<AnalogRawValue> read_raw(const std::string& input_id) const = 0;
  virtual HalResult<AnalogEngineeringValue> read_scaled(const std::string& input_id) const = 0;
  virtual HalStatus configure_scaling(
      const std::string& input_id,
      AnalogRawValue raw_min,
      AnalogRawValue raw_max,
      AnalogEngineeringValue engineering_min,
      AnalogEngineeringValue engineering_max) = 0;
  virtual HalStatus configure_clamp(const std::string& input_id, bool enabled) = 0;
  virtual HalResult<InputValidity> get_validity(const std::string& input_id) const = 0;
};

class MockAnalogInputHal final : public AnalogInputHal {
 public:
  explicit MockAnalogInputHal(std::vector<AnalogInputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalResult<AnalogRawValue> read_raw(const std::string& input_id) const override;
  HalResult<AnalogEngineeringValue> read_scaled(const std::string& input_id) const override;
  HalStatus configure_scaling(
      const std::string& input_id,
      AnalogRawValue raw_min,
      AnalogRawValue raw_max,
      AnalogEngineeringValue engineering_min,
      AnalogEngineeringValue engineering_max) override;
  HalStatus configure_clamp(const std::string& input_id, bool enabled) override;
  HalResult<InputValidity> get_validity(const std::string& input_id) const override;

  HalStatus set_mock_raw_value(const std::string& input_id, AnalogRawValue raw_value);
  HalStatus set_validity(const std::string& input_id, InputValidity validity);

 private:
  struct ChannelState {
    AnalogScaling scaling{};
    bool clamp_enabled{false};
    AnalogRawValue raw_value{0};
    InputValidity validity{InputValidity::valid};
  };

  static HalStatus validate_scaling(
      AnalogRawValue raw_min,
      AnalogRawValue raw_max,
      AnalogEngineeringValue engineering_min,
      AnalogEngineeringValue engineering_max);
  static AnalogEngineeringValue scale_value(
      AnalogRawValue raw_value,
      const AnalogScaling& scaling,
      bool clamp_enabled);
  ChannelState* find_channel(const std::string& input_id);
  const ChannelState* find_channel(const std::string& input_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

}  // namespace controller::hal
