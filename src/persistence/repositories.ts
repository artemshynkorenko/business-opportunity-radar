import type { Situation, ScanRun } from '../domain/index.js';
import { InMemoryRepository } from './in-memory-repository.js';

/**
 * Typed repository for Situation objects.
 */
export class SituationRepository extends InMemoryRepository<Situation> {
  constructor() {
    super((s) => s.situationId);
  }
}

/**
 * Typed repository for ScanRun objects.
 */
export class ScanRunRepository extends InMemoryRepository<ScanRun> {
  constructor() {
    super((r) => r.runId);
  }
}
