#pragma once

#include <cstdint>
#include <map>
#include <string>
#include <vector>

#include "hal/hal_common.hpp"

namespace controller::hal {

struct StepperChannelConfig {
  std::string id;
  StepperDirection initial_direction{StepperDirection::forward};
  bool initial_enabled{false};
  bool initial_fault{false};
  StepperStopMode initial_stop_mode{StepperStopMode::hold};
  double initial_step_rate_hz{0.0};
};

class StepperHal {
 public:
  virtual ~StepperHal() = default;

  virtual HalStatus initialize() = 0;
  virtual HalStatus set_enabled(const std::string& stepper_id, bool enabled) = 0;
  virtual HalResult<bool> get_enabled(const std::string& stepper_id) const = 0;
  virtual HalStatus set_direction(const std::string& stepper_id, StepperDirection direction) = 0;
  virtual HalResult<StepperDirection> get_direction(const std::string& stepper_id) const = 0;
  virtual HalStatus set_step_rate_hz(const std::string& stepper_id, double step_rate_hz) = 0;
  virtual HalResult<double> get_step_rate_hz(const std::string& stepper_id) const = 0;
  virtual HalStatus stop(const std::string& stepper_id) = 0;
  virtual HalStatus emergency_stop(const std::string& stepper_id) = 0;
};

class MockStepperHal final : public StepperHal {
 public:
  explicit MockStepperHal(std::vector<StepperChannelConfig> channels = {});

  HalStatus initialize() override;
  HalStatus set_enabled(const std::string& stepper_id, bool enabled) override;
  HalResult<bool> get_enabled(const std::string& stepper_id) const override;
  HalStatus set_direction(const std::string& stepper_id, StepperDirection direction) override;
  HalResult<StepperDirection> get_direction(const std::string& stepper_id) const override;
  HalStatus set_step_rate_hz(const std::string& stepper_id, double step_rate_hz) override;
  HalResult<double> get_step_rate_hz(const std::string& stepper_id) const override;
  HalStatus stop(const std::string& stepper_id) override;
  HalStatus emergency_stop(const std::string& stepper_id) override;

  HalResult<bool> get_fault(const std::string& stepper_id) const;
  HalResult<StepperStopMode> get_last_stop_mode(const std::string& stepper_id) const;

  HalStatus set_fault(const std::string& stepper_id, bool faulted);

 private:
  struct ChannelState {
    StepperDirection direction{StepperDirection::forward};
    bool enabled{false};
    bool faulted{false};
    StepperStopMode last_stop_mode{StepperStopMode::hold};
    double step_rate_hz{0.0};
  };

  ChannelState* find_channel(const std::string& stepper_id);
  const ChannelState* find_channel(const std::string& stepper_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

}  // namespace controller::hal
