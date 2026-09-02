import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../../src/persistence/in-memory-repository.js';
import { SituationRepository, ScanRunRepository } from '../../src/persistence/repositories.js';
import type { Situation, ScanRun } from '../../src/domain/index.js';

// Minimal stub for testing
function makeSituation(id: string): Situation {
  const now = new Date();
  return {
    situationId: id,
    title: `Test situation ${id}`,
    summary: 'Test summary',
    authorId: 'author-1',
    sourceContentIds: ['content-1'],
    relatedContentIds: [],
    permalink: 'https://test.test/stub',
    language: 'en',
    geographies: ['Thailand'],
    businessStage: 'established',
    assets: [],
    needs: ['EU distribution'],
    constraints: [],
    intent: 'Find distributor',
    opportunityTypes: ['distribution'],
    evidence: [],
    opportunityScore: { total: 55, breakdown: {}, explanation: 'test' },
    relationshipConfidence: { score: 60, explanation: 'test', factors: [] },
    possibleUserRoles: ['distributor'],
    possibleActions: ['Reach out'],
    status: 'new',
    firstSeenAt: now,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function makeScanRun(id: string): ScanRun {
  return {
    runId: id,
    startedAt: new Date(),
    finishedAt: new Date(),
    contentProcessed: 10,
    candidatesFound: 3,
    situationsCreated: 2,
    errors: [],
  };
}

describe('InMemoryRepository', () => {
  let repo: InMemoryRepository<Situation>;

  beforeEach(() => {
    repo = new InMemoryRepository<Situation>((s) => s.situationId);
  });

  it('saves and retrieves by id', async () => {
    const s = makeSituation('sit-1');
    await repo.save(s);
    const found = await repo.findById('sit-1');
    expect(found).toEqual(s);
  });

  it('returns null for non-existent id', async () => {
    const result = await repo.findById('non-existent');
    expect(result).toBeNull();
  });

  it('findAll returns all saved items', async () => {
    await repo.save(makeSituation('a'));
    await repo.save(makeSituation('b'));
    await repo.save(makeSituation('c'));
    const all = await repo.findAll();
    expect(all).toHaveLength(3);
  });

  it('save overwrites item with same id', async () => {
    const s1 = makeSituation('sit-1');
    await repo.save(s1);
    const s2 = { ...s1, title: 'Updated title' };
    await repo.save(s2);
    const found = await repo.findById('sit-1');
    expect(found?.title).toBe('Updated title');
    expect(await repo.findAll()).toHaveLength(1);
  });

  it('query filters by predicate', async () => {
    await repo.save(makeSituation('sit-1'));
    const s2 = { ...makeSituation('sit-2'), geographies: ['Russia'] };
    await repo.save(s2);
    await repo.save(makeSituation('sit-3'));

    const rusResults = await repo.query((s) => s.geographies.includes('Russia'));
    expect(rusResults).toHaveLength(1);
    expect(rusResults[0].situationId).toBe('sit-2');
  });

  it('query returns empty array when no items match', async () => {
    await repo.save(makeSituation('sit-1'));
    const results = await repo.query((s) => s.situationId === 'non-existent');
    expect(results).toHaveLength(0);
  });

  it('size property reflects stored count', async () => {
    expect(repo.size).toBe(0);
    await repo.save(makeSituation('a'));
    await repo.save(makeSituation('b'));
    expect(repo.size).toBe(2);
  });

  it('clear removes all items', async () => {
    await repo.save(makeSituation('a'));
    await repo.save(makeSituation('b'));
    repo.clear();
    expect(repo.size).toBe(0);
    expect(await repo.findAll()).toHaveLength(0);
  });

  describe('exists()', () => {
    it('returns false for non-existent id', async () => {
      expect(await repo.exists('non-existent')).toBe(false);
    });

    it('returns true after save', async () => {
      const s = makeSituation('sit-exists-1');
      await repo.save(s);
      expect(await repo.exists('sit-exists-1')).toBe(true);
    });

    it('save twice with same id: exists() still true, findAll() returns 1 item', async () => {
      const s = makeSituation('sit-upsert-1');
      await repo.save(s);
      await repo.save({ ...s, title: 'Updated title' });
      expect(await repo.exists('sit-upsert-1')).toBe(true);
      expect(await repo.findAll()).toHaveLength(1);
    });
  });
});

describe('SituationRepository', () => {
  it('uses situationId as key', async () => {
    const repo = new SituationRepository();
    const s = makeSituation('my-sit-id');
    await repo.save(s);
    expect(await repo.findById('my-sit-id')).toEqual(s);
  });
});

describe('ScanRunRepository', () => {
  it('uses runId as key', async () => {
    const repo = new ScanRunRepository();
    const run = makeScanRun('run-123');
    await repo.save(run);
    expect(await repo.findById('run-123')).toEqual(run);
  });

  it('CRUD: save, findById, findAll, query', async () => {
    const repo = new ScanRunRepository();
    const r1 = makeScanRun('run-1');
    const r2 = { ...makeScanRun('run-2'), errors: ['some error'] };
    
    await repo.save(r1);
    await repo.save(r2);
    
    expect(await repo.findAll()).toHaveLength(2);
    
    const withErrors = await repo.query((r) => r.errors.length > 0);
    expect(withErrors).toHaveLength(1);
    expect(withErrors[0].runId).toBe('run-2');
  });
});
