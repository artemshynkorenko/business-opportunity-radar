/**
 * Generic repository interface.
 * Decouples domain logic from specific storage implementations.
 */
export interface Repository<T> {
  save(item: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  query(predicate: (item: T) => boolean): Promise<T[]>;
}
