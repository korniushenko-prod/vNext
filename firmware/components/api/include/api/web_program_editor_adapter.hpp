#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "api/program_editor_api_service.hpp"

namespace controller::api {

struct ProgramEditorIssueViewModel {
  std::string path;
  std::string code;
  std::string severity;
  std::string message;
  bool blocking{true};
};

struct ProgramEditorProgramListItemViewModel {
  std::string id;
  std::string name;
  std::string type;
  bool enabled{false};
  bool active{false};
  bool runtime_editable{true};
  std::string badge;
};

struct ProgramEditorCatalogViewModel {
  std::vector<std::string> signal_options;
  std::vector<std::string> actuator_options;
  std::vector<std::string> timer_options;
  std::vector<std::string> alarm_options;
  std::vector<std::string> program_options;
  std::vector<std::string> writable_virtual_signal_options;
  std::vector<std::string> state_type_options;
  std::vector<std::string> action_kind_options;
  std::vector<std::string> condition_node_kind_options;
};

struct ProgramEditorMetadataViewModel {
  std::string program_id;
  std::string name;
  std::string type;
  bool enabled{false};
  std::string description;
  std::string initial_state_id;
  std::string normal_stop_state_id;
  std::string trip_state_id;
  std::string lockout_state_id;
  std::string start_condition_summary;
  std::string reset_condition_summary;
  bool program_id_read_only{true};
};

struct ProgramEditorActionViewModel {
  std::string id;
  std::string description;
  std::string kind;
  std::string summary;
};

struct ProgramEditorTransitionViewModel {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string target_state_id;
  bool require_min_time_done{false};
  std::string condition_summary;
};

struct ProgramEditorStateListItemViewModel {
  std::string id;
  std::string name;
  std::string state_type;
  bool enabled{true};
  bool selected{false};
  std::string special_role;
  std::size_t transition_count{0U};
};

struct ProgramEditorStateDetailViewModel {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string state_type;
  bool non_skippable{false};
  bool manual_allowed{false};
  std::string min_time_ms;
  std::string max_time_ms;
  std::string timeout_target_state_id;
  std::string guard_fail_target_state_id;
  std::string guard_condition_summary;
  std::vector<ProgramEditorActionViewModel> entry_actions;
  std::vector<ProgramEditorActionViewModel> active_actions;
  std::vector<ProgramEditorActionViewModel> exit_actions;
  std::vector<ProgramEditorTransitionViewModel> transitions;
};

struct ProgramEditorRuntimeTransitionCandidateViewModel {
  std::string transition_id;
  std::string target_state_id;
  bool eligible{false};
  std::string reason;
  bool min_time_satisfied{true};
  std::string effective_result;
};

struct ProgramEditorRuntimePanelViewModel {
  bool active{false};
  bool runtime_editable{true};
  std::string lifecycle;
  std::string current_state;
  std::string previous_state;
  std::uint64_t state_elapsed_ms{0U};
  bool pending_normal_stop{false};
  bool pending_trip{false};
  bool lockout{false};
  std::string last_reason;
  std::string banner;
  std::vector<ProgramEditorRuntimeTransitionCandidateViewModel> transition_candidates;
};

struct ProgramEditorPreviewPanelViewModel {
  bool save_allowed{false};
  bool runtime_editable{true};
  std::vector<std::string> warnings;
  std::vector<std::string> state_summaries;
  std::vector<std::string> transition_summaries;
  std::string special_state_summary;
};

struct ProgramEditorCommandBarViewModel {
  bool can_save{false};
  bool can_delete{false};
  bool can_enable{false};
  bool can_disable{false};
  bool can_refresh{true};
  std::string read_only_banner;
};

struct WebProgramEditorViewModel {
  std::vector<ProgramEditorProgramListItemViewModel> program_list;
  ProgramEditorCatalogViewModel catalog;
  ProgramEditorMetadataViewModel metadata;
  ProgramEditorRuntimePanelViewModel runtime_status;
  std::vector<ProgramEditorStateListItemViewModel> states;
  std::optional<ProgramEditorStateDetailViewModel> selected_state;
  std::vector<ProgramEditorIssueViewModel> issues;
  ProgramEditorPreviewPanelViewModel preview;
  ProgramEditorCommandBarViewModel command_bar;
};

struct ProgramEditorSourceData {
  std::vector<ProgramEditorProgramListItemDto> program_list;
  ProgramEditorCatalogDto catalog;
  ProgramEditorLoadDto editor;
  std::optional<ProgramEditorPreviewDto> preview;
};

template <typename T>
struct ProgramEditorViewResponse {
  bool success{false};
  ProgramEditorUiResultCode code{ProgramEditorUiResultCode::program_editor_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<T> value;
  std::vector<ProgramEditorIssueDto> validation_issues;
};

struct ProgramEditorMutationResponse {
  bool accepted{false};
  ProgramEditorUiResultCode code{ProgramEditorUiResultCode::program_editor_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<WebProgramEditorViewModel> value;
  std::vector<ProgramEditorIssueDto> validation_issues;
};

class WebProgramEditorAdapter {
 public:
  explicit WebProgramEditorAdapter(ProgramEditorApiService& api_service);

  ProgramEditorViewResponse<std::vector<ProgramEditorProgramListItemViewModel>> load_program_list(ApiTimestampMs now_ms) const;
  ProgramEditorViewResponse<WebProgramEditorViewModel> load_program_editor(
      const std::string& program_id,
      ApiTimestampMs now_ms) const;
  ProgramEditorViewResponse<ProgramEditorCatalogViewModel> load_editor_catalog(ApiTimestampMs now_ms) const;
  ProgramEditorViewResponse<WebProgramEditorViewModel> preview_program_edit(
      const ProgramEditorDraftDto& draft,
      ApiTimestampMs now_ms) const;
  ProgramEditorMutationResponse save_program_edit(
      const std::string& program_id,
      const ProgramEditorDraftDto& draft,
      const CommandContext& context);
  ProgramEditorMutationResponse delete_program(const std::string& program_id, const CommandContext& context);
  ProgramEditorMutationResponse enable_program(const std::string& program_id, const CommandContext& context);
  ProgramEditorMutationResponse disable_program(const std::string& program_id, const CommandContext& context);

  static WebProgramEditorViewModel build_view_model(const ProgramEditorSourceData& source);
  static ProgramEditorCatalogViewModel build_catalog_view_model(const ProgramEditorCatalogDto& catalog);
  static std::vector<ProgramEditorProgramListItemViewModel> build_program_list_view_model(
      const std::vector<ProgramEditorProgramListItemDto>& programs);

 private:
  static ProgramEditorViewResponse<WebProgramEditorViewModel> make_error(
      ProgramEditorUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms,
      std::vector<ProgramEditorIssueDto> validation_issues = {});
  static ProgramEditorViewResponse<ProgramEditorCatalogViewModel> make_catalog_error(
      ProgramEditorUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms,
      std::vector<ProgramEditorIssueDto> validation_issues = {});
  static ProgramEditorViewResponse<std::vector<ProgramEditorProgramListItemViewModel>> make_list_error(
      ProgramEditorUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms,
      std::vector<ProgramEditorIssueDto> validation_issues = {});

  ProgramEditorApiService& api_service_;
};

}  // namespace controller::api
