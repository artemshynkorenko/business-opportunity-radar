import type { Repository } from './repository-interface.js';

/**
 * Generic in-memory repository.
 * The idExtractor function provides the unique ID for each item.
 * Suitable for MVP Core v0.1; swap with a DB-backed implementation later.
 */
export class InMemoryRepository<T> implements Repository<T> {
  private readonly store = new Map<string, T>();

  constructor(private readonly idExtractor: (item: T) => string) {}

  async save(item: T): Promise<void> {
    const id = this.idExtractor(item);
    this.store.set(id, item);
  }

  async findById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return [...this.store.values()];
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    return [...this.store.values()].filter(predicate);
  }

  /** Returns the number of items currently stored. */
  get size(): number {
    return this.store.size;
  }

  /** Clears all stored items. */
  clear(): void {
    this.store.clear();
  }
}
