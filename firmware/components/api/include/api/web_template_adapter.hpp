#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "api/template_api_service.hpp"

namespace controller::api {

struct TemplateSelectorOptionViewModel {
  std::string kind;
  std::string label;
  std::string description;
  bool supervisory_only{false};
  std::size_t required_binding_count{0U};
  std::size_t required_parameter_count{0U};
};

struct TemplateBindingFieldViewModel {
  std::string slot_id;
  std::string label;
  std::string slot_kind;
  bool required{true};
  std::string description;
  std::string value;
  std::string constraints;
  bool missing{false};
};

struct TemplateParameterFieldViewModel {
  std::string parameter_id;
  std::string label;
  std::string type;
  bool required{true};
  std::string description;
  std::string value_text;
  bool missing{false};
};

struct TemplateIssueViewModel {
  std::string path;
  std::string code;
  std::string severity;
  std::string message;
};

struct TemplateArtifactPreviewViewModel {
  std::string kind;
  std::string id;
  std::string name;
  std::string detail;
};

struct WebTemplateViewModel {
  std::string selected_kind;
  std::string selected_label;
  std::string description;
  bool supervisory_only{false};
  bool preview_valid{false};
  bool apply_allowed{false};
  bool will_create_disabled{true};
  std::string disabled_note;
  std::string supervisory_note;
  std::vector<TemplateSelectorOptionViewModel> templates;
  std::vector<TemplateBindingFieldViewModel> binding_fields;
  std::vector<TemplateParameterFieldViewModel> parameter_fields;
  std::vector<TemplateArtifactPreviewViewModel> preview_artifacts;
  std::vector<TemplateIssueViewModel> issues;
  std::vector<std::string> warnings;
};

template <typename T>
struct TemplateViewResponse {
  bool success{false};
  TemplateUiResultCode code{TemplateUiResultCode::template_ui_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  std::optional<T> value;
  std::vector<TemplateIssueDto> validation_issues;
};

class WebTemplateAdapter {
 public:
  explicit WebTemplateAdapter(TemplateApiService& api_service);

  TemplateViewResponse<WebTemplateViewModel> load_template_catalog(ApiTimestampMs now_ms) const;
  TemplateViewResponse<WebTemplateViewModel> load_template_schema(controller::templates::TemplateKind kind, ApiTimestampMs now_ms) const;
  TemplateViewResponse<WebTemplateViewModel> preview_template(const TemplateDraftDto& draft, ApiTimestampMs now_ms) const;
  TemplateApplyDto apply_template(const TemplateDraftDto& draft, const CommandContext& context);

 private:
  TemplateApiService& api_service_;
};

}  // namespace controller::api
