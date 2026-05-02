import { create } from "zustand";
import {
  createEmptyProjectDocument,
  createDefaultDeploymentConfig,
  ensureBlinkOledScreenPreset,
  createObjectDefinition,
  rebuildObjectFromTemplate,
  createObjectCompositionLinkDefinition,
  cloneProjectDocument,
  createObjectStructureRouteDefinition,
  createObjectStructureDefinition,
  createObjectStructureNodeDefinition,
  createObjectPortDefinition,
  createProjectId,
  loadDemoProject,
  type DeploymentConfig,
  type BehaviorKind,
  type DataType,
  type IoBindingDefinition,
  type ObjectContractFamily,
  type ObjectStructureNodeDefinition,
  type UniversalPlcDemoProject,
  type WorkspaceId
} from "../model/demoProject";
import { loadProjectDocument } from "../model/projectLoader";

export type SelectedItemType =
  | "project"
  | "object"
  | "object-link"
  | "subobject"
  | "machine"
  | "group"
  | "section"
  | "region"
  | "state"
  | "transition"
  | "signal"
  | "block"
  | "binding"
  | null;
export type MachineFilterMode = "all" | "focus" | "region";
export type MachineViewMode = "topology" | "object";
export type ObjectViewLens = "behavior" | "structure";

export interface SelectItemOptions {
  objectId?: string | null;
  machineId?: string | null;
  groupId?: string | null;
  sectionId?: string | null;
  regionId?: string | null;
}

export interface LogicWorkspaceContext {
  title: string;
  signalIds: string[];
  blockIds: string[];
}

export interface BindWorkspaceContext {
  title: string;
  bindingIds: string[];
}

export interface OverlayAnchorPoint {
  left: number;
  top: number;
}

interface StudioState {
  activeWorkspace: WorkspaceId;
  graphScopeStack: string[];
  sequenceScopeNodeId: string | null;
  selectedItemId: string | null;
  selectedItemType: SelectedItemType;
  selectedObjectId: string | null;
  selectedMachineId: string | null;
  selectedGroupId: string | null;
  selectedSectionId: string | null;
  selectedRegionId: string | null;
  machineViewMode: MachineViewMode;
  objectViewLens: ObjectViewLens;
  machineFilterMode: MachineFilterMode;
  logicContext: LogicWorkspaceContext | null;
  bindContext: BindWorkspaceContext | null;
  projectSource: "bundled" | "remote" | "authoring" | "local";
  projectPath: string | null;
  projectLoadState: "idle" | "loading" | "ready";
  projectLoadError: string | null;
  project: UniversalPlcDemoProject;
  setActiveWorkspace: (workspace: WorkspaceId) => void;
  enterGraphScope: (objectId: string, options?: { machineId?: string | null }) => void;
  exitGraphScope: () => void;
  clearGraphScope: () => void;
  enterSequenceScope: (nodeId: string) => void;
  exitSequenceScope: () => void;
  selectItem: (type: SelectedItemType, id: string | null, options?: SelectItemOptions) => void;
  setMachineViewMode: (mode: MachineViewMode) => void;
  setObjectViewLens: (lens: ObjectViewLens) => void;
  setMachineFilterMode: (mode: MachineFilterMode) => void;
  focusLogicContext: (context: LogicWorkspaceContext | null) => void;
  focusBindContext: (context: BindWorkspaceContext | null) => void;
  loadProject: (path?: string) => Promise<void>;
  importProject: (project: UniversalPlcDemoProject, path?: string | null) => void;
  createBlankProject: () => void;
  updateProjectMeta: (input: { name: string; id?: string }) => void;
  updateProjectDeployment: (input: DeploymentConfig) => void;
  addBinding: (input?: Partial<IoBindingDefinition>) => void;
  updateBinding: (bindingId: string, input: Partial<IoBindingDefinition>) => void;
  deleteBinding: (bindingId: string) => void;
  addObject: (input: {
    name: string;
    type?: string;
    behaviorKind: BehaviorKind;
    summary?: string;
    parentObjectId?: string | null;
  }, anchorPoint?: OverlayAnchorPoint | null) => void;
  updateObjectMeta: (
    objectId: string,
    input: { name: string; type: string; behaviorKind: BehaviorKind; summary: string; parentObjectId?: string | null }
  ) => void;
  updateObjectNativeConfig: (objectId: string, input: Record<string, unknown>) => void;
  recreateObjectFromTemplate: (objectId: string) => void;
  deleteObject: (objectId: string) => void;
  addObjectPort: (
    objectId: string,
    family: ObjectContractFamily,
    input: { name: string; dataType: DataType; summary?: string }
  ) => void;
  updateObjectPort: (
    objectId: string,
    family: ObjectContractFamily,
    portId: string,
    input: { name: string; dataType: DataType; summary?: string }
  ) => void;
  deleteObjectPort: (objectId: string, family: ObjectContractFamily, portId: string) => void;
  addCompositionLink: (input: {
    sourceObjectId: string;
    sourcePortId: string;
    targetObjectId: string;
    targetPortId: string;
  }) => void;
  updateObjectTopologyPosition: (objectId: string, position: { x: number; y: number }) => void;
  ensureObjectStructure: (objectId: string, summary?: string) => void;
  addStructureNode: (
    objectId: string,
    input: {
      title: string;
      kind: string;
      summary?: string;
      refObjectId?: string | null;
      position?: { x: number; y: number };
      inputs?: Array<{ name: string; dataType?: DataType; summary?: string }>;
      outputs?: Array<{ name: string; dataType?: DataType; summary?: string }>;
    }
  ) => void;
  addStructureObjectNode: (
    objectId: string,
    input: {
      object: {
        name: string;
        type?: string;
        behaviorKind: BehaviorKind;
        summary?: string;
      };
      node: {
        title: string;
        summary?: string;
        position?: { x: number; y: number };
        inputs?: Array<{ name: string; dataType?: DataType; summary?: string }>;
        outputs?: Array<{ name: string; dataType?: DataType; summary?: string }>;
      };
    }
  ) => void;
  addStructureRoute: (
    objectId: string,
    input: {
      label: string;
      from: {
        kind: "boundary" | "node";
        nodeId?: string;
        portId: string;
        portKind?: "command" | "input" | "output" | "status" | "permission" | "fault";
      };
      to: {
        kind: "boundary" | "node";
        nodeId?: string;
        portId: string;
        portKind?: "command" | "input" | "output" | "status" | "permission" | "fault";
      };
    }
  ) => void;
  updateStructureNodePosition: (objectId: string, nodeId: string, position: { x: number; y: number }) => void;
  deleteStructureRoute: (objectId: string, routeId: string) => void;
  objectEditorObjectId: string | null;
  objectEditorAnchor: OverlayAnchorPoint | null;
  openObjectEditor: (objectId: string, anchorPoint?: OverlayAnchorPoint | null) => void;
  closeObjectEditor: () => void;
  fullObjectEditorObjectId: string | null;
  openFullObjectEditor: (objectId: string) => void;
  closeFullObjectEditor: () => void;
  updateMachineNodePosition: (machineId: string, stateId: string, position: { x: number; y: number }) => void;
}

const PROJECT_SELECTION_ID = "project-root";

function createNodePosition(index: number) {
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: 200 + column * 250,
    y: 120 + row * 180
  };
}

function createStructureNodeInputFromObject(object: UniversalPlcDemoProject["objects"][number]) {
  return {
    title: object.name,
    kind: "Object",
    summary: object.summary,
    refObjectId: object.id,
    inputs: [...object.commands, ...object.inputs, ...object.permissions].map((port) => ({
      name: port.name,
      dataType: port.dataType,
      summary: port.summary
    })),
    outputs: [...object.outputs, ...object.status, ...object.faults].map((port) => ({
      name: port.name,
      dataType: port.dataType,
      summary: port.summary
    }))
  };
}

function createStructurePortId(nodeId: string, io: "input" | "output", name: string, index: number) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${nodeId}_${io}_${normalized || index + 1}`;
}

function syncReferencedNodePorts(
  node: ObjectStructureNodeDefinition,
  object: UniversalPlcDemoProject["objects"][number]
) {
  const nextInputSeeds = [...object.commands, ...object.inputs, ...object.permissions];
  const nextOutputSeeds = [...object.outputs, ...object.status, ...object.faults];
  const mapPorts = (
    existingPorts: typeof node.inputs,
    nextPorts: typeof nextInputSeeds,
    io: "input" | "output"
  ) =>
    nextPorts.map((port, index) => {
      const existingPort = existingPorts.find((item: ObjectStructureNodeDefinition["inputs"][number]) => item.name === port.name);
      return existingPort
        ? {
            ...existingPort,
            name: port.name,
            dataType: port.dataType,
            summary: port.summary
          }
        : {
            id: createStructurePortId(node.id, io, port.name, index),
            name: port.name,
            kind: io,
            dataType: port.dataType,
            summary: port.summary
          };
    });

  return {
    ...node,
    title: object.name,
    summary: object.summary,
    inputs: mapPorts(node.inputs, nextInputSeeds, "input"),
    outputs: mapPorts(node.outputs, nextOutputSeeds, "output")
  };
}

function syncStructureReferencesForObject(
  owner: UniversalPlcDemoProject["objects"][number],
  rebuiltObject: UniversalPlcDemoProject["objects"][number]
) {
  if (!owner.structure) {
    return owner;
  }

  let touchedNodeIds = new Set<string>();
  const nextNodes = owner.structure.nodes.map((node) => {
    if (node.refObjectId !== rebuiltObject.id) {
      return node;
    }

    touchedNodeIds.add(node.id);
    return syncReferencedNodePorts(node, rebuiltObject);
  });

  if (!touchedNodeIds.size) {
    return owner;
  }

  const validPortIdsByNode = new Map<string, Set<string>>();
  for (const node of nextNodes) {
    if (!touchedNodeIds.has(node.id)) {
      continue;
    }

    validPortIdsByNode.set(node.id, new Set([...node.inputs, ...node.outputs].map((port) => port.id)));
  }

  const nextRoutes = owner.structure.routes.filter((route) => {
    const endpoints = [route.from, route.to];
    for (const endpoint of endpoints) {
      if (endpoint.kind !== "node" || !endpoint.nodeId || !touchedNodeIds.has(endpoint.nodeId)) {
        continue;
      }

      const validPortIds = validPortIdsByNode.get(endpoint.nodeId);
      if (!validPortIds?.has(endpoint.portId)) {
        return false;
      }
    }

    return true;
  });

  return {
    ...owner,
    structure: {
      ...owner.structure,
      nodes: nextNodes,
      routes: nextRoutes
    }
  };
}

function buildProjectSelection(project: UniversalPlcDemoProject) {
  const firstObject = project.objects[0];
  if (!firstObject) {
    return {
      selectedItemType: "project" as const,
      selectedItemId: PROJECT_SELECTION_ID,
      selectedObjectId: null,
      selectedMachineId: null
    };
  }

  return {
    selectedItemType: "object" as const,
    selectedItemId: firstObject.id,
    selectedObjectId: firstObject.id,
    selectedMachineId: firstObject.behavior?.machineId ?? null
  };
}

function createBindingId(project: UniversalPlcDemoProject) {
  const existingIds = project.bindings.map((binding) => binding.id);
  let counter = project.bindings.length + 1;
  let candidate = `binding_${counter}`;
  while (existingIds.includes(candidate)) {
    counter += 1;
    candidate = `binding_${counter}`;
  }
  return candidate;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeWorkspace: "machine",
  graphScopeStack: [],
  sequenceScopeNodeId: null,
  selectedItemId: PROJECT_SELECTION_ID,
  selectedItemType: "project",
  selectedObjectId: null,
  selectedMachineId: null,
  selectedGroupId: null,
  selectedSectionId: null,
  selectedRegionId: null,
  machineViewMode: "topology",
  objectViewLens: "behavior",
  machineFilterMode: "focus",
  logicContext: null,
  bindContext: null,
  projectSource: "bundled",
  projectPath: null,
  projectLoadState: "idle",
  projectLoadError: null,
  project: loadDemoProject(),
  objectEditorObjectId: null,
  objectEditorAnchor: null,
  fullObjectEditorObjectId: null,
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  enterGraphScope: (objectId, options) =>
    set((state) => {
      const existingIndex = state.graphScopeStack.indexOf(objectId);
      const nextStack =
        existingIndex >= 0 ? state.graphScopeStack.slice(0, existingIndex + 1) : [...state.graphScopeStack, objectId];

      return {
        graphScopeStack: nextStack,
        sequenceScopeNodeId: null,
        machineViewMode: "object",
        objectViewLens: "structure",
        selectedObjectId: objectId,
        selectedMachineId: options?.machineId ?? state.selectedMachineId
      };
    }),
  exitGraphScope: () =>
    set((state) => {
      if (!state.graphScopeStack.length) {
        return state;
      }

      const nextStack = state.graphScopeStack.slice(0, -1);
      return {
        graphScopeStack: nextStack,
        sequenceScopeNodeId: null,
        machineViewMode: nextStack.length ? "object" : "topology",
        objectViewLens: "structure",
        selectedObjectId: nextStack[nextStack.length - 1] ?? state.selectedObjectId
      };
    }),
  clearGraphScope: () =>
    set({
      graphScopeStack: [],
      sequenceScopeNodeId: null,
      machineViewMode: "topology",
      objectViewLens: "structure"
    }),
  enterSequenceScope: (nodeId) => set({ sequenceScopeNodeId: nodeId }),
  exitSequenceScope: () => set({ sequenceScopeNodeId: null }),
  selectItem: (type, id, options) =>
    set((state) => ({
      sequenceScopeNodeId: type === "subobject" && id === state.sequenceScopeNodeId ? state.sequenceScopeNodeId : null,
      selectedItemType: type,
      selectedItemId: id,
      selectedObjectId:
        type === "project" ? null : options?.objectId ?? (type === "object" ? id : state.selectedObjectId),
      selectedMachineId: type === "project" ? null : options?.machineId ?? state.selectedMachineId,
      selectedGroupId: type === "project" ? null : options?.groupId ?? state.selectedGroupId,
      selectedSectionId: type === "project" ? null : options?.sectionId ?? state.selectedSectionId,
      selectedRegionId: type === "project" ? null : options?.regionId ?? state.selectedRegionId
    })),
  setMachineViewMode: (mode) => set({ machineViewMode: mode }),
  setObjectViewLens: (lens) => set({ objectViewLens: lens }),
  setMachineFilterMode: (mode) => set({ machineFilterMode: mode }),
  focusLogicContext: (context) => set({ logicContext: context }),
  focusBindContext: (context) => set({ bindContext: context }),
  loadProject: async (path) => {
    set({ projectLoadState: "loading", projectLoadError: null });
    const result = await loadProjectDocument(path);
    set({
      project: result.project,
      projectSource: result.source,
      projectPath: result.path,
      projectLoadState: "ready",
      projectLoadError: result.error ?? null,
      objectEditorObjectId: null,
      objectEditorAnchor: null,
      fullObjectEditorObjectId: null,
      graphScopeStack: [],
      sequenceScopeNodeId: null,
      ...buildProjectSelection(result.project)
    });
  },
  importProject: (project, path) => {
    const nextProject = cloneProjectDocument(project);
    set({
      project: nextProject,
      projectSource: "local",
      projectPath: path ?? null,
      projectLoadError: null,
      projectLoadState: "ready",
      objectEditorObjectId: null,
      objectEditorAnchor: null,
      fullObjectEditorObjectId: null,
      logicContext: null,
      bindContext: null,
      graphScopeStack: [],
      sequenceScopeNodeId: null,
      ...buildProjectSelection(nextProject)
    });
  },
  createBlankProject: () => {
    const project = createEmptyProjectDocument();
    set({
      project,
      projectSource: "authoring",
      projectPath: null,
      projectLoadError: null,
      projectLoadState: "ready",
      objectEditorObjectId: null,
      objectEditorAnchor: null,
      fullObjectEditorObjectId: null,
      logicContext: null,
      bindContext: null,
      graphScopeStack: [],
      sequenceScopeNodeId: null,
      ...buildProjectSelection(project)
    });
  },
  updateProjectMeta: (input) =>
    set((state) => ({
      project: {
        ...state.project,
        name: input.name.trim() || "Untitled Project",
        id: input.id?.trim() || createProjectId(input.name)
      }
    })),
  updateProjectDeployment: (input) =>
    set((state) => ({
      project: {
        ...state.project,
        deployment: {
          ...createDefaultDeploymentConfig(),
          ...input,
          controller: {
            ...createDefaultDeploymentConfig().controller,
            ...input.controller
          },
          wifi: {
            ...createDefaultDeploymentConfig().wifi,
            ...input.wifi
          },
          oled: {
            ...createDefaultDeploymentConfig().oled,
            ...input.oled
          },
          led: {
            ...createDefaultDeploymentConfig().led,
            ...input.led
          },
          debug: {
            ...createDefaultDeploymentConfig().debug,
            ...input.debug
          }
        }
      }
    })),
  addBinding: (input) =>
    set((state) => {
      const nextBinding: IoBindingDefinition = {
        id: createBindingId(state.project),
        signalId: input?.signalId ?? "",
        physicalSource: input?.physicalSource ?? "",
        direction: input?.direction ?? "output",
        type: input?.type ?? "bool",
        bindingKind: input?.bindingKind ?? "digital_out",
        resourceId: input?.resourceId,
        gpio: input?.gpio,
        status: input?.status,
        debounceMs: input?.debounceMs,
        inverted: input?.inverted ?? false,
        initialState: input?.initialState ?? false,
        scale: input?.scale,
        failSafeValue: input?.failSafeValue
      };

      return {
        project: {
          ...state.project,
          bindings: [...state.project.bindings, nextBinding]
        },
        activeWorkspace: "bind",
        selectedItemType: "binding",
        selectedItemId: nextBinding.id
      };
    }),
  updateBinding: (bindingId, input) =>
    set((state) => ({
      project: {
        ...state.project,
        bindings: state.project.bindings.map((binding) =>
          binding.id !== bindingId
            ? binding
            : {
                ...binding,
                ...input
              }
        )
      }
    })),
  deleteBinding: (bindingId) =>
    set((state) => {
      const nextBindings = state.project.bindings.filter((binding) => binding.id !== bindingId);
      const nextSelectedId = state.selectedItemId === bindingId ? nextBindings[0]?.id ?? null : state.selectedItemId;
      const nextSelectedType =
        state.selectedItemId === bindingId ? (nextBindings[0] ? "binding" : null) : state.selectedItemType;

      return {
        project: {
          ...state.project,
          bindings: nextBindings
        },
        selectedItemId: nextSelectedId,
        selectedItemType: nextSelectedType
      };
    }),
  addObject: (input, anchorPoint) =>
    set((state) => {
      const nextObject = createObjectDefinition(state.project, input);
      const parentObjectId = input.parentObjectId ?? null;
      const nextDeployment =
        nextObject.type === "BlinkRelayPrimitive"
          ? {
              ...state.project.deployment,
              displayScreens: ensureBlinkOledScreenPreset(state.project.deployment.displayScreens)
            }
          : state.project.deployment;
      const nextObjects = state.project.objects.map((object) => {
        if (!parentObjectId || object.id !== parentObjectId) {
          return object;
        }

        const structure = object.structure ?? createObjectStructureDefinition();
        const nextNode = createObjectStructureNodeDefinition(
          { ...object, structure },
          {
            ...createStructureNodeInputFromObject(nextObject),
            position: createNodePosition(structure.nodes.length)
          }
        );

        return {
          ...object,
          structure: {
            ...structure,
            nodes: [...structure.nodes, nextNode]
          }
        };
      });

      return {
        project: {
          ...state.project,
          deployment: nextDeployment,
          objects: [...nextObjects, nextObject]
        },
        activeWorkspace: "machine",
        graphScopeStack: parentObjectId ? [...state.graphScopeStack.filter((id) => id !== parentObjectId), parentObjectId] : [],
        machineViewMode: parentObjectId ? "object" : "topology",
        selectedItemType: "object" as const,
        selectedItemId: nextObject.id,
        selectedObjectId: parentObjectId ?? nextObject.id,
        selectedMachineId: null,
        selectedGroupId: null,
        selectedSectionId: null,
        selectedRegionId: null,
        objectEditorObjectId: nextObject.id,
        objectEditorAnchor: anchorPoint ?? null
      };
    }),
  updateObjectMeta: (objectId, input) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) =>
          object.id !== objectId
            ? object
            : {
                ...object,
                name: input.name.trim() || object.name,
                type: input.type.trim() || object.type,
                behaviorKind: input.behaviorKind,
                summary: input.summary.trim() || object.summary,
                parentObjectId: input.parentObjectId === undefined ? object.parentObjectId ?? null : input.parentObjectId
              }
        )
      }
    })),
  updateObjectNativeConfig: (objectId, input) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) =>
          object.id !== objectId
            ? object
            : {
                ...object,
                nativeConfig: {
                  ...(object.nativeConfig ?? {}),
                  ...input
                }
              }
        )
      }
    })),
  recreateObjectFromTemplate: (objectId) =>
    set((state) => {
      const currentObject = state.project.objects.find((object) => object.id === objectId) ?? null;
      if (!currentObject) {
        return state;
      }

      const nextObject = {
        ...rebuildObjectFromTemplate(currentObject),
        topologyPosition: currentObject.topologyPosition ?? null
      };

      const nextDeployment =
        nextObject.type === "BlinkRelayPrimitive"
          ? {
              ...state.project.deployment,
              displayScreens: ensureBlinkOledScreenPreset(state.project.deployment.displayScreens)
            }
          : state.project.deployment;

      const nextObjects = state.project.objects.map((object) => {
        if (object.id === objectId) {
          return nextObject;
        }

        return syncStructureReferencesForObject(object, nextObject);
      });

      return {
        project: {
          ...state.project,
          deployment: nextDeployment,
          objects: nextObjects
        },
        activeWorkspace: "machine",
        sequenceScopeNodeId: null,
        selectedItemType: "object",
        selectedItemId: objectId,
        selectedObjectId: objectId
      };
    }),
  deleteObject: (objectId) =>
    set((state) => {
      const idsToDelete = new Set<string>();
      const queue = [objectId];

      while (queue.length) {
        const currentId = queue.shift()!;
        if (idsToDelete.has(currentId)) {
          continue;
        }

        idsToDelete.add(currentId);
        state.project.objects
          .filter((object) => object.parentObjectId === currentId)
          .forEach((child) => {
            queue.push(child.id);
          });
      }

      const nextObjects = state.project.objects
        .filter((object) => !idsToDelete.has(object.id))
        .map((object) => {
          if (!object.structure) {
            return object;
          }

          const nextNodes = object.structure.nodes.filter((node) => !node.refObjectId || !idsToDelete.has(node.refObjectId));
          const deletedNodeIds = new Set(
            object.structure.nodes
              .filter((node) => node.refObjectId && idsToDelete.has(node.refObjectId))
              .map((node) => node.id)
          );

          return {
            ...object,
            structure: {
              ...object.structure,
              nodes: nextNodes,
              routes: object.structure.routes.filter(
                (route) =>
                  !(route.from.kind === "node" && route.from.nodeId && deletedNodeIds.has(route.from.nodeId)) &&
                  !(route.to.kind === "node" && route.to.nodeId && deletedNodeIds.has(route.to.nodeId))
              )
            }
          };
        });

      const nextCompositionLinks = state.project.compositionLinks.filter(
        (link) => !idsToDelete.has(link.sourceObjectId) && !idsToDelete.has(link.targetObjectId)
      );
      const fallbackObject = nextObjects.find((object) => !object.parentObjectId) ?? nextObjects[0] ?? null;

      return {
        project: {
          ...state.project,
          objects: nextObjects,
          compositionLinks: nextCompositionLinks
        },
        graphScopeStack: state.graphScopeStack.filter((id) => !idsToDelete.has(id)),
        sequenceScopeNodeId: null,
        selectedItemType: fallbackObject ? "object" : "project",
        selectedItemId: fallbackObject?.id ?? PROJECT_SELECTION_ID,
        selectedObjectId: fallbackObject?.id ?? null
      };
    }),
  addObjectPort: (objectId, family, input) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) => {
          if (object.id !== objectId) {
            return object;
          }

          const nextPort = createObjectPortDefinition(object, family, input);
          return {
            ...object,
            [family]: [...object[family], nextPort]
          };
        })
      }
    })),
  updateObjectPort: (objectId, family, portId, input) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) => {
          if (object.id !== objectId) {
            return object;
          }

          return {
            ...object,
            [family]: object[family].map((port) =>
              port.id !== portId
                ? port
                : {
                    ...port,
                    name: input.name.trim() || port.name,
                    dataType: input.dataType,
                    summary: input.summary?.trim() || ""
                  }
            )
          };
        })
      }
    })),
  deleteObjectPort: (objectId, family, portId) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) => {
          if (object.id !== objectId) {
            return object;
          }

          return {
            ...object,
            [family]: object[family].filter((port) => port.id !== portId)
          };
        })
      }
    })),
  addCompositionLink: (input) =>
    set((state) => {
      const nextLink = createObjectCompositionLinkDefinition(state.project, {
        source: {
          objectId: input.sourceObjectId,
          portId: input.sourcePortId
        },
        target: {
          objectId: input.targetObjectId,
          portId: input.targetPortId
        }
      });

      if (!nextLink) {
        return state;
      }

      return {
        project: {
          ...state.project,
          compositionLinks: [...state.project.compositionLinks, nextLink]
        },
        selectedItemType: "object-link" as const,
        selectedItemId: nextLink.id
      };
    }),
  updateObjectTopologyPosition: (objectId, position) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) =>
          object.id !== objectId
            ? object
            : {
                ...object,
                topologyPosition: position
              }
        )
      }
    })),
  ensureObjectStructure: (objectId, summary) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) => {
          if (object.id !== objectId) {
            return object;
          }

          const structure = object.structure ?? createObjectStructureDefinition(summary);
          const linkedObjectIds = new Set(structure.nodes.map((node) => node.refObjectId).filter(Boolean));
          const childObjects = state.project.objects.filter(
            (child) => child.parentObjectId === objectId && !linkedObjectIds.has(child.id)
          );
          const appendedNodes = childObjects.map((child, index) =>
            createObjectStructureNodeDefinition(
              { ...object, structure: { ...structure, nodes: [...structure.nodes] } },
              {
                ...createStructureNodeInputFromObject(child),
                position: createNodePosition(structure.nodes.length + index)
              }
            )
          );

          return {
            ...object,
            structure: {
              ...structure,
              nodes: [...structure.nodes, ...appendedNodes]
            }
          };
        })
      }
    })),
  addStructureNode: (objectId, input) =>
    set((state) => {
      let createdNodeId: string | null = null;

      return {
        project: {
          ...state.project,
          objects: state.project.objects.map((object) => {
            if (object.id !== objectId) {
              return object;
            }

            const structure = object.structure ?? createObjectStructureDefinition();
            const nextNode = createObjectStructureNodeDefinition({ ...object, structure }, input);
            createdNodeId = nextNode.id;
            return {
              ...object,
              structure: {
                ...structure,
                nodes: [...structure.nodes, nextNode]
              }
            };
          })
        },
        activeWorkspace: "machine",
        graphScopeStack: [...state.graphScopeStack.filter((id) => id !== objectId), objectId],
        machineViewMode: "object",
        objectViewLens: "structure",
        selectedItemType: "subobject",
        selectedItemId: createdNodeId,
        selectedObjectId: objectId
      };
    }),
  addStructureObjectNode: (objectId, input) =>
    set((state) => {
      const parentObject = state.project.objects.find((item) => item.id === objectId);
      if (!parentObject) {
        return state;
      }

      const nextObject = createObjectDefinition(state.project, {
        ...input.object,
        parentObjectId: objectId
      });
      const nextDeployment =
        nextObject.type === "BlinkRelayPrimitive"
          ? {
              ...state.project.deployment,
              displayScreens: ensureBlinkOledScreenPreset(state.project.deployment.displayScreens)
            }
          : state.project.deployment;
      const nextNodeTemplate = createStructureNodeInputFromObject(nextObject);

      let createdNodeId: string | null = null;
      const nextObjects = state.project.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }

        const structure = object.structure ?? createObjectStructureDefinition();
        const nextNode = createObjectStructureNodeDefinition(
          { ...object, structure },
          {
            ...nextNodeTemplate,
            title: input.node.title,
            summary: input.node.summary ?? nextNodeTemplate.summary,
            position: input.node.position
          }
        );
        createdNodeId = nextNode.id;
        return {
          ...object,
          structure: {
            ...structure,
            nodes: [...structure.nodes, nextNode]
          }
        };
      });

      return {
        project: {
          ...state.project,
          deployment: nextDeployment,
          objects: [...nextObjects, nextObject]
        },
        activeWorkspace: "machine",
        graphScopeStack: [...state.graphScopeStack.filter((id) => id !== objectId), objectId],
        machineViewMode: "object",
        objectViewLens: "structure",
        selectedItemType: "subobject" as const,
        selectedItemId: createdNodeId,
        selectedObjectId: objectId
      };
    }),
  addStructureRoute: (objectId, input) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) => {
          if (object.id !== objectId) {
            return object;
          }

          const structure = object.structure ?? createObjectStructureDefinition();
          const nextRoute = createObjectStructureRouteDefinition({ ...object, structure }, input);
          if (!nextRoute) {
            return object;
          }
          return {
            ...object,
            structure: {
              ...structure,
              routes: [...structure.routes, nextRoute]
            }
          };
        })
      }
    })),
  updateStructureNodePosition: (objectId, nodeId, position) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) => {
          if (object.id !== objectId || !object.structure) {
            return object;
          }

          return {
            ...object,
            structure: {
              ...object.structure,
              nodes: object.structure.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node))
            }
          };
        })
      }
    })),
  deleteStructureRoute: (objectId, routeId) =>
    set((state) => ({
      project: {
        ...state.project,
        objects: state.project.objects.map((object) => {
          if (object.id !== objectId || !object.structure) {
            return object;
          }

          return {
            ...object,
            structure: {
              ...object.structure,
              routes: object.structure.routes.filter((route) => route.id !== routeId)
            }
          };
        })
      }
    })),
  openObjectEditor: (objectId, anchorPoint) => set({ objectEditorObjectId: objectId, objectEditorAnchor: anchorPoint ?? null }),
  closeObjectEditor: () => set({ objectEditorObjectId: null, objectEditorAnchor: null }),
  openFullObjectEditor: (objectId) =>
    set({
      fullObjectEditorObjectId: objectId,
      objectEditorObjectId: null,
      objectEditorAnchor: null
    }),
  closeFullObjectEditor: () => set({ fullObjectEditorObjectId: null }),
  updateMachineNodePosition: (machineId, stateId, position) =>
    set((state) => ({
      project: {
        ...state.project,
        machines: state.project.machines.map((machine) =>
          machine.id !== machineId
            ? machine
            : {
                ...machine,
                states: machine.states.map((node) => (node.id === stateId ? { ...node, position } : node))
              }
        )
      }
    }))
}));
