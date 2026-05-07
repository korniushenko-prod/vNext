#include "pid/pid_core.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <string>
#include <utility>

namespace controller::pid {
namespace {

PidConfig default_config() {
  return PidConfig{
      "pid.core",
      "PID Core",
      true,
      0.0,
      0.0,
      0.0,
      1000U,
      PidMode::manual,
      PidDirection::direct,
      0.0,
      100.0,
      -100.0,
      100.0,
      0.0,
      std::nullopt,
      DerivativeMode::on_measurement,
  };
}

bool has_text(const std::string& value) {
  return std::any_of(value.begin(), value.end(), [](unsigned char ch) {
    return !std::isspace(ch);
  });
}

bool is_finite(const double value) {
  return std::isfinite(value);
}

bool is_valid_mode(const PidMode mode) {
  switch (mode) {
    case PidMode::manual:
    case PidMode::auto_mode:
    case PidMode::hold:
      return true;
  }

  return false;
}

bool is_valid_direction(const PidDirection direction) {
  switch (direction) {
    case PidDirection::direct:
    case PidDirection::reverse:
      return true;
  }

  return false;
}

bool is_valid_derivative_mode(const DerivativeMode mode) {
  switch (mode) {
    case DerivativeMode::on_measurement:
      return true;
  }

  return false;
}

double clamp_value(const double value, const double low, const double high) {
  return std::clamp(value, low, high);
}

double sample_time_seconds(const PidConfig& config) {
  return static_cast<double>(config.sample_time_ms) / 1000.0;
}

double direction_error_sign(const PidDirection direction) {
  return direction == PidDirection::direct ? 1.0 : -1.0;
}

double compute_raw_error(const PidConfig& config, const double setpoint, const double process_value) {
  return direction_error_sign(config.direction) * (setpoint - process_value);
}

double compute_effective_error(const PidConfig& config, const double raw_error) {
  return std::abs(raw_error) <= config.deadband ? 0.0 : raw_error;
}

double compute_derivative_term(
    const PidConfig& config,
    const double process_delta,
    const double dt_seconds) {
  if (config.kd == 0.0 || dt_seconds <= 0.0) {
    return 0.0;
  }

  const double measurement_rate = process_delta / dt_seconds;
  return -direction_error_sign(config.direction) * config.kd * measurement_rate;
}

void add_issue(
    PidValidationResult& result,
    const PidStatusCode code,
    std::string field,
    std::string message) {
  result.issues.push_back(PidValidationIssue{code, std::move(field), std::move(message)});
}

}  // namespace

const char* to_string(const PidMode mode) {
  switch (mode) {
    case PidMode::manual:
      return "manual";
    case PidMode::auto_mode:
      return "auto";
    case PidMode::hold:
      return "hold";
  }

  return "unknown";
}

const char* to_string(const PidDirection direction) {
  switch (direction) {
    case PidDirection::direct:
      return "direct";
    case PidDirection::reverse:
      return "reverse";
  }

  return "unknown";
}

const char* to_string(const DerivativeMode mode) {
  switch (mode) {
    case DerivativeMode::on_measurement:
      return "on_measurement";
  }

  return "unknown";
}

const char* to_string(const PidStatusCode code) {
  switch (code) {
    case PidStatusCode::PID_OK:
      return "PID_OK";
    case PidStatusCode::PID_NOT_UPDATED:
      return "PID_NOT_UPDATED";
    case PidStatusCode::PID_INVALID_CONFIG:
      return "PID_INVALID_CONFIG";
    case PidStatusCode::PID_INVALID_ARGUMENT:
      return "PID_INVALID_ARGUMENT";
    case PidStatusCode::PID_INPUT_INVALID:
      return "PID_INPUT_INVALID";
    case PidStatusCode::PID_MODE_UNSUPPORTED:
      return "PID_MODE_UNSUPPORTED";
    case PidStatusCode::PID_NOT_INITIALIZED:
      return "PID_NOT_INITIALIZED";
    case PidStatusCode::PID_INTERNAL_ERROR:
      return "PID_INTERNAL_ERROR";
  }

  return "PID_UNKNOWN";
}

PidValidationResult validate_config(const PidConfig& config) {
  PidValidationResult result{};

  if (!has_text(config.id)) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "id", "PID id must not be empty.");
  }
  if (!has_text(config.name)) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "name", "PID name must not be empty.");
  }
  if (!is_finite(config.kp) || config.kp < 0.0) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "kp", "kp must be finite and greater than or equal to zero.");
  }
  if (!is_finite(config.ki) || config.ki < 0.0) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "ki", "ki must be finite and greater than or equal to zero.");
  }
  if (!is_finite(config.kd) || config.kd < 0.0) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "kd", "kd must be finite and greater than or equal to zero.");
  }
  if (config.sample_time_ms == 0U) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "sample_time_ms", "sample_time_ms must be greater than zero.");
  }
  if (!is_finite(config.output_min) || !is_finite(config.output_max)) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "output_limits", "Output limits must be finite.");
  } else if (config.output_min > config.output_max) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "output_limits", "output_min must be less than or equal to output_max.");
  }
  if (!is_finite(config.integral_min) || !is_finite(config.integral_max)) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "integral_limits", "Integral limits must be finite.");
  } else if (config.integral_min > config.integral_max) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "integral_limits", "integral_min must be less than or equal to integral_max.");
  }
  if (!is_finite(config.deadband) || config.deadband < 0.0) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "deadband", "deadband must be finite and greater than or equal to zero.");
  }
  if (config.manual_output.has_value()) {
    if (!is_finite(*config.manual_output)) {
      add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "manual_output", "manual_output must be finite when provided.");
    } else if (is_finite(config.output_min) && is_finite(config.output_max) &&
               (*config.manual_output < config.output_min || *config.manual_output > config.output_max)) {
      add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "manual_output", "manual_output must stay within output limits.");
    }
  }
  if (!is_valid_mode(config.mode)) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "mode", "mode must be a supported PID mode.");
  }
  if (!is_valid_direction(config.direction)) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "direction", "direction must be a supported PID direction.");
  }
  if (!is_valid_derivative_mode(config.derivative_mode)) {
    add_issue(result, PidStatusCode::PID_INVALID_CONFIG, "derivative_mode", "Only derivative-on-measurement is supported in Stage 16.");
  }

  result.status = result.issues.empty()
                      ? PidStatus::success()
                      : PidStatus::error(PidStatusCode::PID_INVALID_CONFIG, "PID config validation failed.");
  return result;
}

PidCore::PidCore() : config_(default_config()) {
  apply_runtime_defaults();
}

PidCore::PidCore(const PidConfig& config) : PidCore() {
  (void)set_config(config);
}

PidOperationResult PidCore::set_config(const PidConfig& config) {
  const auto validation = validate_config(config);
  if (!validation.ok()) {
    return PidOperationResult{validation.status};
  }

  config_ = config;
  apply_runtime_defaults();
  return PidOperationResult{PidStatus::success()};
}

const PidConfig& PidCore::get_config() const {
  return config_;
}

PidOperationResult PidCore::set_setpoint(const double setpoint) {
  if (!is_finite(setpoint)) {
    return PidOperationResult{PidStatus::error(PidStatusCode::PID_INVALID_ARGUMENT, "setpoint must be finite.")};
  }

  state_.setpoint = setpoint;
  return PidOperationResult{PidStatus::success()};
}

double PidCore::get_setpoint() const {
  return state_.setpoint;
}

PidOperationResult PidCore::set_mode(
    const PidMode mode,
    const PidTimestampMs now_ms,
    const std::optional<double> current_process_value) {
  (void)now_ms;

  if (!is_valid_mode(mode)) {
    return PidOperationResult{PidStatus::error(PidStatusCode::PID_MODE_UNSUPPORTED, "Requested PID mode is not supported.")};
  }
  if (current_process_value.has_value() && !is_finite(*current_process_value)) {
    return PidOperationResult{PidStatus::error(PidStatusCode::PID_INVALID_ARGUMENT, "current_process_value must be finite when provided.")};
  }

  const PidMode previous_mode = state_.mode;
  state_.mode = mode;

  if (mode == PidMode::manual) {
    state_.manual_output = clamp_value(state_.last_output, config_.output_min, config_.output_max);
    pending_bumpless_auto_ = false;
    auto_timing_initialized_ = false;
    return PidOperationResult{PidStatus::success()};
  }

  if (mode == PidMode::hold) {
    pending_bumpless_auto_ = false;
    auto_timing_initialized_ = false;
    return PidOperationResult{PidStatus::success()};
  }

  auto_timing_initialized_ = false;
  if (previous_mode == PidMode::manual || previous_mode == PidMode::hold) {
    const bool has_reference_pv = current_process_value.has_value() || has_process_value_;
    if (!has_reference_pv) {
      pending_bumpless_auto_ = true;
      return PidOperationResult{PidStatus::success()};
    }

    const double reference_pv = current_process_value.value_or(state_.last_process_value);
    const double raw_error = compute_raw_error(config_, state_.setpoint, reference_pv);
    const double effective_error = compute_effective_error(config_, raw_error);
    const double p_term = config_.kp * effective_error;
    const double preserved_output = clamp_value(state_.last_output, config_.output_min, config_.output_max);

    state_.last_process_value = reference_pv;
    state_.raw_error = raw_error;
    state_.effective_error = effective_error;
    state_.p_term = p_term;
    state_.d_term = 0.0;
    state_.i_term = clamp_value(preserved_output - p_term, config_.integral_min, config_.integral_max);
    state_.last_output = preserved_output;
    state_.saturated_high = preserved_output >= config_.output_max;
    state_.saturated_low = preserved_output <= config_.output_min;
    state_.initialized = true;
    has_process_value_ = true;
    pending_bumpless_auto_ = false;
  }

  return PidOperationResult{PidStatus::success()};
}

PidMode PidCore::get_mode() const {
  return state_.mode;
}

PidOperationResult PidCore::set_manual_output(const double manual_output) {
  if (!is_finite(manual_output)) {
    return PidOperationResult{PidStatus::error(PidStatusCode::PID_INVALID_ARGUMENT, "manual_output must be finite.")};
  }

  state_.manual_output = clamp_value(manual_output, config_.output_min, config_.output_max);
  return PidOperationResult{PidStatus::success()};
}

double PidCore::get_manual_output() const {
  return state_.manual_output;
}

PidComputeResult PidCore::compute(const double process_value, const PidTimestampMs now_ms) {
  if (!is_finite(process_value)) {
    return PidComputeResult{
        PidStatus::error(PidStatusCode::PID_INPUT_INVALID, "process_value must be finite."),
        make_snapshot(),
    };
  }

  if (state_.initialized && now_ms < state_.last_compute_ms) {
    return PidComputeResult{
        PidStatus::error(PidStatusCode::PID_INVALID_ARGUMENT, "now_ms must be monotonic."),
        make_snapshot(),
    };
  }

  if (state_.mode == PidMode::hold) {
    return PidComputeResult{
        PidStatus::error(PidStatusCode::PID_NOT_UPDATED, "PID is in hold mode."),
        make_snapshot(),
    };
  }

  if (state_.mode == PidMode::manual) {
    state_.initialized = true;
    state_.last_compute_ms = now_ms;
    state_.last_process_value = process_value;
    state_.raw_error = compute_raw_error(config_, state_.setpoint, process_value);
    state_.effective_error = compute_effective_error(config_, state_.raw_error);
    state_.last_output = clamp_value(state_.manual_output, config_.output_min, config_.output_max);
    state_.saturated_high = state_.last_output >= config_.output_max;
    state_.saturated_low = state_.last_output <= config_.output_min;
    ++state_.update_counter;
    has_process_value_ = true;
    auto_timing_initialized_ = false;
    pending_bumpless_auto_ = false;
    return PidComputeResult{PidStatus::success(), make_snapshot()};
  }

  const bool first_auto_update = !auto_timing_initialized_;
  if (!first_auto_update) {
    const PidTimestampMs elapsed_ms = now_ms - state_.last_compute_ms;
    if (elapsed_ms < config_.sample_time_ms) {
      return PidComputeResult{
          PidStatus::error(PidStatusCode::PID_NOT_UPDATED, "sample_time_ms has not elapsed."),
          make_snapshot(),
      };
    }
  }

  const double previous_process_value = has_process_value_ ? state_.last_process_value : process_value;
  const double dt_seconds =
      first_auto_update ? sample_time_seconds(config_) : static_cast<double>(now_ms - state_.last_compute_ms) / 1000.0;
  const double process_delta = has_process_value_ ? process_value - previous_process_value : 0.0;

  const double raw_error = compute_raw_error(config_, state_.setpoint, process_value);
  const double effective_error = compute_effective_error(config_, raw_error);
  const double p_term = config_.kp * effective_error;

  double candidate_i_term = state_.i_term;
  if (pending_bumpless_auto_) {
    candidate_i_term = clamp_value(state_.last_output - p_term, config_.integral_min, config_.integral_max);
    pending_bumpless_auto_ = false;
  } else if (effective_error != 0.0) {
    candidate_i_term += config_.ki * effective_error * dt_seconds;
    candidate_i_term = clamp_value(candidate_i_term, config_.integral_min, config_.integral_max);
  }

  const double d_term = compute_derivative_term(config_, process_delta, dt_seconds);

  double unclamped_output = p_term + candidate_i_term + d_term;
  bool saturated_high = unclamped_output > config_.output_max;
  bool saturated_low = unclamped_output < config_.output_min;

  if (saturated_high && effective_error > 0.0) {
    candidate_i_term = clamp_value(
        std::min(candidate_i_term, config_.output_max - p_term - d_term),
        config_.integral_min,
        config_.integral_max);
    unclamped_output = p_term + candidate_i_term + d_term;
    saturated_high = unclamped_output > config_.output_max;
  } else if (saturated_low && effective_error < 0.0) {
    candidate_i_term = clamp_value(
        std::max(candidate_i_term, config_.output_min - p_term - d_term),
        config_.integral_min,
        config_.integral_max);
    unclamped_output = p_term + candidate_i_term + d_term;
    saturated_low = unclamped_output < config_.output_min;
  }

  const double output = clamp_value(unclamped_output, config_.output_min, config_.output_max);

  state_.initialized = true;
  state_.last_compute_ms = now_ms;
  state_.last_process_value = process_value;
  state_.raw_error = raw_error;
  state_.effective_error = effective_error;
  state_.last_output = output;
  state_.p_term = p_term;
  state_.i_term = candidate_i_term;
  state_.d_term = d_term;
  state_.saturated_high = output >= config_.output_max || saturated_high;
  state_.saturated_low = output <= config_.output_min || saturated_low;
  ++state_.update_counter;
  has_process_value_ = true;
  auto_timing_initialized_ = true;

  return PidComputeResult{PidStatus::success(), make_snapshot()};
}

void PidCore::reset() {
  apply_runtime_defaults();
}

void PidCore::reset_integral() {
  state_.i_term = clamp_value(0.0, config_.integral_min, config_.integral_max);
}

PidOperationResult PidCore::set_output_limits(const double output_min, const double output_max) {
  if (!is_finite(output_min) || !is_finite(output_max) || output_min > output_max) {
    return PidOperationResult{PidStatus::error(PidStatusCode::PID_INVALID_ARGUMENT, "Output limits must be finite and ordered.")};
  }

  config_.output_min = output_min;
  config_.output_max = output_max;
  if (config_.manual_output.has_value()) {
    config_.manual_output = clamp_value(*config_.manual_output, output_min, output_max);
  }
  state_.manual_output = clamp_value(state_.manual_output, output_min, output_max);
  state_.last_output = clamp_value(state_.last_output, output_min, output_max);
  state_.saturated_high = state_.last_output >= config_.output_max;
  state_.saturated_low = state_.last_output <= config_.output_min;
  return PidOperationResult{PidStatus::success()};
}

PidOperationResult PidCore::set_integral_limits(const double integral_min, const double integral_max) {
  if (!is_finite(integral_min) || !is_finite(integral_max) || integral_min > integral_max) {
    return PidOperationResult{PidStatus::error(PidStatusCode::PID_INVALID_ARGUMENT, "Integral limits must be finite and ordered.")};
  }

  config_.integral_min = integral_min;
  config_.integral_max = integral_max;
  state_.i_term = clamp_value(state_.i_term, integral_min, integral_max);
  return PidOperationResult{PidStatus::success()};
}

PidSnapshot PidCore::get_snapshot() const {
  return make_snapshot();
}

void PidCore::apply_runtime_defaults() {
  state_ = RuntimeState{};
  state_.mode = config_.mode;
  state_.manual_output = clamp_value(config_.manual_output.value_or(config_.output_min), config_.output_min, config_.output_max);
  state_.last_output = clamp_value(state_.manual_output, config_.output_min, config_.output_max);
  state_.i_term = clamp_value(0.0, config_.integral_min, config_.integral_max);
  has_process_value_ = false;
  auto_timing_initialized_ = false;
  pending_bumpless_auto_ = false;
}

PidSnapshot PidCore::make_snapshot() const {
  return PidSnapshot{
      config_.id,
      config_.name,
      state_.mode,
      config_.direction,
      state_.setpoint,
      state_.last_process_value,
      state_.raw_error,
      state_.effective_error,
      state_.last_output,
      state_.manual_output,
      state_.p_term,
      state_.i_term,
      state_.d_term,
      state_.saturated_high,
      state_.saturated_low,
      state_.initialized,
      state_.last_compute_ms,
      state_.update_counter,
  };
}

}  // namespace controller::pid
