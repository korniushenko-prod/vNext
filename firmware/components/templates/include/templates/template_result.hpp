#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "templates/template_types.hpp"

namespace controller::templates {

struct TemplateIssue {
  std::string path;
  std::string code;
  TemplateIssueSeverity severity{TemplateIssueSeverity::error};
  std::string message;
};

struct TemplateStatus {
  TemplateErrorCode code{TemplateErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == TemplateErrorCode::ok;
  }

  static TemplateStatus success(std::string detail = {}) {
    return TemplateStatus{TemplateErrorCode::ok, std::move(detail)};
  }

  static TemplateStatus error(const TemplateErrorCode error_code, std::string detail) {
    return TemplateStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct TemplateResult {
  TemplateStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct TemplateValidationResult {
  TemplateStatus status{};
  std::vector<TemplateIssue> issues;

  bool has_errors() const;
  bool ok() const;
};

struct TemplateCreatedArtifactSummary {
  std::string id;
  std::string name;
  std::string artifact_kind;
  bool enabled{false};
};

struct TemplateApplyResult {
  bool accepted{false};
  TemplateStatus status{};
  std::vector<TemplateCreatedArtifactSummary> created_programs;
  std::vector<TemplateCreatedArtifactSummary> created_rules;
  std::vector<TemplateCreatedArtifactSummary> created_alarms;
  std::vector<TemplateCreatedArtifactSummary> created_pids;
  bool rollback_attempted{false};
  bool rollback_succeeded{true};
  std::vector<TemplateIssue> rollback_issues;
};

}  // namespace controller::templates
