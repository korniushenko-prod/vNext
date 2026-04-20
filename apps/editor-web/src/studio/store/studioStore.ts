import { create } from "zustand";
import { demoProject, type UniversalPlcDemoProject, type WorkspaceId } from "../model/demoProject";

export type SelectedItemType = "machine" | "section" | "region" | "state" | "transition" | "signal" | "block" | "binding" | null;

interface StudioState {
  activeWorkspace: WorkspaceId;
  selectedItemId: string | null;
  selectedItemType: SelectedItemType;
  selectedMachineId: string | null;
  selectedSectionId: string | null;
  project: UniversalPlcDemoProject;
  setActiveWorkspace: (workspace: WorkspaceId) => void;
  selectItem: (type: SelectedItemType, id: string | null, options?: { machineId?: string | null; sectionId?: string | null }) => void;
  updateMachineNodePosition: (machineId: string, stateId: string, position: { x: number; y: number }) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeWorkspace: "machine",
  selectedItemId: "running",
  selectedItemType: "state",
  selectedMachineId: "boiler_sequence",
  selectedSectionId: "sec_running",
  project: demoProject,
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  selectItem: (type, id, options) =>
    set((state) => ({
      selectedItemType: type,
      selectedItemId: id,
      selectedMachineId: options?.machineId ?? state.selectedMachineId,
      selectedSectionId: options?.sectionId ?? state.selectedSectionId
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
