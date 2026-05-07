#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "api/program_builder_api_service.hpp"

namespace controller::api {

struct ProgramBuilderSkeletonOptionViewModel {
  std::string kind;
  std::string label;
  std::string description;
  std::string program_type;
  std::size_t required_binding_count{0U};
  std::size_t required_parameter_count{0U};
};

struct ProgramBuilderBindingFieldViewModel {
  std::string slot_name;
  std::string label;
  std::string resource_kind;
  bool required{true};
  std::string description;
  std::string value;
  std::string constraints;
  std::vector<std::string> available_options;
  bool missing{false};
};

struct ProgramBuilderParameterFieldViewModel {
  std::string parameter_name;
  std::string label;
  std::string type;
  bool required{true};
  std::string description;
  std::string value_text;
  std::string range_text;
  bool missing{false};
};

struct ProgramBuilderPreviewStateViewModel {
  std::string state_id;
  std::string state_name;
  std::string type;
  bool non_skippable{false};
  std::string outputs_summary;
};

struct ProgramBuilderIssueViewModel {
  std::string path;
  std::string code;
  std::string severity;
  std::string message;
  bool blocking{true};
};

struct WebProgramBuilderViewModel {
  std::string skeleton_kind;
  std::string skeleton_label;
  std::string program_type;
  bool preview_valid{false};
  bool create_allowed{false};
  bool will_create_disabled{true};
  std::string create_disabled_note;
  std::string advanced_editor_note;
  std::vector<ProgramBuilderSkeletonOptionViewModel> skeleton_options;
  std::vector<ProgramBuilderBindingFieldViewModel> binding_fields;
  std::vector<ProgramBuilderParameterFieldViewModel> parameter_fields;
  std::vector<ProgramBuilderPreviewStateViewModel> preview_states;
  std::vector<std::string> preview_transitions;
  std::vector<std::string> warnings;
  std::vector<ProgramBuilderIssueViewModel> issues;
};

struct ProgramBuilderWizardSourceData {
  ProgramBuilderCatalogDto catalog;
  ProgramBuilderDraftDto draft;
  std::optional<ProgramBuilderPreviewDto> preview;
};

template <typename T>
struct ProgramBuilderViewResponse {
  bool success{false};
  ProgramBuilderUiResultCode code{ProgramBuilderUiResultCode::builder_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<T> value;
  std::vector<ProgramBuilderIssueDto> validation_issues;
};

struct WebProgramBuilderCreateResponse {
  bool accepted{false};
  ProgramBuilderUiResultCode code{ProgramBuilderUiResultCode::builder_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<WebProgramBuilderViewModel> value;
  std::optional<CreatedProgramDto> created_program;
  std::vector<ProgramBuilderIssueDto> validation_issues;
};

class WebProgramBuilderAdapter {
 public:
  explicit WebProgramBuilderAdapter(ProgramBuilderApiService& api_service);

  ProgramBuilderViewResponse<WebProgramBuilderViewModel> load_builder_catalog(ApiTimestampMs now_ms) const;
  ProgramBuilderViewResponse<WebProgramBuilderViewModel> new_draft(
      controller::sequence::ProgramSkeletonKind skeleton_kind,
      ApiTimestampMs now_ms) const;
  ProgramBuilderViewResponse<WebProgramBuilderViewModel> preview_draft(
      const ProgramBuilderDraftDto& draft,
      ApiTimestampMs now_ms) const;
  WebProgramBuilderCreateResponse create_program(const ProgramBuilderDraftDto& draft, const CommandContext& context);

  static WebProgramBuilderViewModel build_view_model(const ProgramBuilderWizardSourceData& source);

 private:
  static ProgramBuilderViewResponse<WebProgramBuilderViewModel> make_error(
      ProgramBuilderUiResultCode code,
      std::string message,
      ApiTimestampMs now_ms,
      std::vector<ProgramBuilderIssueDto> validation_issues = {});

  ProgramBuilderApiService& api_service_;
};

}  // namespace controller::api
