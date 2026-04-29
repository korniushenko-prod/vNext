import type { DeploymentConfig, IoBindingDefinition } from "./demoProject";

export type HardwareCapability = "di" | "do" | "ai" | "ao" | "counter" | "pwm";
export type BoardRuleClass = "warning" | "shared" | "exclusive" | "forbidden";

export interface ChipPinDefinition {
  gpio: number;
  capabilities: HardwareCapability[];
  internalPullup: boolean;
  inputOnly: boolean;
  strapping: boolean;
  forbidden: boolean;
  note: string;
}

export interface ChipTemplateDefinition {
  id: string;
  label: string;
  pins: ChipPinDefinition[];
}

export interface BoardRuleDefinition {
  id: string;
  feature: string;
  className: BoardRuleClass;
  owner: string;
  reason: string;
  alwaysOn: boolean;
  pins: number[];
}

export interface BoardTemplateDefinition {
  id: string;
  label: string;
  chipTemplateId: string;
  rules: BoardRuleDefinition[];
}

export interface ControllerTargetDefinition {
  id: string;
  label: string;
  boardTemplateIds: string[];
}

export interface BoardPinAssignment {
  bindingId: string;
  label: string;
  kind: NonNullable<IoBindingDefinition["bindingKind"]>;
  resourceId?: string;
}

export interface BoardRuleMatch {
  id: string;
  feature: string;
  className: BoardRuleClass;
  owner: string;
  reason: string;
}

export interface BoardPinRuntimeState {
  gpio: number;
  capabilities: HardwareCapability[];
  note: string;
  inputOnly: boolean;
  strapping: boolean;
  chipForbidden: boolean;
  assignments: BoardPinAssignment[];
  rules: BoardRuleMatch[];
  availability: "free" | "assigned" | "shared" | "warning" | "exclusive" | "forbidden" | "conflict";
  summary: string;
}

const CHIP_TEMPLATES: ChipTemplateDefinition[] = [
  {
    id: "esp32_wroom32",
    label: "ESP32-WROOM-32",
    pins: [
      { gpio: 0, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 1, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "UART TX" },
      { gpio: 2, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 3, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "UART RX" },
      { gpio: 4, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 5, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 12, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 13, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 14, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 15, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 16, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 17, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 18, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 19, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 21, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 22, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 23, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 25, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 26, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 27, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 32, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 33, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 34, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" },
      { gpio: 35, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" },
      { gpio: 36, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" },
      { gpio: 39, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" },
      { gpio: 6, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 7, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 8, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 9, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash / not broken out" },
      { gpio: 10, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash / not broken out" },
      { gpio: 11, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" }
    ]
  },
  {
    id: "esp8266ex",
    label: "ESP8266EX",
    pins: [
      { gpio: 0, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Boot strap" },
      { gpio: 1, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "UART TX" },
      { gpio: 2, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Boot strap" },
      { gpio: 3, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "UART RX" },
      { gpio: 4, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 5, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 12, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 13, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 14, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 15, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Boot strap" },
      { gpio: 16, capabilities: ["di", "do", "counter"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 17, capabilities: ["ai"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "ADC0 / board-dependent A0 mapping" },
      { gpio: 6, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 7, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 8, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 9, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 10, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" },
      { gpio: 11, capabilities: [], internalPullup: false, inputOnly: false, strapping: false, forbidden: true, note: "SPI flash" }
    ]
  },
  {
    id: "esp32_pico_d4",
    label: "ESP32-PICO-D4",
    pins: [
      { gpio: 0, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 1, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "UART TX" },
      { gpio: 2, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 3, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "UART RX" },
      { gpio: 4, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 5, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 9, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 10, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 12, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 13, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 14, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 15, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: true, forbidden: false, note: "Strapping pin" },
      { gpio: 18, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 19, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 21, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 22, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 23, capabilities: ["di", "do", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 25, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 26, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 27, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 32, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 33, capabilities: ["di", "do", "ai", "counter", "pwm"], internalPullup: true, inputOnly: false, strapping: false, forbidden: false, note: "" },
      { gpio: 34, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" },
      { gpio: 35, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" },
      { gpio: 36, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" },
      { gpio: 39, capabilities: ["di", "ai", "counter"], internalPullup: false, inputOnly: true, strapping: false, forbidden: false, note: "Input only" }
    ]
  }
];

const BOARD_TEMPLATES: BoardTemplateDefinition[] = [
  {
    id: "esp32_devkit_v1",
    label: "ESP32 DevKit V1",
    chipTemplateId: "esp32_wroom32",
    rules: [
      { id: "usb_uart", feature: "usb_uart", className: "warning", owner: "usb_uart", reason: "Shared with USB serial programming and monitor", alwaysOn: true, pins: [1, 3] },
      { id: "boot_straps", feature: "boot", className: "warning", owner: "boot", reason: "Strapping pins, use with caution", alwaysOn: true, pins: [0, 2, 5, 12, 15] },
      { id: "flash_bus", feature: "flash", className: "forbidden", owner: "flash", reason: "Connected to flash / not for user IO", alwaysOn: true, pins: [6, 7, 8, 9, 10, 11] },
      { id: "status_led", feature: "led", className: "shared", owner: "led", reason: "Typical on-board LED / board dependent", alwaysOn: false, pins: [2] }
    ]
  },
  {
    id: "nodemcu_32s",
    label: "NodeMCU-32S",
    chipTemplateId: "esp32_wroom32",
    rules: [
      { id: "usb_uart", feature: "usb_uart", className: "warning", owner: "usb_uart", reason: "Shared with USB serial programming and monitor", alwaysOn: true, pins: [1, 3] },
      { id: "boot_straps", feature: "boot", className: "warning", owner: "boot", reason: "Strapping pins, use with caution", alwaysOn: true, pins: [0, 2, 5, 12, 15] },
      { id: "flash_bus", feature: "flash", className: "forbidden", owner: "flash", reason: "Connected to flash / not for user IO", alwaysOn: true, pins: [6, 7, 8, 9, 10, 11] },
      { id: "status_led", feature: "led", className: "shared", owner: "led", reason: "Typical on-board LED / board dependent", alwaysOn: false, pins: [2] }
    ]
  },
  {
    id: "wemos_d1_mini32",
    label: "WEMOS D1 MINI ESP32",
    chipTemplateId: "esp32_wroom32",
    rules: [
      { id: "usb_uart", feature: "usb_uart", className: "warning", owner: "usb_uart", reason: "Shared with USB serial programming and monitor", alwaysOn: true, pins: [1, 3] },
      { id: "boot_straps", feature: "boot", className: "warning", owner: "boot", reason: "Strapping pins, use with caution", alwaysOn: true, pins: [0, 2, 5, 12, 15] },
      { id: "flash_bus", feature: "flash", className: "forbidden", owner: "flash", reason: "Connected to flash / not for user IO", alwaysOn: true, pins: [6, 7, 8, 9, 10, 11] },
      { id: "status_led", feature: "led", className: "shared", owner: "led", reason: "Typical on-board LED / board dependent", alwaysOn: false, pins: [2] }
    ]
  },
  {
    id: "nodemcu_v2_esp8266",
    label: "NodeMCU ESP8266",
    chipTemplateId: "esp8266ex",
    rules: [
      { id: "usb_uart", feature: "usb_uart", className: "warning", owner: "usb_uart", reason: "Shared with USB serial programming and monitor", alwaysOn: true, pins: [1, 3] },
      { id: "boot_straps", feature: "boot", className: "warning", owner: "boot", reason: "ESP8266 boot strap pins", alwaysOn: true, pins: [0, 2, 15] },
      { id: "flash_bus", feature: "flash", className: "forbidden", owner: "flash", reason: "Connected to SPI flash", alwaysOn: true, pins: [6, 7, 8, 9, 10, 11] },
      { id: "status_led", feature: "led", className: "shared", owner: "led", reason: "Typical on-board LED / board dependent", alwaysOn: false, pins: [2] }
    ]
  },
  {
    id: "wemos_d1_mini_esp8266",
    label: "WeMos D1 Mini ESP8266",
    chipTemplateId: "esp8266ex",
    rules: [
      { id: "usb_uart", feature: "usb_uart", className: "warning", owner: "usb_uart", reason: "Shared with USB serial programming and monitor", alwaysOn: true, pins: [1, 3] },
      { id: "boot_straps", feature: "boot", className: "warning", owner: "boot", reason: "ESP8266 boot strap pins", alwaysOn: true, pins: [0, 2, 15] },
      { id: "flash_bus", feature: "flash", className: "forbidden", owner: "flash", reason: "Connected to SPI flash", alwaysOn: true, pins: [6, 7, 8, 9, 10, 11] },
      { id: "status_led", feature: "led", className: "shared", owner: "led", reason: "Built-in LED on D4 / GPIO2 on common boards", alwaysOn: false, pins: [2] }
    ]
  },
  {
    id: "lilygo_t3_v1_6_1",
    label: "LilyGO T3 v1.6.1",
    chipTemplateId: "esp32_pico_d4",
    rules: [
      { id: "usb_uart", feature: "usb_uart", className: "warning", owner: "usb_uart", reason: "Shared with USB serial programming and monitor", alwaysOn: true, pins: [1, 3] },
      { id: "boot_straps", feature: "boot", className: "warning", owner: "boot", reason: "Strapping pins, use with caution", alwaysOn: true, pins: [0, 2, 5, 12, 15] },
      { id: "oled_bus", feature: "oled", className: "exclusive", owner: "oled", reason: "Reserved by OLED bus", alwaysOn: false, pins: [21, 22] },
      { id: "lora_bus", feature: "lora", className: "exclusive", owner: "lora", reason: "Reserved by LoRa radio", alwaysOn: false, pins: [5, 18, 19, 23, 26, 27, 32, 33] },
      { id: "sd_bus", feature: "sd", className: "exclusive", owner: "sd", reason: "Reserved by SD card interface", alwaysOn: false, pins: [2, 13, 14, 15] },
      { id: "status_led", feature: "led", className: "shared", owner: "led", reason: "On-board LED attached", alwaysOn: false, pins: [25] },
      { id: "battery_adc", feature: "battery", className: "warning", owner: "battery", reason: "Connected to battery sense divider", alwaysOn: false, pins: [35] },
      { id: "package_flash", feature: "boot", className: "forbidden", owner: "flash", reason: "Connected to package flash or internal package routing", alwaysOn: true, pins: [6, 7, 8, 11, 16, 17] }
    ]
  }
];

export const CONTROLLER_TARGETS: ControllerTargetDefinition[] = [
  {
    id: "shipcontroller-esp32",
    label: "ShipController ESP32",
    boardTemplateIds: BOARD_TEMPLATES.filter((template) => template.chipTemplateId.startsWith("esp32")).map((template) => template.id)
  },
  {
    id: "shipcontroller-esp8266",
    label: "ShipController ESP8266",
    boardTemplateIds: BOARD_TEMPLATES.filter((template) => template.chipTemplateId === "esp8266ex").map((template) => template.id)
  }
];

const bindingKindToCapability: Record<NonNullable<IoBindingDefinition["bindingKind"]>, HardwareCapability> = {
  digital_in: "di",
  digital_out: "do",
  analog_in: "ai",
  analog_out: "ao",
  counter: "counter",
  pwm: "pwm"
};

function isRuleActive(rule: BoardRuleDefinition, deployment: DeploymentConfig) {
  if (rule.alwaysOn) {
    return true;
  }

  switch (rule.feature) {
    case "oled":
      return deployment.oled.enabled;
    case "led":
      return deployment.led.enabled;
    default:
      return false;
  }
}

function summarizeAvailability(
  assignments: BoardPinAssignment[],
  rules: BoardRuleMatch[],
  chipForbidden: boolean
): BoardPinRuntimeState["availability"] {
  if (chipForbidden || rules.some((rule) => rule.className === "forbidden")) {
    return "forbidden";
  }
  if (assignments.length > 1) {
    return "conflict";
  }
  if (assignments.length === 1 && rules.some((rule) => rule.className === "exclusive")) {
    return "conflict";
  }
  if (rules.some((rule) => rule.className === "exclusive")) {
    return assignments.length ? "conflict" : "exclusive";
  }
  if (rules.some((rule) => rule.className === "warning")) {
    return assignments.length ? "assigned" : "warning";
  }
  if (rules.some((rule) => rule.className === "shared")) {
    return assignments.length ? "assigned" : "shared";
  }
  if (assignments.length) {
    return "assigned";
  }
  return "free";
}

function createSummary(
  pin: ChipPinDefinition,
  assignments: BoardPinAssignment[],
  rules: BoardRuleMatch[]
) {
  const parts: string[] = [];
  if (pin.note) {
    parts.push(pin.note);
  }
  if (rules.length) {
    parts.push(rules.map((rule) => rule.reason).join("; "));
  }
  if (assignments.length) {
    parts.push(assignments.map((assignment) => `${assignment.label} (${assignment.kind})`).join(", "));
  }
  return parts.join(" • ") || "Available for assignment.";
}

export function getChipTemplateOptions() {
  return CHIP_TEMPLATES;
}

export function getBoardTemplateOptions() {
  return BOARD_TEMPLATES;
}

export function getControllerTargetOptions() {
  return CONTROLLER_TARGETS;
}

export function getChipTemplateById(chipTemplateId: string) {
  return CHIP_TEMPLATES.find((template) => template.id === chipTemplateId) ?? null;
}

export function getBoardTemplateById(boardTemplateId: string) {
  return BOARD_TEMPLATES.find((template) => template.id === boardTemplateId) ?? null;
}

export function buildBoardPinRuntimeState(
  deployment: DeploymentConfig,
  bindings: IoBindingDefinition[]
) {
  const boardTemplate = getBoardTemplateById(deployment.controller.activeBoardTemplate);
  const chipTemplate =
    getChipTemplateById(deployment.controller.activeChipTemplate) ??
    (boardTemplate ? getChipTemplateById(boardTemplate.chipTemplateId) : null);

  if (!chipTemplate) {
    return {
      chipTemplate: null,
      boardTemplate,
      pins: [] as BoardPinRuntimeState[]
    };
  }

  const activeRules: BoardRuleMatch[] = (boardTemplate?.rules ?? [])
    .filter((rule) => isRuleActive(rule, deployment))
    .flatMap((rule) =>
      rule.pins.map(() => ({
        id: rule.id,
        feature: rule.feature,
        className: rule.className,
        owner: rule.owner,
        reason: rule.reason
      }))
    );

  const pins = chipTemplate.pins
    .slice()
    .sort((left, right) => left.gpio - right.gpio)
    .map((pin) => {
      const rules = (boardTemplate?.rules ?? [])
        .filter((rule) => isRuleActive(rule, deployment) && rule.pins.includes(pin.gpio))
        .map((rule) => ({
          id: rule.id,
          feature: rule.feature,
          className: rule.className,
          owner: rule.owner,
          reason: rule.reason
        }));

      const assignments = bindings
        .filter((binding) => binding.gpio === pin.gpio)
        .map((binding) => ({
          bindingId: binding.id,
          label: binding.signalId || binding.id,
          kind: binding.bindingKind ?? "digital_out",
          resourceId: binding.resourceId
        }));

      return {
        gpio: pin.gpio,
        capabilities: pin.capabilities,
        note: pin.note,
        inputOnly: pin.inputOnly,
        strapping: pin.strapping,
        chipForbidden: pin.forbidden,
        assignments,
        rules,
        availability: summarizeAvailability(assignments, rules, pin.forbidden),
        summary: createSummary(pin, assignments, rules)
      } satisfies BoardPinRuntimeState;
    });

  return {
    chipTemplate,
    boardTemplate,
    pins,
    activeRules
  };
}

export function isBindingCompatibleWithPin(
  binding: IoBindingDefinition,
  pin: BoardPinRuntimeState
) {
  const capability = binding.bindingKind ? bindingKindToCapability[binding.bindingKind] : null;
  if (!capability) {
    return false;
  }
  if (pin.availability === "forbidden" || pin.availability === "exclusive" || pin.availability === "conflict") {
    return false;
  }
  if (pin.inputOnly && (capability === "do" || capability === "ao" || capability === "pwm")) {
    return false;
  }
  return pin.capabilities.includes(capability);
}

export function findSuggestedGpio(
  binding: IoBindingDefinition,
  pins: BoardPinRuntimeState[]
) {
  return pins.find((pin) => isBindingCompatibleWithPin(binding, pin) && pin.assignments.length === 0)?.gpio;
}

export function summarizeBoardIssues(bindings: IoBindingDefinition[], pins: BoardPinRuntimeState[]) {
  const issues: Array<{ severity: "warning" | "fault"; message: string }> = [];

  for (const binding of bindings) {
    if (binding.gpio === undefined || binding.gpio === null) {
      issues.push({ severity: "warning", message: `${binding.id} is not assigned to any GPIO yet.` });
      continue;
    }

    const pin = pins.find((candidate) => candidate.gpio === binding.gpio);
    if (!pin) {
      issues.push({ severity: "fault", message: `${binding.id} points to GPIO${binding.gpio}, which is not part of the active chip template.` });
      continue;
    }

    if (!isBindingCompatibleWithPin(binding, pin)) {
      issues.push({ severity: "fault", message: `${binding.id} is not compatible with GPIO${pin.gpio}. Check capability, ownership or input-only restrictions.` });
    } else if (pin.rules.some((rule) => rule.className === "warning")) {
      issues.push({ severity: "warning", message: `${binding.id} uses GPIO${pin.gpio}, which has board warnings: ${pin.rules.map((rule) => rule.reason).join("; ")}.` });
    }
  }

  return issues;
}
