#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <variant>

namespace controller::conditions {

using ConditionValue = std::variant<bool, std::int64_t, double, std::string>;

enum class ConditionValueType {
  boolean,
  int64,
  float64,
  string,
};

ConditionValueType condition_value_type_from_value(const ConditionValue& value);
bool is_numeric_condition_value(const ConditionValue& value);
std::optional<double> condition_value_as_double(const ConditionValue& value);
std::string to_string(const ConditionValue& value);
const char* to_string(ConditionValueType type);

}  // namespace controller::conditions
