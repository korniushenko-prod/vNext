import { readFileSync } from "node:fs";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

const WORKSPACE_ROOT_URL = new URL("../../../../", import.meta.url);

function loadWorkspaceJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, WORKSPACE_ROOT_URL), "utf8")) as T;
}

export const commBridgeRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/comm-bridge.runtime-pack.snapshot.json"
);

export const remotePointFrontendRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/remote-point-frontend.runtime-pack.snapshot.json"
);

export const combinedRemotePointRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/combined-remote-point.runtime-pack.snapshot.json"
);

export function createCombinedRemotePointRuntimePack(): RuntimePack {
  return structuredClone(combinedRemotePointRuntimePack);
}
