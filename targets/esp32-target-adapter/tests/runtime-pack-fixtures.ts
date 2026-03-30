import { readFileSync } from "node:fs";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

const WORKSPACE_ROOT_URL = new URL("../../../../", import.meta.url);

function loadWorkspaceJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, WORKSPACE_ROOT_URL), "utf8")) as T;
}

export const capabilityHardeningRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/capability-hardening-demo.runtime-pack.snapshot.json"
);

export const timedRelayRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/timed-relay.runtime-pack.snapshot.json"
);

export const pulseFlowmeterRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/pulse-flowmeter.runtime-pack.snapshot.json"
);

export const pidControllerRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/pid-controller.runtime-pack.snapshot.json"
);

export const pidControllerAutotuneExecutionRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/pid-controller-autotune-execution.runtime-pack.snapshot.json"
);

export const boilerPackageRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/boiler-package-skeleton.runtime-pack.snapshot.json"
);

export const boilerSupervisorRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/boiler-supervisor.runtime-pack.snapshot.json"
);

export const boilerSupervisorCoordinationRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/boiler-supervisor-coordination.runtime-pack.snapshot.json"
);

export const boilerSupervisorProtectionRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/boiler-supervisor-protection.runtime-pack.snapshot.json"
);

export const pumpSkidSupervisorProtectionRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/pump-skid-supervisor-protection.runtime-pack.snapshot.json"
);

export const boilerSupervisorArbitrationRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/boiler-supervisor-arbitration.runtime-pack.snapshot.json"
);

export const pumpSkidSupervisorArbitrationRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/pump-skid-supervisor-arbitration.runtime-pack.snapshot.json"
);

export const boilerSupervisorOverridesRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/boiler-supervisor-overrides.runtime-pack.snapshot.json"
);

export const pumpSkidSupervisorOverridesRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/pump-skid-supervisor-overrides.runtime-pack.snapshot.json"
);

export const pumpSkidSupervisorPilotRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/pump-skid-supervisor.runtime-pack.snapshot.json"
);
