import { create } from "zustand";
import { demoProject, type UniversalPlcDemoProject, type WorkspaceId } from "../model/demoProject";

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
  project: UniversalPlcDemoProject;
  setActiveWorkspace: (workspace: WorkspaceId) => void;
  selectItem: (type: SelectedItemType, id: string | null, options?: SelectItemOptions) => void;
  setMachineViewMode: (mode: MachineViewMode) => void;
  setObjectViewLens: (lens: ObjectViewLens) => void;
  setMachineFilterMode: (mode: MachineFilterMode) => void;
  focusLogicContext: (context: LogicWorkspaceContext | null) => void;
  focusBindContext: (context: BindWorkspaceContext | null) => void;
  updateMachineNodePosition: (machineId: string, stateId: string, position: { x: number; y: number }) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeWorkspace: "machine",
  selectedItemId: "burner",
  selectedItemType: "object",
  selectedObjectId: "burner",
  selectedMachineId: "boiler_sequence",
  selectedGroupId: "grp_operation",
  selectedSectionId: "sec_running",
  selectedRegionId: "feedback_region",
  machineViewMode: "topology",
  objectViewLens: "behavior",
  machineFilterMode: "focus",
  logicContext: null,
  bindContext: null,
  project: demoProject,
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
