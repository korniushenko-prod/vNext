#pragma once

#include <cstdint>

namespace controller::templates {

using TemplateTimestampMs = std::uint64_t;

enum class TemplateKind {
  pressure_pump,
  pump_with_flowmeter,
  batch_dosing,
  pid_pressure_pwm_pump,
  pid_flow_pwm_pump,
  compressor_basic,
  burner_supervisory_skeleton,
  incinerator_supervisory_skeleton,
};

enum class TemplateSlotKind {
  signal,
  actuator,
  timer,
  alarm,
};

enum class TemplateParameterType {
  boolean,
  int64,
  float64,
  string,
};

enum class TemplateIssueSeverity {
  info,
  warning,
  error,
};

enum class TemplateErrorCode {
  ok,
  template_unsupported_kind,
  template_invalid_draft,
  template_duplicate_resulting_id,
  template_active_program_present,
  template_apply_failed,
  template_rollback_failed,
  template_invalid_argument,
  template_data_unavailable,
};

bool is_supported_template_kind(TemplateKind kind);
const char* to_string(TemplateKind kind);
const char* to_string(TemplateSlotKind kind);
const char* to_string(TemplateParameterType type);
const char* to_string(TemplateIssueSeverity severity);
const char* to_string(TemplateErrorCode code);

}  // namespace controller::templates
