import { create } from "zustand";
import {
  createEmptyProjectDocument,
  createObjectDefinition,
  createObjectCompositionLinkDefinition,
  cloneProjectDocument,
  createObjectStructureRouteDefinition,
  createObjectStructureDefinition,
  createObjectStructureNodeDefinition,
  createObjectPortDefinition,
  createProjectId,
  loadDemoProject,
  type BehaviorKind,
  type DataType,
  type ObjectContractFamily,
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

export const useStudioStore = create<StudioState>((set) => ({
  activeWorkspace: "machine",
  graphScopeStack: [],
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
        machineViewMode: nextStack.length ? "object" : "topology",
        objectViewLens: "structure",
        selectedObjectId: nextStack[nextStack.length - 1] ?? state.selectedObjectId
      };
    }),
  clearGraphScope: () =>
    set({
      graphScopeStack: [],
      machineViewMode: "topology",
      objectViewLens: "structure"
    }),
  selectItem: (type, id, options) =>
    set((state) => ({
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
  addObject: (input, anchorPoint) =>
    set((state) => {
      const nextObject = createObjectDefinition(state.project, input);
      const parentObjectId = input.parentObjectId ?? null;
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

      let createdNodeId: string | null = null;
      const nextObjects = state.project.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }

        const structure = object.structure ?? createObjectStructureDefinition();
        const nextNode = createObjectStructureNodeDefinition(
          { ...object, structure },
          {
            title: input.node.title,
            kind: "Object",
            summary: input.node.summary,
            refObjectId: nextObject.id,
            position: input.node.position,
            inputs: input.node.inputs,
            outputs: input.node.outputs
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
