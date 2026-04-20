import { create } from "zustand";
import { demoProject, type UniversalPlcDemoProject, type WorkspaceId } from "../model/demoProject";

export type SelectedItemType = "machine" | "group" | "section" | "region" | "state" | "transition" | "signal" | "block" | "binding" | null;

interface StudioState {
  activeWorkspace: WorkspaceId;
  selectedItemId: string | null;
  selectedItemType: SelectedItemType;
  selectedMachineId: string | null;
  selectedGroupId: string | null;
  selectedSectionId: string | null;
  selectedRegionId: string | null;
  project: UniversalPlcDemoProject;
  setActiveWorkspace: (workspace: WorkspaceId) => void;
  selectItem: (
    type: SelectedItemType,
    id: string | null,
    options?: { machineId?: string | null; groupId?: string | null; sectionId?: string | null; regionId?: string | null }
  ) => void;
  updateMachineNodePosition: (machineId: string, stateId: string, position: { x: number; y: number }) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeWorkspace: "machine",
  selectedItemId: "running",
  selectedItemType: "state",
  selectedMachineId: "boiler_sequence",
  selectedGroupId: "grp_operation",
  selectedSectionId: "sec_running",
  selectedRegionId: "feedback_region",
  project: demoProject,
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  selectItem: (type, id, options) =>
    set((state) => ({
      selectedItemType: type,
      selectedItemId: id,
      selectedMachineId: options?.machineId ?? state.selectedMachineId,
      selectedGroupId: options?.groupId ?? state.selectedGroupId,
      selectedSectionId: options?.sectionId ?? state.selectedSectionId,
      selectedRegionId: options?.regionId ?? state.selectedRegionId
    })),
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
