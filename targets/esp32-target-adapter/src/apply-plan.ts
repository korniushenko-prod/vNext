import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import { checkEsp32Compatibility } from "./compatibility.js";
import { sortedKeys } from "./sort.js";
import type { Esp32ApplyPlan, Esp32ApplyPlanStep } from "./types.js";

export function buildEsp32ApplyPlan(pack: RuntimePack): Esp32ApplyPlan {
  const compatibility = checkEsp32Compatibility(pack);

  const steps: Esp32ApplyPlanStep[] = [
    {
      id: "step_validate_pack",
      kind: "validate_pack",
      target_ids: [pack.pack_id]
    },
    {
      id: "step_stage_instances",
      kind: "stage_instances",
      target_ids: sortedKeys(pack.instances)
    },
    {
      id: "step_stage_connections",
      kind: "stage_connections",
      target_ids: sortedKeys(pack.connections)
    },
    {
      id: "step_stage_resources",
      kind: "stage_resources",
      target_ids: sortedKeys(pack.resources)
    },
    {
      id: "step_finalize_report",
      kind: "finalize_report",
      target_ids: [pack.pack_id]
    }
  ];

  return {
    target_id: "esp32-shipcontroller",
    pack_id: pack.pack_id,
    steps,
    diagnostics: compatibility.diagnostics
  };
}