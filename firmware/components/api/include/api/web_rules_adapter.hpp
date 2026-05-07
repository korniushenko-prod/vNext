#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "api/rules_api_service.hpp"

namespace controller::api {

enum class RuleValueEditorKind {
  none,
  boolean_toggle,
  int64_number,
  float64_number,
  string_text,
};

const char* to_string(RuleValueEditorKind kind);

struct WebRulesListViewModel {
  std::vector<RuleCardDto> cards;
  std::size_t total_count{0U};
  std::size_t active_count{0U};
  std::size_t disabled_count{0U};
  std::size_t error_count{0U};
};

struct ConditionBuilderNodeViewModel {
  std::string node_id;
  std::optional<std::string> parent_node_id;
  std::size_t depth{0U};
  std::size_t order_index{0U};
  std::string kind;
  std::string title;
  std::string summary;
  bool supports_children{false};
  bool supports_delay{false};
  bool supports_hysteresis{false};
  std::vector<std::string> child_node_ids;
  std::vector<std::string> allowed_compare_operators;
};

struct ActionEditorItemViewModel {
  std::string id;
  std::string kind;
  std::string summary;
  std::string target_id;
  std::string signal_path;
  std::string timer_id;
  std::string alarm_id;
  std::string program_id;
  RuleValueEditorKind value_editor_kind{RuleValueEditorKind::none};
  bool persistent_output{false};
  bool command_action{false};
};

struct ActionSectionViewModel {
  std::string section;
  std::string heading;
  std::vector<std::string> allowed_action_kinds;
  std::vector<ActionEditorItemViewModel> actions;
};

struct TraceLineViewModel {
  std::string node_id;
  std::string node_kind;
  bool raw_result{false};
  bool effective_result{false};
  std::string error_code;
  std::string reason;
  std::string signal_path;
  std::string value_summary;
};

struct WebRuleEditorCatalogViewModel {
  std::vector<RuleSignalCatalogEntryDto> signals;
  std::vector<RuleActuatorCatalogEntryDto> relay_targets;
  std::vector<RuleActuatorCatalogEntryDto> pwm_targets;
  std::vector<RuleTimerCatalogEntryDto> timers;
  std::vector<RuleAlarmCatalogEntryDto> alarms;
  std::vector<RuleProgramCatalogEntryDto> programs;
  std::vector<RuleSignalCatalogEntryDto> writable_virtual_signals;
};

struct WebRuleDetailViewModel {
  RuleMetadataDto metadata;
  RuleRuntimeStatusDto current_status;
  std::string if_summary;
  std::string then_summary;
  std::optional<std::string> else_summary;
  RuleDescriptorDraftDto draft;
  controller::conditions::ConditionTree condition_tree;
  std::vector<ConditionBuilderNodeViewModel> condition_nodes;
  std::vector<ActionSectionViewModel> action_sections;
  std::vector<TraceLineViewModel> trace_lines;
  std::vector<RuleValidationIssueDto> validation_issues;
  bool can_save{true};
  bool can_delete{true};
  bool can_enable{false};
  bool can_disable{false};
};

template <typename T>
struct RulesViewResponse {
  bool success{false};
  RulesUiResultCode code{RulesUiResultCode::rules_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<T> value;
  std::vector<RuleValidationIssueDto> validation_issues;
};

struct WebRulesCommandResponse {
  bool accepted{false};
  RulesUiResultCode code{RulesUiResultCode::rules_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::vector<RuleValidationIssueDto> validation_issues;
  std::optional<WebRulesListViewModel> list;
  std::optional<WebRuleDetailViewModel> detail;
};

class WebRulesAdapter {
 public:
  explicit WebRulesAdapter(RulesApiService& rules_api_service);

  RulesViewResponse<WebRulesListViewModel> load_rule_list(ApiTimestampMs now_ms) const;
  RulesViewResponse<WebRuleDetailViewModel> load_rule_detail(const std::string& rule_id, ApiTimestampMs now_ms) const;
  RulesViewResponse<WebRuleEditorCatalogViewModel> load_editor_catalog(ApiTimestampMs now_ms) const;

  WebRulesCommandResponse save_rule(
      std::optional<std::string> rule_id,
      const RuleDescriptorDraftDto& draft,
      const CommandContext& context);
  WebRulesCommandResponse delete_rule(const std::string& rule_id, const CommandContext& context);
  WebRulesCommandResponse enable_rule(const std::string& rule_id, const CommandContext& context);
  WebRulesCommandResponse disable_rule(const std::string& rule_id, const CommandContext& context);

  static WebRulesListViewModel build_list_view_model(const std::vector<RuleCardDto>& cards);
  static WebRuleEditorCatalogViewModel build_catalog_view_model(const RuleEditorCatalogDto& catalog);
  static WebRuleDetailViewModel build_detail_view_model(
      const RuleDetailDto& detail,
      const RuleEditorCatalogDto& catalog);

 private:
  static RulesUiResultCode map_result_code(RulesUiResultCode code);
  static RulesViewResponse<WebRulesListViewModel> make_list_error(
      RulesUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms,
      std::vector<RuleValidationIssueDto> validation_issues = {});
  static RulesViewResponse<WebRuleDetailViewModel> make_detail_error(
      RulesUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms,
      std::vector<RuleValidationIssueDto> validation_issues = {});
  static RulesViewResponse<WebRuleEditorCatalogViewModel> make_catalog_error(
      RulesUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms,
      std::vector<RuleValidationIssueDto> validation_issues = {});

  WebRulesCommandResponse build_command_response(
      const RulesMutationResult& result,
      std::optional<std::string> detail_rule_id,
      ApiTimestampMs now_ms);

  RulesApiService& rules_api_service_;
};

}  // namespace controller::api
