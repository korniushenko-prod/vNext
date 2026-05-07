#pragma once

#include <optional>
#include <string>
#include <vector>

#include "api/program_matrix_api_service.hpp"

namespace controller::api {

struct ProgramMatrixProgramListItemViewModel {
  std::string id;
  std::string name;
  std::string type;
  bool enabled{false};
  bool active{false};
  std::string badge;
  std::string current_state_text;
  std::size_t state_count{0U};
  std::size_t actuator_count{0U};
  std::size_t issue_count{0U};
};

struct ProgramMatrixColumnViewModel {
  std::string actuator_id;
  std::string header_label;
  std::string sublabel;
  std::string kind;
  std::string role;
  bool metadata_found{false};
};

struct ProgramMatrixCellViewModel {
  std::string state_id;
  std::string actuator_id;
  std::string label;
  std::string cell_type;
  bool empty{true};
  bool explicit_off{false};
  bool current_row{false};
  std::string warning;
};

struct ProgramMatrixRowViewModel {
  std::string state_id;
  std::string state_name;
  std::string state_type;
  bool currently_active{false};
  bool enabled{true};
  bool non_skippable{false};
  bool manual_allowed{false};
  std::string min_time_ms;
  std::string max_time_ms;
  std::vector<std::string> badges;
  std::vector<ProgramMatrixCellViewModel> cells;
};

struct ProgramMatrixActionViewModel {
  std::string id;
  std::string kind;
  std::string summary;
  std::string reason;
  bool persistent{false};
};

struct ProgramMatrixTransitionViewModel {
  std::string id;
  std::string target_state_id;
  std::string summary;
  bool enabled{true};
};

struct ProgramMatrixStateDetailViewModel {
  std::string state_id;
  std::string state_name;
  std::string state_type;
  std::string badge_line;
  std::string guard_summary;
  std::string timeout_summary;
  std::string guard_fail_summary;
  std::vector<ProgramMatrixActionViewModel> entry_actions;
  std::vector<ProgramMatrixActionViewModel> active_actions;
  std::vector<ProgramMatrixActionViewModel> exit_actions;
  std::vector<ProgramMatrixTransitionViewModel> transitions;
};

struct ProgramMatrixIssueViewModel {
  std::string path;
  std::string code;
  std::string severity;
  std::string message;
  bool blocking{false};
};

struct ProgramMatrixLegendItemViewModel {
  std::string token;
  std::string label;
  std::string description;
};

struct ProgramMatrixRuntimeBannerViewModel {
  std::string code;
  std::string banner;
  bool active{false};
  bool selected_program_active{false};
  std::string active_program_id;
  std::string lifecycle;
  std::string current_state;
  std::string lockout;
  std::string last_reason;
};

struct WebProgramMatrixViewModel {
  std::string result_code;
  std::string message;
  bool has_matrix{false};
  bool has_warnings{false};
  std::string read_only_note;
  std::string matrix_title;
  std::string empty_title;
  std::string empty_message;
  std::vector<ProgramMatrixProgramListItemViewModel> programs;
  ProgramMatrixRuntimeBannerViewModel runtime_summary;
  std::vector<ProgramMatrixColumnViewModel> columns;
  std::vector<ProgramMatrixRowViewModel> rows;
  std::vector<ProgramMatrixIssueViewModel> issues;
  std::vector<ProgramMatrixLegendItemViewModel> legend;
  std::vector<ProgramMatrixStateDetailViewModel> state_details;
  std::optional<ProgramMatrixStateDetailViewModel> selected_state;
};

struct ProgramMatrixSourceData {
  std::vector<ProgramMatrixProgramListItemDto> program_list;
  ProgramMatrixUiStatus status;
  std::optional<ProgramMatrixPayloadDto> payload;
  std::optional<std::string> selected_state_id;
};

template <typename T>
struct ProgramMatrixViewResponse {
  bool success{false};
  ProgramMatrixUiResultCode code{ProgramMatrixUiResultCode::matrix_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<T> value;
};

class WebProgramMatrixAdapter {
 public:
  explicit WebProgramMatrixAdapter(ProgramMatrixApiService& api_service);

  ProgramMatrixViewResponse<std::vector<ProgramMatrixProgramListItemViewModel>> load_program_list(ApiTimestampMs now_ms) const;
  ProgramMatrixViewResponse<WebProgramMatrixViewModel> load_program_matrix(
      const std::string& program_id,
      ApiTimestampMs now_ms) const;
  ProgramMatrixViewResponse<WebProgramMatrixViewModel> load_active_program_matrix(ApiTimestampMs now_ms) const;

  static std::vector<ProgramMatrixProgramListItemViewModel> build_program_list_view_model(
      const std::vector<ProgramMatrixProgramListItemDto>& program_list);
  static WebProgramMatrixViewModel build_view_model(const ProgramMatrixSourceData& source);

 private:
  static ProgramMatrixViewResponse<WebProgramMatrixViewModel> make_view_response(
      const ProgramMatrixSourceData& source,
      ApiTimestampMs now_ms);
  static ProgramMatrixViewResponse<std::vector<ProgramMatrixProgramListItemViewModel>> make_list_response(
      const ProgramMatrixUiStatus& status,
      const std::vector<ProgramMatrixProgramListItemDto>& program_list,
      ApiTimestampMs now_ms);

  ProgramMatrixApiService& api_service_;
};

}  // namespace controller::api
