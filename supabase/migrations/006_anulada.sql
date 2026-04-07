-- ─── Suporte a questões anuladas ─────────────────────────────
ALTER TABLE questoes
  ADD COLUMN IF NOT EXISTS anulada BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_questoes_anulada ON questoes(anulada) WHERE anulada = TRUE;
