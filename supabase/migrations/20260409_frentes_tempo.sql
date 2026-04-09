-- 1. Adicionar coluna de frentes (array de texto)
ALTER TABLE questoes
  ADD COLUMN IF NOT EXISTS frentes TEXT[] NOT NULL DEFAULT '{}';

-- 2. Índice GIN para busca eficiente em arrays
CREATE INDEX IF NOT EXISTS idx_questoes_frentes
  ON questoes USING GIN (frentes);

-- 3. Corrigir CHECK de dificuldade para incluir muito_dificil
ALTER TABLE questoes
  DROP CONSTRAINT IF EXISTS questoes_dificuldade_check;
ALTER TABLE questoes
  ADD CONSTRAINT questoes_dificuldade_check
  CHECK (dificuldade IN ('facil', 'medio', 'dificil', 'muito_dificil'));

-- 4. Adicionar coluna tempo_estimado_segundos
ALTER TABLE questoes
  ADD COLUMN IF NOT EXISTS tempo_estimado_segundos INTEGER;

-- 5. Adicionar colunas ausentes do schema (sync com types.ts)
ALTER TABLE questoes
  ADD COLUMN IF NOT EXISTS crop_image_path TEXT,
  ADD COLUMN IF NOT EXISTS anulada BOOLEAN NOT NULL DEFAULT FALSE;
