set(COMPONENT_SRCS
    "main.cpp"
    "../firmware/components/hal/src/esp32_relay_hal.cpp"
    "../firmware/components/hal/src/esp32_digital_input_hal.cpp"
    "../firmware/components/hal/src/esp32_analog_input_hal.cpp"
    "../firmware/components/hal/src/esp32_pwm_hal.cpp"
    "../firmware/components/hal/src/esp32_pulse_input_hal.cpp"
    "../firmware/components/hal/src/esp32_display_hal.cpp"
    "../firmware/components/signals/src/signal_registry.cpp"
    "../firmware/components/alarms/src/alarm_history.cpp"
    "../firmware/components/alarms/src/alarm_service.cpp"
    "../firmware/components/actuators/src/actuator_manager.cpp"
    "../firmware/components/timers/src/timer_service.cpp"
    "../firmware/components/conditions/src/condition_evaluator.cpp"
    "../firmware/components/config/src/config_validation.cpp"
    "../firmware/components/config/src/config_defaults.cpp"
    "../firmware/components/storage/src/storage_crc.cpp"
    "../firmware/components/storage/src/storage_service.cpp"
    "../firmware/components/storage/src/storage_event_log.cpp"
    "../firmware/components/flow/src/flow_history.cpp"
    "../firmware/components/flow/src/flow_service.cpp"
    "../firmware/components/logic/src/rule_history.cpp"
    "../firmware/components/logic/src/logic_service.cpp"
    "../firmware/components/sequence/src/sequence_history.cpp"
    "../firmware/components/sequence/src/sequence_service.cpp"
    "../firmware/components/api/src/sequence_api_service.cpp"
    "../firmware/components/api/src/web_dashboard_adapter.cpp"
    "../firmware/components/api/src/flow_api_service.cpp"
    "../firmware/components/api/src/web_flow_adapter.cpp"
    "../firmware/components/api/src/rules_api_service.cpp"
    "../firmware/components/api/src/web_rules_adapter.cpp"
    "../firmware/components/web/src/web_asset_registry.cpp"
    "../firmware/components/web/src/web_route_service.cpp")

set(COMPONENT_INCLUDES
    "."
    "../firmware/components/hal/include"
    "../firmware/components/signals/include"
    "../firmware/components/alarms/include"
    "../firmware/components/actuators/include"
    "../firmware/components/timers/include"
    "../firmware/components/conditions/include"
    "../firmware/components/config/include"
    "../firmware/components/storage/include"
    "../firmware/components/flow/include"
    "../firmware/components/logic/include"
    "../firmware/components/sequence/include"
    "../firmware/components/api/include"
    "../firmware/components/web/include")

idf_component_register(
    SRCS ${COMPONENT_SRCS}
    INCLUDE_DIRS ${COMPONENT_INCLUDES}
    REQUIRES driver esp_timer esp_http_server json nvs_flash esp_wifi esp_netif)

target_compile_features(${COMPONENT_LIB} PUBLIC cxx_std_17)
target_compile_definitions(${COMPONENT_LIB} PRIVATE CONTROLLER_STAGE27_MINIMAL_DISPLAY=1)
