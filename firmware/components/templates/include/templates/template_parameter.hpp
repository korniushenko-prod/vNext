#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "signals/signal_value.hpp"
#include "templates/template_types.hpp"

namespace controller::templates {

using TemplateParameterValue = controller::signals::SignalValue;

struct TemplateParameterDefinition {
  std::string parameter_id;
  std::string label;
  TemplateParameterType type{TemplateParameterType::string};
  bool required{true};
  std::optional<TemplateParameterValue> default_value;
  std::optional<std::int64_t> min_int64_value;
  std::optional<std::int64_t> max_int64_value;
  std::optional<double> min_double_value;
  std::optional<double> max_double_value;
  std::vector<std::string> allowed_string_values;
  std::string description;
  std::string unit;
};

}  // namespace controller::templates
