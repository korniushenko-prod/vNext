#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <vector>

#include "driver/gpio.h"
#include "esp_err.h"
#include "esp_event.h"
#include "esp_flash.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_netif_ip_addr.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "hal/board_profile_lilygo_t3_v1_6_1.hpp"
#include "hal/display_hal.hpp"
#include "hal/esp32_hal.hpp"
#include "nvs_flash.h"
#include "sdkconfig.h"

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE
#include "actuators/actuator_manager.hpp"
#include "actuators/actuator_types.hpp"
#include "alarms/alarm_descriptor.hpp"
#include "alarms/alarm_service.hpp"
#include "api/flow_api_service.hpp"
#include "api/rules_api_service.hpp"
#include "api/sequence_api_service.hpp"
#include "api/web_dashboard_adapter.hpp"
#include "api/web_flow_adapter.hpp"
#include "api/web_rules_adapter.hpp"
#include "conditions/condition_node.hpp"
#include "conditions/condition_tree.hpp"
#include "flow/flow_descriptor.hpp"
#include "flow/flow_service.hpp"
#include "logic/logic_service.hpp"
#include "logic/rule_action.hpp"
#include "logic/rule_descriptor.hpp"
#include "sequence/sequence_action.hpp"
#include "sequence/sequence_program.hpp"
#include "sequence/sequence_service.hpp"
#include "sequence/sequence_state.hpp"
#include "sequence/sequence_transition.hpp"
#include "signals/signal_descriptor.hpp"
#include "signals/signal_registry.hpp"
#include "storage/storage_backend.hpp"
#include "storage/storage_service.hpp"
#include "timers/timer_descriptor.hpp"
#include "timers/timer_service.hpp"
#include "web/web_route_service.hpp"
#endif

namespace {

constexpr char kLogTag[] = "stage29";
constexpr std::uint32_t kHeartbeatIntervalMs = 500U;
constexpr std::uint32_t kNetworkPollIntervalMs = 1000U;
constexpr std::uint32_t kStatusScreenIntervalMs = 500U;
constexpr std::uint32_t kStaReconnectIntervalMs = 5000U;
constexpr std::uint32_t kOneMegabyteBytes = 1024U * 1024U;
constexpr std::uint32_t kBringupTaskStackBytes = 16384U;
constexpr UBaseType_t kBringupTaskPriority = 5U;

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE
constexpr std::uint32_t kRuntimeTickIntervalMs = 100U;
#endif

#ifndef BRINGUP_DEFAULT_STA_ENABLED
#define BRINGUP_DEFAULT_STA_ENABLED 1
#endif

#ifndef BRINGUP_DEFAULT_STA_SSID
#define BRINGUP_DEFAULT_STA_SSID "Infinity-Starlink"
#endif

#ifndef BRINGUP_DEFAULT_STA_PASSWORD
#define BRINGUP_DEFAULT_STA_PASSWORD ""
#endif

#ifndef BRINGUP_DEFAULT_AP_ENABLED
#define BRINGUP_DEFAULT_AP_ENABLED 1
#endif

#ifndef BRINGUP_DEFAULT_AP_SSID
#define BRINGUP_DEFAULT_AP_SSID "vNext-Bringup"
#endif

#ifndef BRINGUP_DEFAULT_AP_PASSWORD
#define BRINGUP_DEFAULT_AP_PASSWORD ""
#endif

#ifndef BRINGUP_EXPECTED_FLASH_MB
#define BRINGUP_EXPECTED_FLASH_MB 4U
#endif

#ifndef BRINGUP_ENABLE_WEB
#define BRINGUP_ENABLE_WEB 0
#endif

#ifndef BRINGUP_HTTP_PORT
#define BRINGUP_HTTP_PORT 80
#endif

#ifndef BRINGUP_BENCH_MODE
#define BRINGUP_BENCH_MODE 0
#endif

#ifndef BRINGUP_TEST_RELAY_PIN
#define BRINGUP_TEST_RELAY_PIN -1
#endif

#ifndef BRINGUP_TEST_DI_PIN
#define BRINGUP_TEST_DI_PIN -1
#endif

#ifndef BRINGUP_TEST_PWM_PIN
#define BRINGUP_TEST_PWM_PIN -1
#endif

#ifndef BRINGUP_TEST_PULSE_PIN
#define BRINGUP_TEST_PULSE_PIN -1
#endif

#ifndef BRINGUP_TEST_AI_PIN
#define BRINGUP_TEST_AI_PIN -1
#endif

using controller::hal::BringupTestPins;
using controller::hal::Esp32AnalogInputHal;
using controller::hal::Esp32DigitalInputHal;
using controller::hal::Esp32DisplayHal;
using controller::hal::Esp32PulseInputHal;
using controller::hal::Esp32PwmHal;
using controller::hal::Esp32RelayHal;
using controller::hal::LilygoT3V161BoardProfile;
using controller::hal::StatusLedPin;

struct BringupBenchConfig {
  bool enabled{BRINGUP_BENCH_MODE != 0};
  BringupTestPins test_pins{
      BRINGUP_TEST_RELAY_PIN,
      BRINGUP_TEST_DI_PIN,
      BRINGUP_TEST_PWM_PIN,
      BRINGUP_TEST_PULSE_PIN,
      BRINGUP_TEST_AI_PIN,
  };
};

struct BringupNetworkConfig {
  bool sta_enabled{BRINGUP_DEFAULT_STA_ENABLED != 0};
  std::string sta_ssid{BRINGUP_DEFAULT_STA_SSID};
  std::string sta_password{BRINGUP_DEFAULT_STA_PASSWORD};
  bool ap_enabled{BRINGUP_DEFAULT_AP_ENABLED != 0};
  std::string ap_ssid{BRINGUP_DEFAULT_AP_SSID};
  std::string ap_password{BRINGUP_DEFAULT_AP_PASSWORD};
  bool display_show_only_ip{true};
  bool display_show_ssid{false};
  bool display_show_ap_name{false};
};

struct BringupFlashConfig {
  std::uint32_t expected_board_flash_bytes{BRINGUP_EXPECTED_FLASH_MB * kOneMegabyteBytes};
  std::string expected_board_flash_label{std::to_string(BRINGUP_EXPECTED_FLASH_MB) + "MB"};
  std::string configured_image_flash_label{CONFIG_ESPTOOLPY_FLASHSIZE};
};

struct BringupWebConfig {
  bool enabled{BRINGUP_ENABLE_WEB != 0};
  std::uint16_t port{BRINGUP_HTTP_PORT};
  bool rules_read_only{true};
};

struct BringupConfig {
  BringupBenchConfig bench{};
  BringupNetworkConfig network{};
  BringupFlashConfig flash{};
  BringupWebConfig web{};
};

struct FlashSanityStatus {
  bool detection_available{false};
  bool board_vs_image_mismatch{false};
  bool board_vs_detected_mismatch{false};
  bool mismatch{false};
  std::uint32_t detected_flash_bytes{0U};
  std::string detected_flash_label{"unknown"};
  std::string warning_summary;
};

struct NetworkRuntimeStatus {
  bool wifi_initialized{false};
  bool sta_enabled{false};
  bool ap_enabled{false};
  bool sta_connecting{false};
  bool sta_connected{false};
  bool sta_has_ip{false};
  bool ap_active{false};
  bool ap_has_ip{false};
  std::string sta_ip{"---"};
  std::string ap_ip{"---"};
  std::string last_reason{"no_ip"};
  std::uint64_t next_sta_connect_attempt_ms{0U};
  bool logged_sta_connecting{false};
  bool logged_no_ip{false};
  std::string last_logged_sta_ip;
  std::string last_logged_ap_ip;
};

struct BringupRuntimeStatus {
  bool safe_mode{false};
  std::string safe_reason;
  FlashSanityStatus flash{};
  NetworkRuntimeStatus network{};
  bool web_started{false};
  bool bench_mode{false};
  std::string web_status{"WEB OFF"};
  std::string runtime_status{"RUNTIME OFF"};
  std::string fixture_status{"FLOW SAFE DEFAULT"};
};

struct WifiBringupContext {
  BringupNetworkConfig config;
  NetworkRuntimeStatus* status{nullptr};
  esp_netif_t* sta_netif{nullptr};
  esp_netif_t* ap_netif{nullptr};
};

std::uint64_t monotonic_ms();

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE

struct EmbeddedRuntimeContext {
  controller::signals::SignalRegistry signal_registry;
  controller::storage::InMemoryStorageBackend storage_backend;
  controller::storage::StorageService storage_service;
  controller::actuators::ActuatorManager actuator_manager;
  controller::timers::TimerService timer_service;
  controller::alarms::AlarmService alarm_service;
  controller::sequence::SequenceService sequence_service;
  controller::logic::LogicService logic_service;
  controller::flow::FlowService flow_service;
  controller::api::SequenceApiService sequence_api_service;
  controller::api::WebDashboardAdapter dashboard_adapter;
  controller::api::FlowApiService flow_api_service;
  controller::api::WebFlowAdapter flow_adapter;
  controller::api::RulesApiService rules_api_service;
  controller::api::WebRulesAdapter rules_adapter;
  controller::web::WebRouteService web_route_service;

  EmbeddedRuntimeContext(
      Esp32RelayHal& relay_hal,
      Esp32PwmHal& pwm_hal,
      Esp32PulseInputHal& pulse_input_hal,
      const BringupConfig& bringup_config)
      : storage_service(storage_backend),
        actuator_manager(relay_hal, pwm_hal, &signal_registry),
        timer_service(&signal_registry),
        alarm_service(&signal_registry),
        sequence_service(signal_registry, actuator_manager, timer_service, alarm_service),
        logic_service(signal_registry, actuator_manager, timer_service, alarm_service, sequence_service),
        flow_service(pulse_input_hal, storage_service, signal_registry),
        sequence_api_service(sequence_service, alarm_service, actuator_manager),
        dashboard_adapter(sequence_api_service),
        flow_api_service(flow_service),
        flow_adapter(flow_api_service),
        rules_api_service(
            logic_service,
            signal_registry,
            actuator_manager,
            timer_service,
            alarm_service,
            sequence_service),
        rules_adapter(rules_api_service),
        web_route_service(
            controller::web::WebServerConfig{
                bringup_config.web.enabled,
                bringup_config.web.rules_read_only,
                bringup_config.bench.enabled,
                bringup_config.web.port,
            },
            controller::web::WebRouteDependencies{
                &dashboard_adapter,
                &flow_adapter,
                &rules_adapter,
                []() { return monotonic_ms(); },
            }) {}
};

#endif

std::uint64_t monotonic_ms() {
  return static_cast<std::uint64_t>(esp_timer_get_time() / 1000ULL);
}

void set_status_led(const StatusLedPin& led, const bool on) {
  if (led.gpio < 0) {
    return;
  }
  gpio_set_level(static_cast<gpio_num_t>(led.gpio), (led.active_high ? on : !on) ? 1 : 0);
}

bool initialize_status_led(const StatusLedPin& led) {
  if (led.gpio < 0) {
    return true;
  }

  gpio_config_t config{};
  config.pin_bit_mask = 1ULL << led.gpio;
  config.mode = GPIO_MODE_OUTPUT;
  config.pull_down_en = GPIO_PULLDOWN_DISABLE;
  config.pull_up_en = GPIO_PULLUP_DISABLE;
  config.intr_type = GPIO_INTR_DISABLE;
  if (gpio_config(&config) != ESP_OK) {
    return false;
  }

  set_status_led(led, false);
  return true;
}

void render_screen(controller::hal::DisplayHal& display_hal, const std::vector<std::string>& lines) {
  if (!display_hal.clear().ok()) {
    return;
  }

  const std::size_t line_limit = std::min(lines.size(), display_hal.line_count());
  for (std::size_t index = 0; index < line_limit; ++index) {
    display_hal.write_line(index, lines[index]);
  }
}

void log_test_pin_summary(const LilygoT3V161BoardProfile& profile) {
  for (const auto& line : profile.test_pin_summary()) {
    ESP_LOGI(kLogTag, "External test pin: %s", line.c_str());
  }
}

void log_profile_validation(const std::vector<controller::hal::BoardProfileValidationIssue>& issues) {
  for (const auto& issue : issues) {
    ESP_LOGW(kLogTag, "Board profile validation: %s: %s", issue.field.c_str(), issue.message.c_str());
  }
}

bool initialize_hal(const char* name, controller::hal::HalStatus status, std::string& safe_reason) {
  if (status.ok()) {
    ESP_LOGI(kLogTag, "%s initialized", name);
    return true;
  }

  ESP_LOGE(kLogTag, "%s init failed: %s", name, status.message.c_str());
  if (safe_reason.empty()) {
    safe_reason = std::string{name} + ": " + status.message;
  }
  return false;
}

bool initialize_hal_step(
    const char* name,
    const std::function<controller::hal::HalStatus()>& init_fn,
    std::string& safe_reason) {
  ESP_LOGI(kLogTag, "%s init start", name);
  return initialize_hal(name, init_fn(), safe_reason);
}

bool check_esp_step(const char* name, const esp_err_t err, std::string& safe_reason) {
  if (err == ESP_OK) {
    ESP_LOGI(kLogTag, "%s initialized", name);
    return true;
  }

  ESP_LOGE(kLogTag, "%s failed: %s", name, esp_err_to_name(err));
  if (safe_reason.empty()) {
    safe_reason = std::string{name} + ": " + esp_err_to_name(err);
  }
  return false;
}

bool initialize_nvs(std::string& safe_reason) {
  esp_err_t err = nvs_flash_init();
  if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_LOGW(kLogTag, "NVS init reported %s, erasing and retrying", esp_err_to_name(err));
    const esp_err_t erase_err = nvs_flash_erase();
    if (erase_err != ESP_OK) {
      return check_esp_step("NVS erase", erase_err, safe_reason);
    }
    err = nvs_flash_init();
  }

  return check_esp_step("NVS", err, safe_reason);
}

std::string format_ipv4(const esp_ip4_addr_t& address) {
  char buffer[16];
  std::snprintf(buffer, sizeof(buffer), IPSTR, IP2STR(&address));
  return std::string{buffer};
}

std::string format_flash_size_label(const std::uint32_t bytes) {
  if (bytes == 0U) {
    return "unknown";
  }

  if (bytes % kOneMegabyteBytes == 0U) {
    return std::to_string(bytes / kOneMegabyteBytes) + "MB";
  }

  return std::to_string(bytes) + "B";
}

void copy_wifi_text(std::uint8_t* destination, const std::size_t destination_size, const std::string& source) {
  std::memset(destination, 0, destination_size);
  if (destination_size == 0U) {
    return;
  }

  const std::size_t copy_size = std::min(source.size(), destination_size - 1U);
  if (copy_size > 0U) {
    std::memcpy(destination, source.data(), copy_size);
  }
}

std::string effective_ip_for_display(const BringupNetworkConfig&, const NetworkRuntimeStatus& status) {
  if (status.sta_has_ip) {
    return status.sta_ip;
  }
  if (status.ap_has_ip) {
    return status.ap_ip;
  }
  return "---";
}

std::string network_status_line(const NetworkRuntimeStatus& status) {
  if (status.sta_has_ip) {
    return "STA ONLINE";
  }
  if (status.ap_has_ip) {
    return "AP ONLINE";
  }
  if (status.sta_enabled && status.sta_connecting) {
    return "STA CONNECT";
  }
  if (!status.sta_enabled && !status.ap_enabled) {
    return "WIFI OFF";
  }
  return "NO NETWORK";
}

std::string flash_status_line(const FlashSanityStatus& status) {
  if (status.mismatch) {
    if (!status.warning_summary.empty()) {
      return status.warning_summary;
    }
    return "FLASH WARN";
  }
  if (status.detection_available) {
    return "FLASH OK";
  }
  return "FLASH CHECK ?";
}

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE

controller::signals::SignalDescriptor make_signal_descriptor(
    std::string path,
    std::string name,
    const controller::signals::SignalType type,
    const controller::signals::SignalAccessMode access_mode = controller::signals::SignalAccessMode::read_only) {
  return controller::signals::SignalDescriptor{
      std::move(path),
      std::move(name),
      "Stage 29 bench/runtime signal",
      type,
      "",
      "stage29",
      access_mode,
      0U,
      true,
      true,
  };
}

controller::conditions::ConditionTree make_bool_signal_tree(
    const std::string& tree_id,
    const std::string& signal_path,
    const bool expected) {
  using controller::conditions::ConditionNode;
  using controller::conditions::ConditionNodeKind;
  using controller::conditions::ConditionOperator;
  using controller::conditions::ConditionSignalCompareNode;

  const auto root_id = tree_id + "_root";
  return controller::conditions::ConditionTree{
      tree_id,
      root_id,
      {ConditionNode{
          {root_id, root_id, "", ConditionNodeKind::signal_compare, 0U, 0U, std::nullopt},
          ConditionSignalCompareNode{signal_path, ConditionOperator::eq, expected},
      }},
  };
}

controller::sequence::SequenceProgram make_stage28_program() {
  using controller::hal::RelayState;
  using controller::sequence::SequenceAction;
  using controller::sequence::SequenceActionKind;
  using controller::sequence::SequenceProgram;
  using controller::sequence::SequenceProgramType;
  using controller::sequence::SequenceRelayRequestAction;
  using controller::sequence::SequenceState;
  using controller::sequence::SequenceStateType;
  using controller::sequence::SequenceTransition;

  SequenceProgram program;
  program.id = "program.bench";
  program.name = "Bench Program";
  program.description = "Stage 29 safe bench program";
  program.enabled = true;
  program.type = SequenceProgramType::generic;
  program.initial_state_id = "start";
  program.normal_stop_state_id = "stop";
  program.trip_state_id = "trip";
  program.lockout_state_id = "lockout";
  program.start_condition = make_bool_signal_tree("program.start", "permit.start", true);
  program.reset_condition = make_bool_signal_tree("program.reset", "permit.reset", true);

  SequenceState start;
  start.id = "start";
  start.name = "start";
  start.type = SequenceStateType::action;
  start.transitions.push_back(SequenceTransition{"to_run", "to_run", "run", std::nullopt, false, true});

  SequenceState run;
  run.id = "run";
  run.name = "run";
  run.type = SequenceStateType::run;
  run.active_actions.push_back(SequenceAction{
      "run_relay",
      "run_relay",
      SequenceActionKind::relay_request,
      SequenceRelayRequestAction{"bringup.relay.test", RelayState::on, "bench program active"},
  });
  run.transitions.push_back(
      SequenceTransition{"to_stop", "to_stop", "stop", make_bool_signal_tree("program.ready", "transition.ready", true), false, true});

  SequenceState stop;
  stop.id = "stop";
  stop.name = "stop";
  stop.type = SequenceStateType::stop;

  SequenceState trip;
  trip.id = "trip";
  trip.name = "trip";
  trip.type = SequenceStateType::stop;
  trip.transitions.push_back(SequenceTransition{"to_lockout", "to_lockout", "lockout", std::nullopt, false, true});

  SequenceState lockout;
  lockout.id = "lockout";
  lockout.name = "lockout";
  lockout.type = SequenceStateType::lockout;

  program.states = {start, run, stop, trip, lockout};
  return program;
}

controller::logic::RuleDescriptor make_stage28_rule() {
  using controller::logic::RuleAction;
  using controller::logic::RuleActionKind;
  using controller::logic::RuleDescriptor;
  using controller::logic::RulePwmRequestAction;

  RuleDescriptor rule;
  rule.id = "rule.bench_status";
  rule.name = "Bench Status Rule";
  rule.enabled = false;
  rule.description = "Read-only hardware rule fixture for Stage 29.";
  rule.condition_tree = make_bool_signal_tree("rule.bench", "bench.di.test", true);
  rule.source_module = "stage29";
  rule.while_true_actions.push_back(RuleAction{
      "bench_pwm",
      "bench_pwm",
      RuleActionKind::pwm_request,
      RulePwmRequestAction{"bringup.pwm.test", 25.0, true, "bench status fixture"},
  });
  return rule;
}

controller::flow::FlowDescriptor make_stage28_flow_descriptor() {
  controller::flow::FlowDescriptor descriptor;
  descriptor.id = "flow.bench";
  descriptor.name = "Bench Flow";
  descriptor.pulse_input_id = "bringup.pulse.test";
  descriptor.unit = "L";
  descriptor.k_factor_pulses_per_unit = 10.0;
  descriptor.primary_rate_mode = controller::flow::FlowRateMode::time_window;
  descriptor.time_window_ms = 1000U;
  descriptor.avg_last_n_pulses = 3U;
  descriptor.no_flow_timeout_ms = 1500U;
  descriptor.batch_target_default = 1.0;
  descriptor.trend_enabled = true;
  descriptor.trend_bucket_ms = 1000U;
  descriptor.trend_bucket_count = 16U;
  descriptor.protected_lifetime_totals = true;
  return descriptor;
}

#endif

std::vector<std::string> build_status_screen(
    const BringupConfig& config,
    const BringupRuntimeStatus& status) {
  std::vector<std::string> lines;
  lines.reserve(8U);

  lines.push_back("STAGE 29");
  lines.push_back(status.safe_mode ? "SAFE WARN" : "SAFE IDLE");
  lines.push_back("IP: " + effective_ip_for_display(config.network, status.network));
  lines.push_back(status.web_started ? status.web_status : network_status_line(status.network));
  lines.push_back(config.bench.enabled ? "BENCH MODE" : flash_status_line(status.flash));
  lines.push_back(status.fixture_status);
  lines.push_back(status.runtime_status);

  if (config.network.display_show_ssid && status.network.sta_enabled) {
    lines.push_back("STA " + config.network.sta_ssid);
  }
  if (config.network.display_show_ap_name && status.network.ap_enabled) {
    lines.push_back("AP " + config.network.ap_ssid);
  }
  if (!status.safe_reason.empty()) {
    lines.push_back(status.safe_reason);
  }

  return lines;
}

FlashSanityStatus evaluate_flash_sanity(const BringupFlashConfig& config) {
  FlashSanityStatus status;
  status.board_vs_image_mismatch = config.expected_board_flash_label != config.configured_image_flash_label;

  std::uint32_t detected_flash_bytes = 0U;
  if (esp_flash_get_size(nullptr, &detected_flash_bytes) == ESP_OK) {
    status.detection_available = true;
    status.detected_flash_bytes = detected_flash_bytes;
    status.detected_flash_label = format_flash_size_label(detected_flash_bytes);
    status.board_vs_detected_mismatch = detected_flash_bytes != config.expected_board_flash_bytes;
  }

  status.mismatch = status.board_vs_image_mismatch || status.board_vs_detected_mismatch;
  if (status.board_vs_detected_mismatch) {
    status.warning_summary = "FLASH " + config.expected_board_flash_label + "!=" + status.detected_flash_label;
  } else if (status.board_vs_image_mismatch) {
    status.warning_summary = "FLASH IMG " + config.configured_image_flash_label;
  }

  ESP_LOGI(
      kLogTag,
      "Flash policy: board expects %s, image configured %s",
      config.expected_board_flash_label.c_str(),
      config.configured_image_flash_label.c_str());
  if (status.detection_available) {
    ESP_LOGI(kLogTag, "Flash detected at runtime: %s", status.detected_flash_label.c_str());
  } else {
    ESP_LOGW(kLogTag, "Flash detection unavailable at runtime");
  }

  if (status.mismatch) {
    ESP_LOGW(kLogTag, "FLASH SANITY WARNING");
    if (status.board_vs_image_mismatch) {
      ESP_LOGW(
          kLogTag,
          "Board profile expects %s but image header is configured for %s",
          config.expected_board_flash_label.c_str(),
          config.configured_image_flash_label.c_str());
    }
    if (status.board_vs_detected_mismatch) {
      ESP_LOGW(
          kLogTag,
          "Board profile expects %s but detected flash is %s",
          config.expected_board_flash_label.c_str(),
          status.detected_flash_label.c_str());
    }
  }

  return status;
}

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE

bool initialize_runtime_context(
    EmbeddedRuntimeContext& runtime,
    const BringupConfig& bringup_config,
    const controller::hal::DigitalInputHal& digital_input_hal,
    const controller::hal::AnalogInputHal& analog_input_hal,
    const controller::hal::PulseInputHal& pulse_input_hal,
    BringupRuntimeStatus& bringup_status) {
  using controller::actuators::ActuatorRole;
  using controller::actuators::PwmActuatorTarget;
  using controller::actuators::RelayActuatorTarget;
  using controller::alarms::AlarmDescriptor;
  using controller::alarms::AlarmSeverity;
  using controller::signals::SignalAccessMode;
  using controller::signals::SignalType;
  using controller::signals::SignalValue;
  using controller::timers::TimerDescriptor;
  using controller::timers::TimerKind;

  auto register_signal = [&](const controller::signals::SignalDescriptor& descriptor, const SignalValue& initial_value) {
    const auto result = runtime.signal_registry.register_signal(descriptor, initial_value, monotonic_ms(), true, false);
    if (!result.ok() && bringup_status.safe_reason.empty()) {
      bringup_status.safe_reason = result.status.message;
    }
    return result.ok();
  };

  bool ok = true;
  ok = runtime.actuator_manager.register_relay_target(
           RelayActuatorTarget{
               "bringup.relay.test",
               "Bench Relay",
               true,
               ActuatorRole::generic,
               controller::hal::RelayState::off,
               std::nullopt,
           },
           monotonic_ms())
           .ok() &&
       ok;
  ok = runtime.actuator_manager.register_pwm_target(
           PwmActuatorTarget{"bringup.pwm.test", "Bench PWM", true, ActuatorRole::generic, 0.0, 100.0, 0.0},
           monotonic_ms())
           .ok() &&
       ok;
  ok = runtime.timer_service
           .register_timer(TimerDescriptor{
               "timer.sequence",
               "Sequence Timer",
               "Stage 29 sequence timer",
               true,
               TimerKind::state_min_time,
               1000U,
               "stage29",
               true,
               false,
               true,
           })
           .ok() &&
       ok;
  ok = runtime.alarm_service
           .register_alarm(AlarmDescriptor{
               "alarm.sequence",
               "Sequence Alarm",
               true,
               AlarmSeverity::warning,
               false,
               "Stage 29 sequence alarm",
               "stage29",
               true,
               true,
               false,
               true,
           })
           .ok() &&
       ok;

  ok = register_signal(make_signal_descriptor("permit.start", "Permit Start", SignalType::boolean), SignalValue{true}) && ok;
  ok = register_signal(make_signal_descriptor("permit.reset", "Permit Reset", SignalType::boolean), SignalValue{true}) && ok;
  ok = register_signal(make_signal_descriptor("transition.ready", "Transition Ready", SignalType::boolean), SignalValue{false}) && ok;
  ok = register_signal(make_signal_descriptor("bench.di.test", "Bench DI", SignalType::boolean), SignalValue{false}) && ok;
  ok = register_signal(make_signal_descriptor("bench.ai.test", "Bench AI", SignalType::float64), SignalValue{0.0}) && ok;
  ok = register_signal(
           make_signal_descriptor("virtual.flag", "Virtual Flag", SignalType::boolean, SignalAccessMode::writable_virtual),
           SignalValue{false}) &&
       ok;

  const auto program_result = runtime.sequence_service.register_program(make_stage28_program());
  if (!program_result.ok()) {
    ok = false;
    if (bringup_status.safe_reason.empty()) {
      bringup_status.safe_reason = program_result.status.message;
    }
  }

  const auto rule_result = runtime.logic_service.register_rule(make_stage28_rule());
  if (!rule_result.ok()) {
    ok = false;
    if (bringup_status.safe_reason.empty()) {
      bringup_status.safe_reason = rule_result.status.message;
    }
  }

  const auto pulse_validity = pulse_input_hal.get_validity("bringup.pulse.test");
  if (pulse_validity.ok() && *pulse_validity.value == controller::hal::InputValidity::valid) {
    const auto flow_result = runtime.flow_service.register_flowmeter(make_stage28_flow_descriptor());
    if (!flow_result.ok()) {
      ok = false;
      if (bringup_status.safe_reason.empty()) {
        bringup_status.safe_reason = flow_result.status.message;
      }
      bringup_status.fixture_status = "FLOW WARN";
    } else {
      runtime.flow_service.initialize_from_storage(monotonic_ms());
      bringup_status.fixture_status = "FLOW READY";
      ESP_LOGI(
          kLogTag,
          "Flow fixture status: flow.bench registered on bringup.pulse.test; /flow and batch commands are live-testable.");
    }
  } else {
    bringup_status.fixture_status = "FLOW SAFE DEFAULT";
    ESP_LOGW(
        kLogTag,
        "Flow fixture status: bringup.pulse.test is unbound or invalid; safe default keeps /flow in no-flowmeter mode.");
  }

  bringup_status.bench_mode = bringup_config.bench.enabled;
  if (bringup_config.bench.enabled) {
    bringup_status.runtime_status = "BENCH LOW-V";
    ESP_LOGW(kLogTag, "BENCH MODE enabled: low-voltage checks only, no automatic outputs");
  } else {
    bringup_status.runtime_status = "RUNTIME READY";
  }

  const auto di_validity = digital_input_hal.get_validity("bringup.di.test");
  const auto ai_validity = analog_input_hal.get_validity("bringup.ai.test");
  ESP_LOGI(
      kLogTag,
      "Bench IO policy: DI=%s AI=%s PWM=%s PULSE=%s",
      di_validity.ok() && *di_validity.value == controller::hal::InputValidity::valid ? "bound" : "unbound",
      ai_validity.ok() && *ai_validity.value == controller::hal::InputValidity::valid ? "bound" : "unbound",
      bringup_config.bench.test_pins.test_pwm_pin >= 0 ? "bound" : "unbound",
      pulse_validity.ok() && *pulse_validity.value == controller::hal::InputValidity::valid ? "bound" : "unbound");
  ESP_LOGI(
      kLogTag,
      "PWM fixture note: use LED+resistor or logic-level target only; no mains or high-power loads.");

  runtime.actuator_manager.evaluate(monotonic_ms());
  runtime.timer_service.tick(monotonic_ms());
  runtime.sequence_service.tick(monotonic_ms());
  runtime.logic_service.tick(monotonic_ms());

  return ok;
}

void refresh_bench_signals(
    EmbeddedRuntimeContext& runtime,
    controller::hal::DigitalInputHal& digital_input_hal,
    controller::hal::AnalogInputHal& analog_input_hal,
    const BringupConfig& bringup_config,
    const std::uint64_t now_ms) {
  using controller::signals::SignalValue;
  const auto di_validity = digital_input_hal.get_validity("bringup.di.test");
  if (di_validity.ok() && *di_validity.value == controller::hal::InputValidity::valid) {
    const auto di_value = digital_input_hal.read_debounced("bringup.di.test", now_ms);
    if (di_value.ok()) {
      runtime.signal_registry.update_signal("bench.di.test", SignalValue{*di_value.value}, now_ms, true, false);
      runtime.signal_registry.update_signal("transition.ready", SignalValue{*di_value.value}, now_ms, true, false);
    }
  }

  const auto ai_validity = analog_input_hal.get_validity("bringup.ai.test");
  if (ai_validity.ok() && *ai_validity.value == controller::hal::InputValidity::valid) {
    const auto ai_value = analog_input_hal.read_scaled("bringup.ai.test");
    if (ai_value.ok()) {
      runtime.signal_registry.update_signal("bench.ai.test", SignalValue{*ai_value.value}, now_ms, true, false);
    }
  }
}

void tick_runtime(
    EmbeddedRuntimeContext& runtime,
    controller::hal::DigitalInputHal& digital_input_hal,
    controller::hal::AnalogInputHal& analog_input_hal,
    const BringupConfig& bringup_config,
    BringupRuntimeStatus& bringup_status,
    const std::uint64_t now_ms) {
  refresh_bench_signals(runtime, digital_input_hal, analog_input_hal, bringup_config, now_ms);
  runtime.flow_service.tick(now_ms);
  runtime.timer_service.tick(now_ms);
  runtime.sequence_service.tick(now_ms);
  runtime.logic_service.tick(now_ms);
  runtime.actuator_manager.evaluate(now_ms);
  bringup_status.runtime_status = bringup_config.bench.enabled ? "BENCH READY" : "RUNTIME OK";
}

#endif

bool initialize_wifi_bringup(
    const BringupNetworkConfig& config,
    NetworkRuntimeStatus& status,
    WifiBringupContext& context,
    std::string& safe_reason) {
  context.config = config;
  context.status = &status;
  status.sta_enabled = config.sta_enabled;
  status.ap_enabled = config.ap_enabled;

  if (!config.sta_enabled && !config.ap_enabled) {
    ESP_LOGW(kLogTag, "WiFi bring-up disabled; IP display will show ---");
    return true;
  }

  if (!check_esp_step("esp_netif", esp_netif_init(), safe_reason)) {
    return false;
  }
  if (!check_esp_step("Event loop", esp_event_loop_create_default(), safe_reason)) {
    return false;
  }

  if (config.sta_enabled) {
    context.sta_netif = esp_netif_create_default_wifi_sta();
    if (context.sta_netif == nullptr) {
      ESP_LOGE(kLogTag, "Failed to create default STA netif");
      if (safe_reason.empty()) {
        safe_reason = "WiFi STA netif create failed";
      }
      return false;
    }
  }
  if (config.ap_enabled) {
    context.ap_netif = esp_netif_create_default_wifi_ap();
    if (context.ap_netif == nullptr) {
      ESP_LOGE(kLogTag, "Failed to create default AP netif");
      if (safe_reason.empty()) {
        safe_reason = "WiFi AP netif create failed";
      }
      return false;
    }
  }

  wifi_init_config_t init_config = WIFI_INIT_CONFIG_DEFAULT();
  if (!check_esp_step("WiFi core", esp_wifi_init(&init_config), safe_reason)) {
    return false;
  }

  const wifi_mode_t mode =
      config.sta_enabled && config.ap_enabled ? WIFI_MODE_APSTA :
      config.sta_enabled ? WIFI_MODE_STA :
                           WIFI_MODE_AP;
  if (!check_esp_step("WiFi mode", esp_wifi_set_mode(mode), safe_reason)) {
    return false;
  }

  if (config.sta_enabled) {
    wifi_config_t sta_config{};
    copy_wifi_text(sta_config.sta.ssid, sizeof(sta_config.sta.ssid), config.sta_ssid);
    copy_wifi_text(sta_config.sta.password, sizeof(sta_config.sta.password), config.sta_password);
    sta_config.sta.threshold.authmode = WIFI_AUTH_OPEN;
    sta_config.sta.pmf_cfg.capable = true;
    sta_config.sta.pmf_cfg.required = false;
    if (!check_esp_step("WiFi STA config", esp_wifi_set_config(WIFI_IF_STA, &sta_config), safe_reason)) {
      return false;
    }
  }

  if (config.ap_enabled) {
    wifi_config_t ap_config{};
    copy_wifi_text(ap_config.ap.ssid, sizeof(ap_config.ap.ssid), config.ap_ssid);
    copy_wifi_text(ap_config.ap.password, sizeof(ap_config.ap.password), config.ap_password);
    ap_config.ap.ssid_len = static_cast<std::uint8_t>(std::min<std::size_t>(config.ap_ssid.size(), sizeof(ap_config.ap.ssid)));
    ap_config.ap.channel = 1U;
    ap_config.ap.max_connection = 1U;
    ap_config.ap.authmode = config.ap_password.empty() ? WIFI_AUTH_OPEN : WIFI_AUTH_WPA2_PSK;
    if (!check_esp_step("WiFi AP config", esp_wifi_set_config(WIFI_IF_AP, &ap_config), safe_reason)) {
      return false;
    }
  }

  if (!check_esp_step("WiFi start", esp_wifi_start(), safe_reason)) {
    return false;
  }

  status.wifi_initialized = true;
  status.ap_active = config.ap_enabled;
  if (config.sta_enabled) {
    const esp_err_t connect_result = esp_wifi_connect();
    if (connect_result == ESP_OK) {
      status.sta_connecting = true;
      status.next_sta_connect_attempt_ms = monotonic_ms() + kStaReconnectIntervalMs;
      ESP_LOGI(kLogTag, "WiFi STA connecting");
      status.logged_sta_connecting = true;
    } else {
      ESP_LOGW(kLogTag, "WiFi STA connect start failed: %s", esp_err_to_name(connect_result));
    }
  }

  return true;
}

void emit_network_logs(NetworkRuntimeStatus& status) {
  if (status.sta_has_ip) {
    if (status.last_logged_sta_ip != status.sta_ip) {
      ESP_LOGI(kLogTag, "WiFi STA connected with IP %s", status.sta_ip.c_str());
      status.last_logged_sta_ip = status.sta_ip;
    }
    status.logged_no_ip = false;
    status.logged_sta_connecting = false;
  } else {
    status.last_logged_sta_ip.clear();
  }

  if (status.ap_has_ip) {
    if (status.last_logged_ap_ip != status.ap_ip) {
      ESP_LOGI(kLogTag, "AP started with IP %s", status.ap_ip.c_str());
      status.last_logged_ap_ip = status.ap_ip;
    }
    status.logged_no_ip = false;
  } else {
    status.last_logged_ap_ip.clear();
  }

  if (!status.sta_has_ip && !status.ap_has_ip) {
    if (!status.logged_no_ip) {
      ESP_LOGW(kLogTag, "WiFi disconnected / no IP");
      status.logged_no_ip = true;
    }
  } else {
    status.logged_no_ip = false;
  }
}

void refresh_network_status(WifiBringupContext& context, const std::uint64_t now_ms) {
  if (context.status == nullptr) {
    return;
  }

  auto& status = *context.status;
  if (!status.wifi_initialized) {
    return;
  }

  if (status.sta_enabled) {
    wifi_ap_record_t ap_record{};
    const bool sta_connected = esp_wifi_sta_get_ap_info(&ap_record) == ESP_OK;
    status.sta_connected = sta_connected;
    status.sta_connecting = !sta_connected;

    esp_netif_ip_info_t sta_ip_info{};
    if (context.sta_netif != nullptr &&
        esp_netif_get_ip_info(context.sta_netif, &sta_ip_info) == ESP_OK &&
        sta_ip_info.ip.addr != 0U) {
      status.sta_has_ip = true;
      status.sta_connected = true;
      status.sta_connecting = false;
      status.sta_ip = format_ipv4(sta_ip_info.ip);
    } else {
      status.sta_has_ip = false;
      status.sta_ip = "---";
    }

    if (!status.sta_has_ip && now_ms >= status.next_sta_connect_attempt_ms) {
      const esp_err_t reconnect_result = esp_wifi_connect();
      if (reconnect_result == ESP_OK) {
        status.sta_connecting = true;
        status.next_sta_connect_attempt_ms = now_ms + kStaReconnectIntervalMs;
        if (!status.logged_sta_connecting) {
          ESP_LOGI(kLogTag, "WiFi STA connecting");
          status.logged_sta_connecting = true;
        }
      }
    }
  }

  if (status.ap_enabled) {
    status.ap_active = true;
    esp_netif_ip_info_t ap_ip_info{};
    if (context.ap_netif != nullptr &&
        esp_netif_get_ip_info(context.ap_netif, &ap_ip_info) == ESP_OK &&
        ap_ip_info.ip.addr != 0U) {
      status.ap_has_ip = true;
      status.ap_ip = format_ipv4(ap_ip_info.ip);
    } else {
      status.ap_has_ip = false;
      status.ap_ip = "---";
    }
  }

  status.last_reason = effective_ip_for_display(context.config, status) == "---" ? "no_ip" : "ip_ready";
  emit_network_logs(status);
}

}  // namespace

[[noreturn]] void run_bringup() {
  const BringupConfig bringup_config{};
  const LilygoT3V161BoardProfile profile = controller::hal::make_lilygo_t3_v1_6_1_profile(bringup_config.bench.test_pins);

  BringupRuntimeStatus bringup_status;
  WifiBringupContext wifi_context;

  ESP_LOGI(kLogTag, "Firmware start");
  ESP_LOGI(kLogTag, "Board profile selected: %s (%s)", profile.name(), profile.soc());
  ESP_LOGI(kLogTag, "OLED status target: GPIO%d SDA, GPIO%d SCL, reset %s",
           profile.oled().sda_pin,
           profile.oled().scl_pin,
           controller::hal::gpio_label(profile.oled().reset_pin).c_str());
  ESP_LOGI(
      kLogTag,
      "WiFi bring-up policy: STA %s, AP %s, OLED shows IP only",
      bringup_config.network.sta_enabled ? "enabled" : "disabled",
      bringup_config.network.ap_enabled ? "enabled" : "disabled");
  ESP_LOGI(
      kLogTag,
      "Stage 29 policy: web=%s bench_mode=%s rules=read-only",
      bringup_config.web.enabled ? "enabled" : "disabled",
      bringup_config.bench.enabled ? "enabled" : "disabled");
  log_test_pin_summary(profile);
  ESP_LOGI(
      kLogTag,
      "Safe boot mode: no automatic programs, rules, PID, motor or stepper runtime is started at boot");

  const auto validation_issues = profile.validate();
  if (!validation_issues.empty()) {
    bringup_status.safe_mode = true;
    bringup_status.safe_reason = validation_issues.front().message;
    log_profile_validation(validation_issues);
  }

  bringup_status.flash = evaluate_flash_sanity(bringup_config.flash);
  if (bringup_status.flash.mismatch) {
    bringup_status.safe_mode = true;
    if (bringup_status.safe_reason.empty()) {
      bringup_status.safe_reason = bringup_status.flash.warning_summary;
    }
  }

  if (!initialize_status_led(profile.status_led())) {
    ESP_LOGE(kLogTag, "Status LED init failed on GPIO%d", profile.status_led().gpio);
  }

  Esp32RelayHal relay_hal(profile.make_relay_channels());
  Esp32DigitalInputHal digital_input_hal(profile.make_digital_input_channels());
  Esp32AnalogInputHal analog_input_hal(profile.make_analog_input_channels());
  Esp32PwmHal pwm_hal(profile.make_pwm_channels());
  Esp32PulseInputHal pulse_input_hal(profile.make_pulse_input_channels());
  Esp32DisplayHal display_hal(profile.make_display_config());

  const bool display_ready = initialize_hal_step("Display HAL", [&]() {
    return display_hal.initialize();
  }, bringup_status.safe_reason);
  if (!display_ready) {
    bringup_status.safe_mode = true;
  }

  if (!initialize_hal_step("Relay HAL", [&]() {
        return relay_hal.initialize();
      }, bringup_status.safe_reason)) {
    bringup_status.safe_mode = true;
  }
  if (!initialize_hal_step("Digital Input HAL", [&]() {
        return digital_input_hal.initialize();
      }, bringup_status.safe_reason)) {
    bringup_status.safe_mode = true;
  }
  if (!initialize_hal_step("Analog Input HAL", [&]() {
        return analog_input_hal.initialize();
      }, bringup_status.safe_reason)) {
    bringup_status.safe_mode = true;
  }
  if (!initialize_hal_step("PWM HAL", [&]() {
        return pwm_hal.initialize();
      }, bringup_status.safe_reason)) {
    bringup_status.safe_mode = true;
  }
  if (!initialize_hal_step("Pulse Input HAL", [&]() {
        return pulse_input_hal.initialize();
      }, bringup_status.safe_reason)) {
    bringup_status.safe_mode = true;
  }

  if (initialize_nvs(bringup_status.safe_reason)) {
    if (!initialize_wifi_bringup(
            bringup_config.network,
            bringup_status.network,
            wifi_context,
            bringup_status.safe_reason)) {
      bringup_status.safe_mode = true;
    }
  } else {
    bringup_status.safe_mode = true;
  }

  refresh_network_status(wifi_context, monotonic_ms());

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE
  ESP_LOGI(kLogTag, "Stage 29 runtime init start");
  auto runtime_context = std::make_unique<EmbeddedRuntimeContext>(relay_hal, pwm_hal, pulse_input_hal, bringup_config);
  if (!initialize_runtime_context(
          *runtime_context,
          bringup_config,
          digital_input_hal,
          analog_input_hal,
          pulse_input_hal,
          bringup_status)) {
    bringup_status.safe_mode = true;
    bringup_status.runtime_status = "RUNTIME WARN";
  }
  ESP_LOGI(kLogTag, "Stage 29 runtime init complete");

  if (bringup_config.web.enabled) {
    ESP_LOGI(kLogTag, "HTTP server start requested on port %u", static_cast<unsigned>(bringup_config.web.port));
    std::string web_error;
    if (runtime_context->web_route_service.start(web_error)) {
      bringup_status.web_started = true;
      bringup_status.web_status = bringup_config.bench.enabled ? "WEB BENCH" : "WEB READY";
      ESP_LOGI(kLogTag, "HTTP server started");
    } else {
      bringup_status.safe_mode = true;
      bringup_status.web_status = "WEB FAIL";
      if (bringup_status.safe_reason.empty()) {
        bringup_status.safe_reason = web_error;
      }
      ESP_LOGE(kLogTag, "HTTP server failed to start: %s", web_error.c_str());
    }
  }
#else
  bringup_status.runtime_status = "RUNTIME OFF";
  bringup_status.web_status = "WEB OFF";
  ESP_LOGI(kLogTag, "Stage 27 bring-up path active: embedded web and bench runtime disabled");
#endif

  if (bringup_status.safe_mode) {
    ESP_LOGW(kLogTag, "Bring-up entered safe status mode: %s", bringup_status.safe_reason.c_str());
  } else {
    ESP_LOGI(kLogTag, "Bring-up entered normal safe-idle mode");
  }

  bool heartbeat_on = false;
  std::uint64_t last_heartbeat_ms = 0U;
  std::uint64_t last_network_poll_ms = 0U;
#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE
  std::uint64_t last_runtime_tick_ms = 0U;
#endif
  std::uint64_t last_status_screen_ms = 0U;

  while (true) {
    const auto now_ms = monotonic_ms();

    if (now_ms - last_heartbeat_ms >= kHeartbeatIntervalMs) {
      heartbeat_on = !heartbeat_on;
      set_status_led(profile.status_led(), heartbeat_on);
      last_heartbeat_ms = now_ms;
    }

    if (now_ms - last_network_poll_ms >= kNetworkPollIntervalMs) {
      refresh_network_status(wifi_context, now_ms);
      last_network_poll_ms = now_ms;
    }

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE
    if (now_ms - last_runtime_tick_ms >= kRuntimeTickIntervalMs) {
      tick_runtime(
          *runtime_context,
          digital_input_hal,
          analog_input_hal,
          bringup_config,
          bringup_status,
          now_ms);
      last_runtime_tick_ms = now_ms;
    }
#endif

    if (display_ready && now_ms - last_status_screen_ms >= kStatusScreenIntervalMs) {
      render_screen(display_hal, build_status_screen(bringup_config, bringup_status));
      last_status_screen_ms = now_ms;
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE
void bringup_task(void*) {
  run_bringup();
}
#endif

extern "C" void app_main() {
#if BRINGUP_ENABLE_WEB || BRINGUP_BENCH_MODE
  const BaseType_t task_result =
      xTaskCreatePinnedToCore(bringup_task, "stage29_bringup", kBringupTaskStackBytes, nullptr, kBringupTaskPriority, nullptr, 0);
  if (task_result != pdPASS) {
    ESP_LOGE(kLogTag, "Failed to start Stage 29 bring-up task");
    while (true) {
      vTaskDelay(pdMS_TO_TICKS(1000));
    }
  }

  ESP_LOGI(kLogTag, "Stage 29 bring-up task started with %u byte stack", static_cast<unsigned>(kBringupTaskStackBytes));
  return;
#else
  run_bringup();
#endif
}
