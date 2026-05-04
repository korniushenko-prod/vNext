#pragma once

#include <string>
#include <vector>

#include "config/config_types.hpp"

namespace controller::config {

enum class ValidationSeverity { warning, error };

struct ValidationIssue {
  std::string path;
  std::string code;
  ValidationSeverity severity{ValidationSeverity::error};
  std::string message;
};

struct ValidationResult {
  bool valid{true};
  std::vector<ValidationIssue> issues;

  void add_issue(const ValidationIssue& issue) {
    issues.push_back(issue);
    if (issue.severity == ValidationSeverity::error) {
      valid = false;
    }
  }

  bool has_errors() const;
  bool has_warnings() const;
};

ValidationResult validate_config(const DeviceConfig& config);

}  // namespace controller::config
