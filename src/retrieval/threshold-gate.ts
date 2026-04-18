import type { FamiliarityLevel } from "../types/memory.js";

export interface ThresholdGateConfig {
  strong: number;
  weak: number;
}

export function resolveFamiliarityLevel(similarity: number, thresholds: ThresholdGateConfig): FamiliarityLevel {
  if (similarity >= thresholds.strong) {
    return "strong";
  }
  if (similarity >= thresholds.weak) {
    return "weak";
  }
  return "none";
}
