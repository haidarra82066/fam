export const featureFlags = {
  aiFamilyAssistant: false,
  familyReports: false,
  familyAssetManager: false,
  visualExportStudio: false,
  familyStorytelling: false,
  dnaConnections: false,
  healthHistory: false,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;
