#pragma once

#include <map>
#include <string>
#include <vector>

#include "hal/hal_common.hpp"

namespace controller::hal {

struct PwmLimits {
  PwmDutyPercent duty_min{0.0};
  PwmDutyPercent duty_max{100.0};
  PwmDutyPercent duty_safe{0.0};
};

struct PwmOutputChannelConfig {
  std::string id;
  PwmLimits limits{};
  PwmDutyPercent initial_duty{0.0};
  bool initial_enabled{false};
  bool faulted{false};
};

class PwmHal {
 public:
  virtual ~PwmHal() = default;

  virtual HalStatus initialize() = 0;
  virtual HalStatus set_duty_percent(const std::string& output_id, PwmDutyPercent duty_percent) = 0;
  virtual HalResult<PwmDutyPercent> get_duty_percent(const std::string& output_id) const = 0;
  virtual HalStatus set_enabled(const std::string& output_id, bool enabled) = 0;
  virtual HalResult<bool> get_enabled(const std::string& output_id) const = 0;
  virtual HalStatus configure_limits(
      const std::string& output_id,
      PwmDutyPercent duty_min,
      PwmDutyPercent duty_max,
      PwmDutyPercent duty_safe) = 0;
  virtual HalStatus apply_safe_state(const std::string& output_id) = 0;
};

class MockPwmHal final : public PwmHal {
 public:
  explicit MockPwmHal(std::vector<PwmOutputChannelConfig> channels = {});

  HalStatus initialize() override;
  HalStatus set_duty_percent(const std::string& output_id, PwmDutyPercent duty_percent) override;
  HalResult<PwmDutyPercent> get_duty_percent(const std::string& output_id) const override;
  HalStatus set_enabled(const std::string& output_id, bool enabled) override;
  HalResult<bool> get_enabled(const std::string& output_id) const override;
  HalStatus configure_limits(
      const std::string& output_id,
      PwmDutyPercent duty_min,
      PwmDutyPercent duty_max,
      PwmDutyPercent duty_safe) override;
  HalStatus apply_safe_state(const std::string& output_id) override;

  HalStatus set_fault(const std::string& output_id, bool faulted);
  HalResult<PwmLimits> get_limits(const std::string& output_id) const;

 private:
  struct ChannelState {
    PwmLimits limits{};
    PwmDutyPercent duty_percent{0.0};
    bool enabled{false};
    bool faulted{false};
  };

  static HalStatus validate_limits(
      PwmDutyPercent duty_min,
      PwmDutyPercent duty_max,
      PwmDutyPercent duty_safe);
  static PwmDutyPercent clamp_duty(PwmDutyPercent duty, const PwmLimits& limits);
  ChannelState* find_channel(const std::string& output_id);
  const ChannelState* find_channel(const std::string& output_id) const;

  std::map<std::string, ChannelState> channels_;
  bool initialized_{false};
};

}  // namespace controller::hal
