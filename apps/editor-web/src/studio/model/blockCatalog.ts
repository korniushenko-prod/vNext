export type CatalogDataType = "bool" | "number" | "string" | "enum";

export interface CatalogPortSeed {
  name: string;
  dataType?: CatalogDataType;
  summary?: string;
}

export interface BlockCatalogEntry {
  id: string;
  kind: string;
  label: string;
  groupId: "simple-blocks" | "function-blocks";
  groupLabel: string;
  summary: string;
  inputs: CatalogPortSeed[];
  outputs: CatalogPortSeed[];
}

export const BUILTIN_BLOCK_CATALOG: BlockCatalogEntry[] = [
  {
    id: "and",
    kind: "AND",
    label: "AND",
    groupId: "simple-blocks",
    groupLabel: "Simple Blocks",
    summary: "Boolean AND gate.",
    inputs: [{ name: "in1" }, { name: "in2" }],
    outputs: [{ name: "out" }]
  },
  {
    id: "or",
    kind: "OR",
    label: "OR",
    groupId: "simple-blocks",
    groupLabel: "Simple Blocks",
    summary: "Boolean OR gate.",
    inputs: [{ name: "in1" }, { name: "in2" }],
    outputs: [{ name: "out" }]
  },
  {
    id: "not",
    kind: "NOT",
    label: "NOT",
    groupId: "simple-blocks",
    groupLabel: "Simple Blocks",
    summary: "Boolean inversion gate.",
    inputs: [{ name: "in" }],
    outputs: [{ name: "out" }]
  },
  {
    id: "comparator",
    kind: "Comparator",
    label: "Comparator",
    groupId: "simple-blocks",
    groupLabel: "Simple Blocks",
    summary: "Compares values against a threshold or another signal.",
    inputs: [{ name: "value", dataType: "number" }, { name: "setpoint", dataType: "number" }],
    outputs: [{ name: "ok" }]
  },
  {
    id: "setpoint",
    kind: "Setpoint",
    label: "Setpoint",
    groupId: "simple-blocks",
    groupLabel: "Simple Blocks",
    summary: "Provides a named engineering setpoint inside the object.",
    inputs: [],
    outputs: [{ name: "value", dataType: "number" }]
  },
  {
    id: "ton",
    kind: "TON",
    label: "TON",
    groupId: "function-blocks",
    groupLabel: "Function Blocks",
    summary: "On-delay timer.",
    inputs: [{ name: "in" }, { name: "pt", dataType: "number" }],
    outputs: [{ name: "q" }, { name: "et", dataType: "number" }]
  },
  {
    id: "selector",
    kind: "Selector",
    label: "Selector",
    groupId: "function-blocks",
    groupLabel: "Function Blocks",
    summary: "Selects one result from multiple candidates.",
    inputs: [{ name: "inA" }, { name: "inB" }, { name: "select", dataType: "enum" }],
    outputs: [{ name: "out" }]
  },
  {
    id: "latch",
    kind: "Latch",
    label: "Latch",
    groupId: "function-blocks",
    groupLabel: "Function Blocks",
    summary: "Stores a command until reset.",
    inputs: [{ name: "set" }, { name: "reset" }],
    outputs: [{ name: "out" }]
  }
];

export const BUILTIN_BLOCK_LIBRARY_GROUPS = BUILTIN_BLOCK_CATALOG.reduce<
  Array<{ id: "simple-blocks" | "function-blocks"; label: string; items: BlockCatalogEntry[] }>
>((groups, entry) => {
  const existing = groups.find((group) => group.id === entry.groupId);
  if (existing) {
    existing.items.push(entry);
    return groups;
  }

  groups.push({
    id: entry.groupId,
    label: entry.groupLabel,
    items: [entry]
  });
  return groups;
}, []);

export function getBuiltinBlockByKind(kind: string) {
  return BUILTIN_BLOCK_CATALOG.find((entry) => entry.kind === kind) ?? null;
}
