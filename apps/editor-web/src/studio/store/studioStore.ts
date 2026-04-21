import { create } from "zustand";
import { loadDemoProject, type UniversalPlcDemoProject, type WorkspaceId } from "../model/demoProject";
import { loadProjectDocument } from "../model/projectLoader";

export type SelectedItemType =
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

interface StudioState {
  activeWorkspace: WorkspaceId;
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
  projectSource: "bundled" | "remote";
  projectPath: string | null;
  projectLoadState: "idle" | "loading" | "ready";
  projectLoadError: string | null;
  project: UniversalPlcDemoProject;
  setActiveWorkspace: (workspace: WorkspaceId) => void;
  selectItem: (type: SelectedItemType, id: string | null, options?: SelectItemOptions) => void;
  setMachineViewMode: (mode: MachineViewMode) => void;
  setObjectViewLens: (lens: ObjectViewLens) => void;
  setMachineFilterMode: (mode: MachineFilterMode) => void;
  focusLogicContext: (context: LogicWorkspaceContext | null) => void;
  focusBindContext: (context: BindWorkspaceContext | null) => void;
  loadProject: (path?: string) => Promise<void>;
  updateMachineNodePosition: (machineId: string, stateId: string, position: { x: number; y: number }) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeWorkspace: "machine",
  selectedItemId: "burner",
  selectedItemType: "object",
  selectedObjectId: "burner",
  selectedMachineId: "boiler_sequence",
  selectedGroupId: "grp_run",
  selectedSectionId: "sec_run",
  selectedRegionId: "region_run",
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
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  selectItem: (type, id, options) =>
    set((state) => ({
      selectedItemType: type,
      selectedItemId: id,
      selectedObjectId: options?.objectId ?? (type === "object" ? id : state.selectedObjectId),
      selectedMachineId: options?.machineId ?? state.selectedMachineId,
      selectedGroupId: options?.groupId ?? state.selectedGroupId,
      selectedSectionId: options?.sectionId ?? state.selectedSectionId,
      selectedRegionId: options?.regionId ?? state.selectedRegionId
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
      projectLoadError: result.error ?? null
    });
  },
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
