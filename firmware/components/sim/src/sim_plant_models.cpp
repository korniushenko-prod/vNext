#include "sim/sim_plant_models.hpp"

#include <algorithm>
#include <cmath>
#include <utility>

#include "signals/signal_descriptor.hpp"
#include "sim/sim_harness.hpp"

namespace controller::sim {

namespace {

controller::signals::SignalDescriptor make_bool_signal_descriptor(
    std::string path,
    std::string name,
    std::string source) {
  return controller::signals::SignalDescriptor{
      std::move(path),
      std::move(name),
      "simulated boolean signal",
      controller::signals::SignalType::boolean,
      "",
      std::move(source),
      controller::signals::SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

controller::signals::SignalDescriptor make_double_signal_descriptor(
    std::string path,
    std::string name,
    std::string source,
    std::string unit = {}) {
  return controller::signals::SignalDescriptor{
      std::move(path),
      std::move(name),
      "simulated numeric signal",
      controller::signals::SignalType::float64,
      std::move(unit),
      std::move(source),
      controller::signals::SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

SimStatus ensure_bool_signal(
    SimHarness& harness,
    const std::string& path,
    const std::string& name,
    const std::string& source,
    const bool initial_value,
    const SimTimestampMs now_ms) {
  if (!harness.registry.has_signal(path)) {
    const auto result = harness.registry.register_signal(
        make_bool_signal_descriptor(path, name, source),
        controller::signals::SignalValue{initial_value},
        now_ms);
    if (!result.ok()) {
      return SimStatus::error(
          SimErrorCode::sim_invalid_configuration,
          "Failed to register simulated signal '" + path + "': " + result.status.message);
    }
  }

  const auto update = harness.registry.update_signal(path, controller::signals::SignalValue{initial_value}, now_ms);
  if (!update.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_service_error,
        "Failed to initialize simulated signal '" + path + "': " + update.status.message);
  }
  return SimStatus::success();
}

SimStatus ensure_double_signal(
    SimHarness& harness,
    const std::string& path,
    const std::string& name,
    const std::string& source,
    const double initial_value,
    const SimTimestampMs now_ms,
    const std::string& unit = {}) {
  if (!harness.registry.has_signal(path)) {
    const auto result = harness.registry.register_signal(
        make_double_signal_descriptor(path, name, source, unit),
        controller::signals::SignalValue{initial_value},
        now_ms);
    if (!result.ok()) {
      return SimStatus::error(
          SimErrorCode::sim_invalid_configuration,
          "Failed to register simulated signal '" + path + "': " + result.status.message);
    }
  }

  const auto update = harness.registry.update_signal(path, controller::signals::SignalValue{initial_value}, now_ms);
  if (!update.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_service_error,
        "Failed to initialize simulated signal '" + path + "': " + update.status.message);
  }
  return SimStatus::success();
}

double seconds_from_ms(const SimDurationMs dt_ms) {
  return static_cast<double>(dt_ms) / 1000.0;
}

}  // namespace

FirstOrderPressurePlant::FirstOrderPressurePlant(FirstOrderPressurePlantConfig config)
    : config_(std::move(config)),
      pressure_(config_.initial_pressure) {}

std::string FirstOrderPressurePlant::component_id() const {
  return config_.id;
}

bool FirstOrderPressurePlant::is_initialized() const {
  return initialized_;
}

SimStatus FirstOrderPressurePlant::initialize(SimHarness& harness, const SimTimestampMs now_ms) {
  pressure_ = std::clamp(config_.initial_pressure, config_.ambient, config_.max_pressure);
  const auto status = ensure_double_signal(
      harness,
      config_.pressure_signal_path,
      config_.pressure_signal_path,
      config_.id,
      pressure_,
      now_ms,
      "bar");
  if (!status.ok()) {
    return status;
  }
  initialized_ = true;
  return SimStatus::success();
}

SimStatus FirstOrderPressurePlant::step(SimHarness& harness, const SimTimestampMs now_ms, const SimDurationMs dt_ms) {
  if (!initialized_) {
    return SimStatus::error(
        SimErrorCode::sim_plant_error,
        "Pressure plant '" + config_.id + "' must be initialized before stepping.");
  }

  const double drive = harness.actuator_drive_fraction(config_.relay_target_id, config_.pwm_target_id);
  const double dt_s = seconds_from_ms(dt_ms);
  pressure_ += drive * config_.gain * dt_s;
  pressure_ -= (pressure_ - config_.ambient) * config_.decay * dt_s;
  pressure_ = std::clamp(pressure_, config_.ambient, config_.max_pressure);

  const auto update = harness.registry.update_signal(config_.pressure_signal_path, controller::signals::SignalValue{pressure_}, now_ms);
  if (!update.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_plant_error,
        "Pressure plant '" + config_.id + "' failed to publish pressure signal: " + update.status.message);
  }
  return SimStatus::success();
}

double FirstOrderPressurePlant::current_pressure() const {
  return pressure_;
}

void BatchAccumulatorModel::reset(const std::optional<double> target) {
  accumulated_units = 0.0;
  target_units = target;
}

void BatchAccumulatorModel::add_units(const double delta_units) {
  accumulated_units += delta_units;
}

bool BatchAccumulatorModel::completed() const {
  return target_units.has_value() && accumulated_units >= *target_units;
}

PulseFlowPlant::PulseFlowPlant(PulseFlowPlantConfig config)
    : config_(std::move(config)),
      total_volume_units_(config_.initial_total_units) {}

std::string PulseFlowPlant::component_id() const {
  return config_.id;
}

bool PulseFlowPlant::is_initialized() const {
  return initialized_;
}

SimStatus PulseFlowPlant::initialize(SimHarness& harness, const SimTimestampMs now_ms) {
  if (config_.k_factor_pulses_per_unit <= 0.0) {
    return SimStatus::error(
        SimErrorCode::sim_invalid_configuration,
        "Pulse flow plant '" + config_.id + "' requires k_factor_pulses_per_unit > 0.");
  }

  total_volume_units_ = config_.initial_total_units;
  pulse_remainder_ = 0.0;
  current_rate_units_per_sec_ = 0.0;
  total_generated_pulses_ = 0U;

  const auto frequency = harness.pulse_input_hal.set_mock_frequency_hz(config_.pulse_input_id, 0.0);
  if (!frequency.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_invalid_configuration,
        "Pulse flow plant '" + config_.id + "' cannot access pulse input '" + config_.pulse_input_id + "': " + frequency.message);
  }

  if (config_.rate_signal_path.has_value()) {
    const auto status = ensure_double_signal(
        harness,
        *config_.rate_signal_path,
        *config_.rate_signal_path,
        config_.id,
        0.0,
        now_ms,
        "L/min");
    if (!status.ok()) {
      return status;
    }
  }

  initialized_ = true;
  return SimStatus::success();
}

SimStatus PulseFlowPlant::step(SimHarness& harness, const SimTimestampMs now_ms, const SimDurationMs dt_ms) {
  if (!initialized_) {
    return SimStatus::error(
        SimErrorCode::sim_plant_error,
        "Pulse flow plant '" + config_.id + "' must be initialized before stepping.");
  }

  const double drive = harness.actuator_drive_fraction(config_.relay_target_id, config_.pwm_target_id);
  const double dt_s = seconds_from_ms(dt_ms);
  current_rate_units_per_sec_ = std::max(0.0, drive) * config_.max_flow_units_per_sec;
  const double volume_delta_units = current_rate_units_per_sec_ * dt_s;
  total_volume_units_ += volume_delta_units;

  const double pulses_exact = volume_delta_units * config_.k_factor_pulses_per_unit + pulse_remainder_;
  const auto delta_pulses = static_cast<std::uint64_t>(std::floor(pulses_exact + 1e-9));
  pulse_remainder_ = pulses_exact - static_cast<double>(delta_pulses);

  if (delta_pulses > 0U) {
    const auto increment = harness.pulse_input_hal.increment_mock_count(config_.pulse_input_id, delta_pulses);
    if (!increment.ok()) {
      return SimStatus::error(
          SimErrorCode::sim_plant_error,
          "Pulse flow plant '" + config_.id + "' failed to increment pulses: " + increment.message);
    }
    total_generated_pulses_ += delta_pulses;
  }

  const double frequency_hz = current_rate_units_per_sec_ * config_.k_factor_pulses_per_unit;
  const auto frequency_status = harness.pulse_input_hal.set_mock_frequency_hz(config_.pulse_input_id, frequency_hz);
  if (!frequency_status.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_plant_error,
        "Pulse flow plant '" + config_.id + "' failed to publish pulse frequency: " + frequency_status.message);
  }

  if (config_.rate_signal_path.has_value()) {
    const auto update = harness.registry.update_signal(
        *config_.rate_signal_path,
        controller::signals::SignalValue{current_rate_units_per_sec_ * 60.0},
        now_ms);
    if (!update.ok()) {
      return SimStatus::error(
          SimErrorCode::sim_plant_error,
          "Pulse flow plant '" + config_.id + "' failed to publish flow-rate signal: " + update.status.message);
    }
  }

  return SimStatus::success();
}

double PulseFlowPlant::current_rate_units_per_sec() const {
  return current_rate_units_per_sec_;
}

double PulseFlowPlant::total_volume_units() const {
  return total_volume_units_;
}

std::uint64_t PulseFlowPlant::total_generated_pulses() const {
  return total_generated_pulses_;
}

BurnerScenarioHarness::BurnerScenarioHarness(BurnerScenarioHarnessConfig config)
    : config_(std::move(config)) {}

std::string BurnerScenarioHarness::component_id() const {
  return config_.id;
}

bool BurnerScenarioHarness::is_initialized() const {
  return initialized_;
}

SimStatus BurnerScenarioHarness::initialize(SimHarness& harness, const SimTimestampMs now_ms) {
  auto status = ensure_bool_signal(
      harness,
      config_.air_ok_signal_path,
      config_.air_ok_signal_path,
      config_.id,
      config_.initial_air_ok,
      now_ms);
  if (!status.ok()) {
    return status;
  }

  status = ensure_bool_signal(
      harness,
      config_.flame_signal_path,
      config_.flame_signal_path,
      config_.id,
      config_.initial_flame_detected,
      now_ms);
  if (!status.ok()) {
    return status;
  }

  if (config_.temp_signal_path.has_value() && config_.initial_temp_value.has_value()) {
    status = ensure_double_signal(
        harness,
        *config_.temp_signal_path,
        *config_.temp_signal_path,
        config_.id,
        *config_.initial_temp_value,
        now_ms,
        "degC");
    if (!status.ok()) {
      return status;
    }
  }

  initialized_ = true;
  return SimStatus::success();
}

SimStatus BurnerScenarioHarness::step(SimHarness& harness, const SimTimestampMs now_ms, const SimDurationMs) {
  if (!initialized_) {
    return SimStatus::error(
        SimErrorCode::sim_plant_error,
        "Burner scenario harness '" + config_.id + "' must be initialized before stepping.");
  }

  while (next_point_index_ < points_.size() && points_[next_point_index_].at_ms <= now_ms) {
    const auto& point = points_[next_point_index_];
    if (point.air_ok.has_value()) {
      const auto update =
          harness.registry.update_signal(config_.air_ok_signal_path, controller::signals::SignalValue{*point.air_ok}, now_ms);
      if (!update.ok()) {
        return SimStatus::error(
            SimErrorCode::sim_plant_error,
            "Burner scenario harness failed to publish air_ok signal: " + update.status.message);
      }
    }
    if (point.flame_detected.has_value()) {
      const auto update = harness.registry.update_signal(
          config_.flame_signal_path,
          controller::signals::SignalValue{*point.flame_detected},
          now_ms);
      if (!update.ok()) {
        return SimStatus::error(
            SimErrorCode::sim_plant_error,
            "Burner scenario harness failed to publish flame signal: " + update.status.message);
      }
    }
    if (point.temp_value.has_value() && config_.temp_signal_path.has_value()) {
      const auto update = harness.registry.update_signal(
          *config_.temp_signal_path,
          controller::signals::SignalValue{*point.temp_value},
          now_ms);
      if (!update.ok()) {
        return SimStatus::error(
            SimErrorCode::sim_plant_error,
            "Burner scenario harness failed to publish temperature signal: " + update.status.message);
      }
    }

    ++next_point_index_;
  }

  return SimStatus::success();
}

void BurnerScenarioHarness::add_point(const BurnerScenarioPoint& point) {
  points_.push_back(point);
  std::sort(points_.begin(), points_.end(), [](const BurnerScenarioPoint& lhs, const BurnerScenarioPoint& rhs) {
    return lhs.at_ms < rhs.at_ms;
  });
}

IncineratorTemperaturePlant::IncineratorTemperaturePlant(IncineratorTemperaturePlantConfig config)
    : config_(std::move(config)),
      temperature_(config_.initial_temperature) {}

std::string IncineratorTemperaturePlant::component_id() const {
  return config_.id;
}

bool IncineratorTemperaturePlant::is_initialized() const {
  return initialized_;
}

SimStatus IncineratorTemperaturePlant::initialize(SimHarness& harness, const SimTimestampMs now_ms) {
  temperature_ = std::clamp(config_.initial_temperature, config_.ambient_temperature, config_.max_temperature);
  const auto status = ensure_double_signal(
      harness,
      config_.temperature_signal_path,
      config_.temperature_signal_path,
      config_.id,
      temperature_,
      now_ms,
      "degC");
  if (!status.ok()) {
    return status;
  }
  initialized_ = true;
  return SimStatus::success();
}

SimStatus IncineratorTemperaturePlant::step(
    SimHarness& harness,
    const SimTimestampMs now_ms,
    const SimDurationMs dt_ms) {
  if (!initialized_) {
    return SimStatus::error(
        SimErrorCode::sim_plant_error,
        "Incinerator temperature plant '" + config_.id + "' must be initialized before stepping.");
  }

  const double dt_s = seconds_from_ms(dt_ms);
  const double diesel_drive = harness.relay_is_on(config_.diesel_output_id) ? 1.0 : 0.0;
  const double sludge_drive = harness.pwm_duty_fraction(config_.sludge_output_id);
  const double fan_drive = harness.pwm_duty_fraction(config_.fan_output_id);

  const double heating =
      (diesel_drive * config_.diesel_heat_gain + sludge_drive * config_.sludge_heat_gain) * dt_s;
  const double cooling =
      ((temperature_ - config_.ambient_temperature) * (config_.passive_cooling + config_.fan_cooling * fan_drive)) * dt_s;

  temperature_ += heating;
  temperature_ -= cooling;
  temperature_ = std::clamp(temperature_, config_.ambient_temperature, config_.max_temperature);

  const auto update =
      harness.registry.update_signal(config_.temperature_signal_path, controller::signals::SignalValue{temperature_}, now_ms);
  if (!update.ok()) {
    return SimStatus::error(
        SimErrorCode::sim_plant_error,
        "Incinerator temperature plant '" + config_.id + "' failed to publish temperature signal: " + update.status.message);
  }
  return SimStatus::success();
}

double IncineratorTemperaturePlant::current_temperature() const {
  return temperature_;
}

}  // namespace controller::sim
