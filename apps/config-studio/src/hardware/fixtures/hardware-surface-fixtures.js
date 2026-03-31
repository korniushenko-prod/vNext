(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HardwareSurfaceFixtures = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  const HARDWARE_CATALOG_FIXTURE = Object.freeze({
    chips: {
      esp32_pico_d4: {
        id: "esp32_pico_d4",
        title: "ESP32-PICO-D4",
        family: "esp32",
        pins: {
          "5": { capabilities: ["di", "do", "counter", "pwm"], strapping: true, forbidden: false },
          "6": { capabilities: [], forbidden: true, note: "Package flash" },
          "7": { capabilities: [], forbidden: true, note: "Package flash" },
          "8": { capabilities: [], forbidden: true, note: "Package flash" },
          "11": { capabilities: [], forbidden: true, note: "Package flash" },
          "14": { capabilities: ["di", "do", "ai", "counter", "pwm"], forbidden: false },
          "16": { capabilities: [], forbidden: true, note: "Package flash routing" },
          "17": { capabilities: [], forbidden: true, note: "Package flash routing" },
          "18": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "19": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "21": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "22": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "23": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "25": { capabilities: ["di", "do", "ai", "counter", "pwm"], forbidden: false },
          "26": { capabilities: ["di", "do", "ai", "counter", "pwm"], forbidden: false },
          "27": { capabilities: ["di", "do", "ai", "counter", "pwm"], forbidden: false },
          "32": { capabilities: ["di", "do", "ai", "counter", "pwm"], forbidden: false },
          "33": { capabilities: ["di", "do", "ai", "counter", "pwm"], forbidden: false },
          "34": { capabilities: ["di", "ai", "counter"], input_only: true, forbidden: false },
          "35": { capabilities: ["di", "ai", "counter"], input_only: true, forbidden: false }
        }
      },
      esp32_c3: {
        id: "esp32_c3",
        title: "ESP32-C3",
        family: "esp32_c3",
        pins: {
          "2": { capabilities: ["di", "do", "counter", "pwm"], strapping: true, forbidden: false },
          "3": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "4": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "5": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "6": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "7": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "8": { capabilities: ["di", "do", "counter", "pwm"], strapping: true, forbidden: false },
          "9": { capabilities: ["di", "do", "counter", "pwm"], strapping: true, forbidden: false },
          "10": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "20": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false },
          "21": { capabilities: ["di", "do", "counter", "pwm"], forbidden: false }
        }
      }
    },
    boards: {
      lilygo_t3_v1_6_1: {
        id: "lilygo_t3_v1_6_1",
        title: "LilyGO T3 v1.6.1",
        chip_template_ref: "esp32_pico_d4",
        rules: {
          usb_uart: {
            id: "usb_uart",
            feature: "usb_uart",
            class: "warning",
            owner: "usb_uart",
            reason: "Shared with USB serial programming and monitor",
            always_on: true,
            pins: [1, 3]
          },
          oled_bus: {
            id: "oled_bus",
            feature: "oled",
            class: "exclusive",
            owner: "oled",
            reason: "Reserved by OLED bus",
            pins: [21, 22]
          },
          lora_bus: {
            id: "lora_bus",
            feature: "lora",
            class: "exclusive",
            owner: "lora",
            reason: "Reserved by LoRa radio",
            pins: [5, 18, 19, 23, 26, 27, 32, 33]
          },
          status_led: {
            id: "status_led",
            feature: "led",
            class: "shared",
            owner: "led",
            reason: "On-board LED attached",
            pins: [25]
          },
          battery_adc: {
            id: "battery_adc",
            feature: "battery",
            class: "warning",
            owner: "battery",
            reason: "Connected to battery sense divider",
            pins: [35]
          },
          package_flash: {
            id: "package_flash",
            feature: "boot",
            class: "forbidden",
            owner: "flash",
            reason: "Connected to package flash or package routing",
            always_on: true,
            pins: [6, 7, 8, 11, 16, 17]
          }
        }
      },
      esp32_c3_super_mini: {
        id: "esp32_c3_super_mini",
        title: "ESP32-C3 Super Mini",
        chip_template_ref: "esp32_c3",
        rules: {
          usb_uart: {
            id: "usb_uart",
            feature: "usb_uart",
            class: "warning",
            owner: "usb_uart",
            reason: "Shared with USB serial programming and monitor",
            always_on: true,
            pins: [20, 21]
          },
          status_led: {
            id: "status_led",
            feature: "led",
            class: "shared",
            owner: "led",
            reason: "Built-in LED",
            pins: [8]
          }
        }
      }
    },
    presets: {
      lilygo_t3_v1_6_1_oled_lora_builtin_led: {
        id: "lilygo_t3_v1_6_1_oled_lora_builtin_led",
        title: "LilyGO T3 OLED + LoRa + Built-in LED",
        chip_template_ref: "esp32_pico_d4",
        board_template_ref: "lilygo_t3_v1_6_1",
        active_rule_ids: ["oled_bus", "lora_bus", "status_led", "battery_adc"],
        resources: {
          builtin_led: {
            id: "builtin_led",
            title: "Built-in LED",
            gpio: 25,
            capabilities: ["do", "pwm"],
            allowed_gpios: [25]
          },
          analog_in_1: {
            id: "analog_in_1",
            title: "Analog Input 1",
            gpio: 34,
            capabilities: ["di", "ai", "counter"],
            allowed_gpios: [34, 35]
          },
          general_output_1: {
            id: "general_output_1",
            title: "General Output 1",
            gpio: 14,
            capabilities: ["do", "pwm"],
            allowed_gpios: [4, 12, 13, 14, 15, 16, 25]
          }
        },
        reserved_pins: {
          i2c_sda: 21,
          i2c_scl: 22
        }
      },
      esp32_c3_super_mini_minimal: {
        id: "esp32_c3_super_mini_minimal",
        title: "ESP32-C3 Super Mini Minimal",
        chip_template_ref: "esp32_c3",
        board_template_ref: "esp32_c3_super_mini",
        active_rule_ids: ["status_led"],
        resources: {
          builtin_led: {
            id: "builtin_led",
            title: "Built-in LED",
            gpio: 8,
            capabilities: ["do", "pwm"],
            allowed_gpios: [8]
          },
          digital_in_1: {
            id: "digital_in_1",
            title: "Digital Input 1",
            gpio: 3,
            capabilities: ["di", "counter"],
            allowed_gpios: [2, 3, 4, 5]
          },
          digital_out_1: {
            id: "digital_out_1",
            title: "Digital Output 1",
            gpio: 10,
            capabilities: ["do", "pwm"],
            allowed_gpios: [6, 7, 10]
          }
        },
        reserved_pins: {
          usb_dp: 20,
          usb_dm: 21
        }
      }
    }
  });

  const READONLY_HARDWARE_FIXTURES = Object.freeze([
    {
      id: "hardware-readonly-lilygo",
      title: "LilyGO T3 Hardware Manifest",
      description: "Frozen read-only hardware surface for the accepted LilyGO target preset lane.",
      target_preset_ref: "lilygo_t3_v1_6_1_oled_lora_builtin_led",
      chip_template_ref: "esp32_pico_d4",
      chip_title: "ESP32-PICO-D4",
      board_template_ref: "lilygo_t3_v1_6_1",
      board_title: "LilyGO T3 v1.6.1",
      active_rule_ids: ["oled_bus", "lora_bus", "status_led", "battery_adc"],
      reserved_pins: {
        i2c_sda: 21,
        i2c_scl: 22
      },
      forbidden_pins: [5, 6, 7, 8, 11, 16, 17, 18, 19, 21, 22, 23, 26, 27, 32, 33],
      resources: [
        {
          id: "builtin_led",
          title: "Built-in LED",
          gpio: 25,
          capabilities: ["do", "pwm"],
          allowed_gpios: [25],
          note: "Bound to on-board status LED."
        },
        {
          id: "analog_in_1",
          title: "Analog Input 1",
          gpio: 34,
          capabilities: ["di", "ai", "counter"],
          allowed_gpios: [34, 35],
          note: "Primary analog sensing lane."
        },
        {
          id: "general_output_1",
          title: "General Output 1",
          gpio: 14,
          capabilities: ["do", "pwm"],
          allowed_gpios: [4, 12, 13, 14, 15, 16, 25],
          note: "General-purpose output lane."
        }
      ],
      diagnostics: [],
      boundary_notes: [
        "Read-only hardware view only. No target transport, no runtime drift, and no UI editor hooks are introduced in PR-H3.",
        "Preset resources remain authoring guidance over the frozen hardware catalog."
      ]
    },
    {
      id: "hardware-readonly-esp32-c3",
      title: "ESP32-C3 Super Mini Hardware Manifest",
      description: "Frozen read-only hardware surface for the accepted ESP32-C3 target preset lane.",
      target_preset_ref: "esp32_c3_super_mini_minimal",
      chip_template_ref: "esp32_c3",
      chip_title: "ESP32-C3",
      board_template_ref: "esp32_c3_super_mini",
      board_title: "ESP32-C3 Super Mini",
      active_rule_ids: ["status_led"],
      reserved_pins: {
        usb_dp: 20,
        usb_dm: 21
      },
      forbidden_pins: [],
      resources: [
        {
          id: "builtin_led",
          title: "Built-in LED",
          gpio: 8,
          capabilities: ["do", "pwm"],
          allowed_gpios: [8],
          note: "Fixed to the on-board LED lane."
        },
        {
          id: "digital_in_1",
          title: "Digital Input 1",
          gpio: 3,
          capabilities: ["di", "counter"],
          allowed_gpios: [2, 3, 4, 5],
          note: "Primary digital sensing lane."
        },
        {
          id: "digital_out_1",
          title: "Digital Output 1",
          gpio: 10,
          capabilities: ["do", "pwm"],
          allowed_gpios: [6, 7, 10],
          note: "Primary digital actuation lane."
        }
      ],
      diagnostics: [],
      boundary_notes: [
        "Read-only hardware view only. This fixture stays target-neutral and does not imply a live target editor.",
        "Reserved USB pins remain visible as guidance for bench-safe commissioning."
      ]
    },
    {
      id: "hardware-readonly-invalid",
      title: "Invalid Hardware Manifest Diagnostics",
      description: "Degraded read-only hardware fixture that surfaces manifest diagnostics before materialize/apply.",
      target_preset_ref: "lilygo_t3_v1_6_1_oled_lora_builtin_led",
      chip_template_ref: "esp32_pico_d4",
      chip_title: "ESP32-PICO-D4",
      board_template_ref: "lilygo_t3_v1_6_1",
      board_title: "LilyGO T3 v1.6.1",
      active_rule_ids: ["oled_bus", "lora_bus", "status_led", "battery_adc"],
      reserved_pins: {
        i2c_sda: 21,
        i2c_scl: 22
      },
      forbidden_pins: [5, 6, 7, 8, 11, 16, 17, 18, 19, 21, 22, 23, 26, 27, 32, 33],
      resources: [
        {
          id: "builtin_led",
          title: "Built-in LED",
          gpio: 16,
          capabilities: ["do", "pwm"],
          allowed_gpios: [25],
          note: "Invalid override shown for diagnostics only."
        },
        {
          id: "analog_in_1",
          title: "Analog Input 1",
          gpio: 21,
          capabilities: ["di", "ai", "counter"],
          allowed_gpios: [34, 35],
          note: "Reserved bus collision shown for diagnostics only."
        }
      ],
      diagnostics: [
        {
          code: "hardware_resolution.pin.forbidden",
          severity: "error",
          message: "Hardware binding `builtin_led` uses forbidden GPIO 16."
        },
        {
          code: "hardware_resolution.pin.reserved_conflict",
          severity: "error",
          message: "Hardware binding `analog_in_1` collides with reserved pin `i2c_sda` on GPIO 21."
        }
      ],
      boundary_notes: [
        "Diagnostics surface only. This fixture exists to show conflicts before materialize/apply.",
        "No edit actions are exposed in the read-only lane."
      ]
    }
  ]);

  const EDITABLE_HARDWARE_PROJECT_FIXTURES = Object.freeze([
    createEditableProjectFixture({
      id: "hardware-editable-lilygo",
      catalog: HARDWARE_CATALOG_FIXTURE,
      projectId: "hardware_lilygo_editor_demo",
      title: "Hardware LilyGO Editor Demo",
      targetPresetRef: "lilygo_t3_v1_6_1_oled_lora_builtin_led",
      resourceBindings: {
        builtin_led: { gpio: 25 },
        analog_in_1: { gpio: 34 },
        general_output_1: { gpio: 14 }
      }
    }),
    createEditableProjectFixture({
      id: "hardware-editable-esp32-c3",
      catalog: HARDWARE_CATALOG_FIXTURE,
      projectId: "hardware_esp32_c3_editor_demo",
      title: "Hardware ESP32-C3 Editor Demo",
      targetPresetRef: "esp32_c3_super_mini_minimal",
      resourceBindings: {
        builtin_led: { gpio: 8 },
        digital_in_1: { gpio: 3 },
        digital_out_1: { gpio: 10 }
      }
    })
  ]);

  const READONLY_HARDWARE_FIXTURE_IDS = Object.freeze(READONLY_HARDWARE_FIXTURES.map((entry) => entry.id));
  const EDITABLE_HARDWARE_FIXTURE_IDS = Object.freeze(EDITABLE_HARDWARE_PROJECT_FIXTURES.map((entry) => entry.id));

  return {
    HARDWARE_CATALOG_FIXTURE,
    READONLY_HARDWARE_FIXTURES,
    READONLY_HARDWARE_FIXTURE_IDS,
    EDITABLE_HARDWARE_PROJECT_FIXTURES,
    EDITABLE_HARDWARE_FIXTURE_IDS
  };
});

function createEditableProjectFixture({ id, catalog, projectId, title, targetPresetRef, resourceBindings }) {
  return Object.freeze({
    id,
    model: {
      schema_version: "0.4.0",
      meta: {
        project_id: projectId,
        title
      },
      imports: {
        libraries: [],
        packages: []
      },
      definitions: {
        object_types: {}
      },
      system: {
        instances: {},
        signals: {},
        routes: {},
        alarms: {}
      },
      hardware: {
        modules: [],
        bindings: {},
        catalog: clone(catalog),
        manifest: {
          target_preset_ref: targetPresetRef,
          resource_bindings: clone(resourceBindings)
        }
      },
      views: {
        screens: {}
      },
      layouts: {
        system: {
          instances: {},
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        definitions: {}
      }
    }
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
