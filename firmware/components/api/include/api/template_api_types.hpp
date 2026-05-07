#pragma once

#include <optional>
#include <string>
#include <vector>

#include "api/api_types.hpp"
#include "templates/template_engine.hpp"

namespace controller::api {

enum class TemplateUiResultCode {
  template_ui_ok,
  template_ui_invalid_draft,
  template_ui_apply_denied,
  template_ui_duplicate_id,
  template_ui_active_program_present,
  template_ui_data_unavailable,
  template_ui_runtime_apply_failed,
  template_ui_rollback_failed,
  template_ui_invalid_argument,
};

using TemplateListDto = std::vector<controller::templates::TemplateListEntry>;
using TemplateCatalogDto = controller::templates::TemplateCatalog;
using TemplateSchemaDto = controller::templates::TemplateSchema;
using TemplateDraftDto = controller::templates::TemplateDraft;
using TemplateValidationDto = controller::templates::TemplateValidationResult;
using TemplatePreviewDto = controller::templates::TemplatePreview;
using TemplateIssueDto = controller::templates::TemplateIssue;
using TemplateApplyDto = controller::templates::TemplateApplyResult;

struct TemplateUiStatus {
  TemplateUiResultCode code{TemplateUiResultCode::template_ui_ok};
  std::string message;
  std::vector<TemplateIssueDto> validation_issues;

  bool ok() const {
    return code == TemplateUiResultCode::template_ui_ok;
  }
};

template <typename T>
struct TemplateUiResult {
  TemplateUiStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

const char* to_string(TemplateUiResultCode code);

}  // namespace controller::api
