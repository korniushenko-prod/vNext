export interface InterfaceFacetSkeleton {
  ports: true;
  params: true;
  alarms: true;
}

export interface CompositionFacetSkeleton {
  child_instances: true;
  routes: true;
}

export interface StateFacetSkeleton {
  planned: true;
}

export interface FlowFacetSkeleton {
  planned: true;
}

export interface DiagnosticsFacetSkeleton {
  structural_validation: true;
}

export interface ObjectTypeFacetSkeleton {
  interface: InterfaceFacetSkeleton;
  composition: CompositionFacetSkeleton;
  state: StateFacetSkeleton;
  flow: FlowFacetSkeleton;
  diagnostics: DiagnosticsFacetSkeleton;
}

export const objectTypeFacetSkeleton: ObjectTypeFacetSkeleton = {
  interface: {
    ports: true,
    params: true,
    alarms: true
  },
  composition: {
    child_instances: true,
    routes: true
  },
  state: {
    planned: true
  },
  flow: {
    planned: true
  },
  diagnostics: {
    structural_validation: true
  }
};
