#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "sim/sim_types.hpp"

namespace controller::sim {

struct FirstOrderPressurePlantConfig {
  std::string id{"pressure_plant"};
  std::string pressure_signal_path{"signal.pressure"};
  std::optional<std::string> relay_target_id{"relay.main"};
  std::optional<std::string> pwm_target_id;
  double gain{2.0};
  double decay{0.4};
  double ambient{0.0};
  double max_pressure{10.0};
  double initial_pressure{0.0};
};

class FirstOrderPressurePlant final : public SimComponent {
 public:
  explicit FirstOrderPressurePlant(FirstOrderPressurePlantConfig config = {});

  std::string component_id() const override;
  bool is_initialized() const override;
  SimStatus initialize(SimHarness& harness, SimTimestampMs now_ms) override;
  SimStatus step(SimHarness& harness, SimTimestampMs now_ms, SimDurationMs dt_ms) override;

  double current_pressure() const;

 private:
  FirstOrderPressurePlantConfig config_;
  double pressure_{0.0};
  bool initialized_{false};
};

struct BatchAccumulatorModel {
  double accumulated_units{0.0};
  std::optional<double> target_units;

  void reset(std::optional<double> target = std::nullopt);
  void add_units(double delta_units);
  bool completed() const;
};

struct PulseFlowPlantConfig {
  std::string id{"pulse_flow_plant"};
  std::string pulse_input_id{"pulse.flow1"};
  std::optional<std::string> relay_target_id;
  std::optional<std::string> pwm_target_id{"pwm.main"};
  std::optional<std::string> rate_signal_path{"signal.flow_rate"};
  double max_flow_units_per_sec{1.0};
  double k_factor_pulses_per_unit{10.0};
  double initial_total_units{0.0};
};

class PulseFlowPlant final : public SimComponent {
 public:
  explicit PulseFlowPlant(PulseFlowPlantConfig config = {});

  std::string component_id() const override;
  bool is_initialized() const override;
  SimStatus initialize(SimHarness& harness, SimTimestampMs now_ms) override;
  SimStatus step(SimHarness& harness, SimTimestampMs now_ms, SimDurationMs dt_ms) override;

  double current_rate_units_per_sec() const;
  double total_volume_units() const;
  std::uint64_t total_generated_pulses() const;

 private:
  PulseFlowPlantConfig config_;
  double total_volume_units_{0.0};
  double pulse_remainder_{0.0};
  double current_rate_units_per_sec_{0.0};
  std::uint64_t total_generated_pulses_{0U};
  bool initialized_{false};
};

struct BurnerScenarioPoint {
  SimTimestampMs at_ms{0U};
  std::optional<bool> air_ok;
  std::optional<bool> flame_detected;
  std::optional<double> temp_value;
};

struct BurnerScenarioHarnessConfig {
  std::string id{"burner_harness"};
  std::string air_ok_signal_path{"signal.air_ok"};
  std::string flame_signal_path{"signal.flame"};
  std::optional<std::string> temp_signal_path;
  bool initial_air_ok{false};
  bool initial_flame_detected{false};
  std::optional<double> initial_temp_value;
};

class BurnerScenarioHarness final : public SimComponent {
 public:
  explicit BurnerScenarioHarness(BurnerScenarioHarnessConfig config = {});

  std::string component_id() const override;
  bool is_initialized() const override;
  SimStatus initialize(SimHarness& harness, SimTimestampMs now_ms) override;
  SimStatus step(SimHarness& harness, SimTimestampMs now_ms, SimDurationMs dt_ms) override;

  void add_point(const BurnerScenarioPoint& point);

 private:
  BurnerScenarioHarnessConfig config_;
  std::vector<BurnerScenarioPoint> points_;
  std::size_t next_point_index_{0U};
  bool initialized_{false};
};

struct IncineratorTemperaturePlantConfig {
  std::string id{"incinerator_temp_plant"};
  std::string temperature_signal_path{"signal.chamber_temp"};
  std::string fan_output_id{"pwm.fan"};
  std::string diesel_output_id{"relay.diesel"};
  std::string sludge_output_id{"pwm.valve"};
  double ambient_temperature{25.0};
  double diesel_heat_gain{45.0};
  double sludge_heat_gain{22.0};
  double passive_cooling{0.08};
  double fan_cooling{0.18};
  double max_temperature{900.0};
  double initial_temperature{25.0};
};

class IncineratorTemperaturePlant final : public SimComponent {
 public:
  explicit IncineratorTemperaturePlant(IncineratorTemperaturePlantConfig config = {});

  std::string component_id() const override;
  bool is_initialized() const override;
  SimStatus initialize(SimHarness& harness, SimTimestampMs now_ms) override;
  SimStatus step(SimHarness& harness, SimTimestampMs now_ms, SimDurationMs dt_ms) override;

  double current_temperature() const;

 private:
  IncineratorTemperaturePlantConfig config_;
  double temperature_{25.0};
  bool initialized_{false};
};

}  // namespace controller::sim
