export interface RuntimePackFacetSkeleton {
  flattened_instances: true;
  normalized_connections: true;
  resolved_params: true;
  resource_bindings: true;
}

export interface RuntimePackBuildContract {
  authoring_to_runtime: true;
  target_neutral: true;
  target_specific_runtime: false;
}

export const runtimePackFacetSkeleton: RuntimePackFacetSkeleton = {
  flattened_instances: true,
  normalized_connections: true,
  resolved_params: true,
  resource_bindings: true
};

export const runtimePackBuildContract: RuntimePackBuildContract = {
  authoring_to_runtime: true,
  target_neutral: true,
  target_specific_runtime: false
};
