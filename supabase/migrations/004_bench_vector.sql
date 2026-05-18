-- ============================================================
-- FFN Migration 004: Bench Vector — pgvector Column + IVFFlat Index
-- ADR-EXT-008: pgvector, 1536 dimensions, cosine similarity
-- ADR-004: Bench-first AI — this index powers every IntelliMatch query
-- PREREQUISITE: 000_helpers_extensions.sql (enables vector extension)
--               001_core_tables.sql (creates x_ffn_bench_index)
-- ============================================================

-- Add vector column (1536 dims = text-embedding-ada-002, D-009)
ALTER TABLE x_ffn_bench_index
  ADD COLUMN IF NOT EXISTS skill_vector vector(1536);

-- IVFFlat index for cosine similarity search
-- lists=100 is correct for tables up to ~1M rows (sqrt rule)
-- Revisit lists value at 1M+ rows per ADR-EXT-008
CREATE INDEX bench_ivfflat
  ON x_ffn_bench_index
  USING ivfflat (skill_vector vector_cosine_ops)
  WITH (lists = 100);

-- Partial index: only index current vectors (is_current = TRUE)
-- Reduces index size and improves query performance for bench-first queries
CREATE INDEX bench_ivfflat_current
  ON x_ffn_bench_index (tenant_id, bench_available_from)
  WHERE is_current = TRUE;
