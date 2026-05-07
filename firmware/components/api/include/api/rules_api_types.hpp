#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "api/api_types.hpp"
#include "conditions/condition_trace.hpp"
#include "logic/rule_descriptor.hpp"
#include "logic/rule_snapshot.hpp"
#include "sequence/sequence_program.hpp"
#include "signals/signal_descriptor.hpp"

namespace controller::api {

enum class RulesUiResultCode {
  rules_ui_ok,
  rules_ui_rule_not_found,
  rules_ui_save_denied,
  rules_ui_delete_denied,
  rules_ui_enable_denied,
  rules_ui_disable_denied,
  rules_ui_invalid_argument,
  rules_ui_validation_failed,
  rules_ui_data_unavailable,
};

const char* to_string(RulesUiResultCode code);

using RuleDescriptorDraftDto = controller::logic::RuleDescriptor;

struct RuleValidationIssueDto {
  std::string path;
  std::string code;
  std::string message;
};

struct RulesUiStatus {
  RulesUiResultCode code{RulesUiResultCode::rules_ui_ok};
  std::string message;
  std::vector<RuleValidationIssueDto> validation_issues;

  bool ok() const {
    return code == RulesUiResultCode::rules_ui_ok;
  }

  static RulesUiStatus success(std::string detail = {}) {
    return RulesUiStatus{RulesUiResultCode::rules_ui_ok, std::move(detail), {}};
  }

  static RulesUiStatus error(
      RulesUiResultCode error_code,
      std::string detail,
      std::vector<RuleValidationIssueDto> issues = {}) {
    return RulesUiStatus{error_code, std::move(detail), std::move(issues)};
  }
};

template <typename T>
struct RulesUiResult {
  RulesUiStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct RuleCardDto {
  std::string id;
  std::string name;
  bool enabled{true};
  bool active{false};
  std::string status;
  std::uint64_t activation_count{0U};
  std::uint64_t last_transition_ms{0U};
  std::string last_reason;
  std::optional<std::string> last_error;
  std::string if_summary;
  std::string then_summary;
  std::optional<std::string> else_summary;
};

struct RuleMetadataDto {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string description;
};

struct RuleRuntimeStatusDto {
  bool enabled{true};
  bool active{false};
  std::string status;
  std::uint64_t activation_count{0U};
  std::uint64_t last_transition_ms{0U};
  std::string last_reason;
  std::optional<std::string> last_error;
};

struct RuleDetailDto {
  RuleMetadataDto metadata;
  RuleDescriptorDraftDto draft;
  RuleRuntimeStatusDto current_status;
  std::vector<controller::conditions::ConditionTraceEntry> current_condition_trace;
  std::string if_summary;
  std::string then_summary;
  std::optional<std::string> else_summary;
  std::vector<RuleValidationIssueDto> validation_issues;
};

struct RuleSignalCatalogEntryDto {
  std::string path;
  std::string name;
  controller::signals::SignalType type{controller::signals::SignalType::boolean};
  std::string unit;
  std::string source_module;
  controller::signals::SignalAccessMode access_mode{controller::signals::SignalAccessMode::read_only};
};

struct RuleActuatorCatalogEntryDto {
  std::string id;
  controller::actuators::ActuatorTargetKind kind{controller::actuators::ActuatorTargetKind::relay};
  controller::actuators::ActuatorRole role{controller::actuators::ActuatorRole::generic};
};

struct RuleTimerCatalogEntryDto {
  std::string id;
  std::string name;
};

struct RuleAlarmCatalogEntryDto {
  std::string id;
  std::string name;
};

struct RuleProgramCatalogEntryDto {
  std::string id;
  std::string name;
  controller::sequence::SequenceProgramType type{controller::sequence::SequenceProgramType::generic};
  bool enabled{true};
};

struct RuleEditorCatalogDto {
  std::vector<RuleSignalCatalogEntryDto> signals;
  std::vector<RuleActuatorCatalogEntryDto> relay_targets;
  std::vector<RuleActuatorCatalogEntryDto> pwm_targets;
  std::vector<RuleTimerCatalogEntryDto> timers;
  std::vector<RuleAlarmCatalogEntryDto> alarms;
  std::vector<RuleProgramCatalogEntryDto> programs;
  std::vector<RuleSignalCatalogEntryDto> writable_virtual_signals;
};

struct RulesMutationResult {
  bool accepted{false};
  RulesUiStatus status{};
  std::optional<std::string> rule_id;
  std::optional<RuleDetailDto> detail;
};

}  // namespace controller::api
