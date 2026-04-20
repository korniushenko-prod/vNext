import { create } from "zustand";
import { demoProject, type UniversalPlcDemoProject, type WorkspaceId } from "../model/demoProject";

type SelectedItemType = "state" | "transition" | "signal" | "block" | "binding" | null;

interface StudioState {
  activeWorkspace: WorkspaceId;
  selectedItemId: string | null;
  selectedItemType: SelectedItemType;
  project: UniversalPlcDemoProject;
  setActiveWorkspace: (workspace: WorkspaceId) => void;
  selectItem: (type: SelectedItemType, id: string | null) => void;
  updateMachineNodePosition: (machineId: string, stateId: string, position: { x: number; y: number }) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeWorkspace: "machine",
  selectedItemId: "running",
  selectedItemType: "state",
  project: demoProject,
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  selectItem: (type, id) => set({ selectedItemType: type, selectedItemId: id }),
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
