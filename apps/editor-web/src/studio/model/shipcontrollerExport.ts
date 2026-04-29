import type {
  DeploymentDisplayScreenConfig,
  DeploymentDisplayWidgetConfig,
  IoBindingDefinition,
  PlcObjectDefinition,
  UniversalPlcDemoProject
} from "./demoProject";

export interface ShipControllerExportConfig {
  config_version: number;
  system: {
    active_board: string;
    active_board_template: string;
    active_chip_template: string;
  };
  wifi: {
    mode: string;
    ssid: string;
    password: string;
    ap_ssid: string;
    ap_password: string;
    startup_policy: string;
  };
  oled: {
    enabled: boolean;
    show_ip_on_fallback: boolean;
    width: number;
    height: number;
    sda: number;
    scl: number;
    address: number;
  };
  led: {
    enabled: boolean;
    pin: number;
  };
  channels: Record<
    string,
    {
      resource: string;
      type: string;
      inverted: boolean;
      initial: boolean;
      pullup: boolean;
    }
  >;
  signals: Record<
    string,
    {
      label: string;
      type: string;
      units?: string;
    }
  >;
  display: {
    enabled: boolean;
    driver: string;
    width: number;
    height: number;
    rotation: number;
    startup_screen: string;
    default_language: string;
    screens: Record<
      string,
      {
        label: string;
        group: string;
        visible_if: string;
        refresh_ms: number;
        auto_cycle_ms: number;
        widgets: Record<
          string,
          {
            type: string;
            label: string;
            signal: string;
            visible_if: string;
            x: number;
            y: number;
            w: number;
            h: number;
            format: Record<string, unknown>;
            style: Record<string, unknown>;
          }
        >;
      }
    >;
  };
  native_primitives: {
    blink_relays: Record<
      string,
      {
        object_id: string;
        enabled: boolean;
        on_duration_s: number;
        off_duration_s: number;
        output_binding_id: string;
        oled_screen_id: string;
      }
    >;
  };
}

function parseOledAddress(value: string) {
  if (value.startsWith("0x") || value.startsWith("0X")) {
    const parsed = Number.parseInt(value.slice(2), 16);
    return Number.isFinite(parsed) ? parsed : 0x3c;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0x3c;
}

function mapBindingKindToChannelType(binding: IoBindingDefinition) {
  switch (binding.bindingKind) {
    case "digital_in":
      return "di";
    case "analog_in":
      return "ai";
    case "analog_out":
      return "ao";
    case "counter":
      return "counter";
    case "pwm":
      return "pwm";
    case "digital_out":
    default:
      return "do";
  }
}

function mapDisplayWidgetType(widget: DeploymentDisplayWidgetConfig) {
  switch (widget.type) {
    case "bool":
      return "status";
    case "number":
      return widget.signalKey.toLowerCase().includes("remaining") ? "timer" : "value";
    case "text":
    default:
      return "value";
  }
}

function exportDisplayScreens(screens: DeploymentDisplayScreenConfig[]) {
  return Object.fromEntries(
    screens.map((screen) => [
      screen.id,
      {
        label: screen.label,
        group: "operator",
        visible_if: "",
        refresh_ms: screen.refreshMs,
        auto_cycle_ms: 0,
        widgets: Object.fromEntries(
          screen.widgets.map((widget) => [
            widget.id,
            {
              type: mapDisplayWidgetType(widget),
              label: widget.label,
              signal: widget.signalKey,
              visible_if: "",
              x: widget.x,
              y: widget.y,
              w: widget.w,
              h: widget.h,
              format: {
                units: widget.signalKey.toLowerCase().includes("remaining") ? "s" : "",
                precision: 0,
                duration_style: widget.signalKey.toLowerCase().includes("remaining") ? "seconds" : "",
                true_text: "ON",
                false_text: "OFF",
                prefix: "",
                suffix: "",
                empty_text: "--"
              },
              style: {
                font: "small",
                align: "left",
                invert: false,
                emphasis: widget.signalKey.toLowerCase().includes("relay"),
                frame: false,
                color_role: "default"
              }
            }
          ])
        )
      }
    ])
  );
}

function exportChannels(bindings: IoBindingDefinition[]) {
  return Object.fromEntries(
    bindings.map((binding) => [
      binding.id,
      {
        resource: binding.resourceId || binding.physicalSource,
        type: mapBindingKindToChannelType(binding),
        inverted: Boolean(binding.inverted),
        initial: Boolean(binding.initialState),
        pullup: false
      }
    ])
  );
}

function exportBlinkSignals(blinkObjects: PlcObjectDefinition[]) {
  const signals: ShipControllerExportConfig["signals"] = {
    "system.ipAddress": {
      label: "IP Address",
      type: "substitute"
    }
  };

  for (const object of blinkObjects) {
    signals[`${object.id}.relayState`] = {
      label: `${object.name} Relay`,
      type: "substitute"
    };
    signals[`${object.id}.phase`] = {
      label: `${object.name} Phase`,
      type: "substitute"
    };
    signals[`${object.id}.remainingSeconds`] = {
      label: `${object.name} Remaining`,
      type: "substitute",
      units: "s"
    };
  }

  return signals;
}

function exportBlinkPrimitives(blinkObjects: PlcObjectDefinition[]) {
  return Object.fromEntries(
    blinkObjects.map((object) => [
      object.id,
      {
        object_id: object.id,
        enabled: Boolean(object.nativeConfig?.enabled ?? true),
        on_duration_s: Number(object.nativeConfig?.onDurationS ?? 5),
        off_duration_s: Number(object.nativeConfig?.offDurationS ?? 10),
        output_binding_id: String(object.nativeConfig?.outputBindingId ?? ""),
        oled_screen_id: String(object.nativeConfig?.oledScreenId ?? "oled_blink_status")
      }
    ])
  );
}

export function exportProjectToShipcontrollerConfig(
  project: UniversalPlcDemoProject
): ShipControllerExportConfig {
  const blinkObjects = project.objects.filter((object) => object.type === "BlinkRelayPrimitive");
  const startupScreenId = project.deployment.displayScreens[0]?.id || "main";

  return {
    config_version: 2,
    system: {
      active_board: project.deployment.controller.activeBoard,
      active_board_template: project.deployment.controller.activeBoardTemplate,
      active_chip_template: project.deployment.controller.activeChipTemplate
    },
    wifi: {
      mode: project.deployment.wifi.mode,
      ssid: project.deployment.wifi.ssid,
      password: project.deployment.wifi.password,
      ap_ssid: project.deployment.wifi.apSsid,
      ap_password: project.deployment.wifi.apPassword,
      startup_policy: project.deployment.wifi.startupPolicy
    },
    oled: {
      enabled: project.deployment.oled.enabled,
      show_ip_on_fallback: project.deployment.oled.showIpOnFallback,
      width: project.deployment.oled.width,
      height: project.deployment.oled.height,
      sda: project.deployment.oled.sda,
      scl: project.deployment.oled.scl,
      address: parseOledAddress(project.deployment.oled.address)
    },
    led: {
      enabled: project.deployment.led.enabled,
      pin: project.deployment.led.pin
    },
    channels: exportChannels(project.bindings),
    signals: exportBlinkSignals(blinkObjects),
    display: {
      enabled: project.deployment.oled.enabled,
      driver: `ssd1306_${project.deployment.oled.width}x${project.deployment.oled.height}`,
      width: project.deployment.oled.width,
      height: project.deployment.oled.height,
      rotation: 0,
      startup_screen: startupScreenId,
      default_language: "ru",
      screens: exportDisplayScreens(project.deployment.displayScreens)
    },
    native_primitives: {
      blink_relays: exportBlinkPrimitives(blinkObjects)
    }
  };
}
