/**
 * Source adapters.
 *
 * Source-specific ingestion lives here and is intentionally kept OUT of the
 * core public API (`src/index.ts`) so the core remains source-independent.
 * Each adapter's only contract with the core is producing NormalizedContent[].
 */
export * from './threads/index.js';
