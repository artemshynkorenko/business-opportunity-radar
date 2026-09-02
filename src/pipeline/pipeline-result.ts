import type { ScanRun, Situation, OpportunityCard } from '../domain/index.js';

export interface PipelineResult {
  scanRun: ScanRun;
  situations: Situation[];
  cards: OpportunityCard[];
}
