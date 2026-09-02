export interface CandidateResult {
  isCandidate: boolean;
  signalTypes: string[];
  confidence: number; // 0–1
  reasons: string[];
}
