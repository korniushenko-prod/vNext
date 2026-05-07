#pragma once

#include <cstdint>
#include <string>
#include <type_traits>
#include <variant>

#include "signals/signal_types.hpp"

namespace controller::signals {

using SignalValue = std::variant<bool, std::int64_t, double, std::string>;

template <typename T>
struct SignalValueType;

template <>
struct SignalValueType<bool> {
  static constexpr SignalType type = SignalType::boolean;
};

template <>
struct SignalValueType<std::int64_t> {
  static constexpr SignalType type = SignalType::int64;
};

template <>
struct SignalValueType<double> {
  static constexpr SignalType type = SignalType::float64;
};

template <>
struct SignalValueType<std::string> {
  static constexpr SignalType type = SignalType::string;
};

template <typename T>
constexpr SignalType signal_type_for() {
  return SignalValueType<typename std::decay<T>::type>::type;
}

SignalType signal_type_from_value(const SignalValue& value);
bool signal_value_matches_type(const SignalValue& value, SignalType expected_type);

}  // namespace controller::signals
