-- Migration 004: Fase 3 — Simulados
-- Execute no Supabase Dashboard > SQL Editor

-- ── 1. Adicionar 'muito_dificil' à restrição de dificuldade ──
-- O campo é TEXT com CHECK constraint; removemos e recriamos.
ALTER TABLE questoes DROP CONSTRAINT IF EXISTS questoes_dificuldade_check;
ALTER TABLE questoes ADD CONSTRAINT questoes_dificuldade_check
  CHECK (dificuldade IN ('facil', 'medio', 'dificil', 'muito_dificil'));

-- ── 2. Ampliar tabela simulados (já existente no schema) ──────
ALTER TABLE simulados
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Constraint de status
ALTER TABLE simulados DROP CONSTRAINT IF EXISTS simulados_status_check;
ALTER TABLE simulados ADD CONSTRAINT simulados_status_check
  CHECK (status IN ('draft', 'ready', 'exported'));

-- ── 3. Ampliar tabela simulado_questoes ───────────────────────
-- Adicionar id se não existir (sem tornar PK — já há uma PK na tabela)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulado_questoes' AND column_name = 'id'
  ) THEN
    ALTER TABLE simulado_questoes ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Renomear 'ordem' para 'order_index' se necessário (mantemos 'ordem' por compatibilidade)
-- O campo já se chama 'ordem' no schema existente — apenas garantir que existe
ALTER TABLE simulado_questoes
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- UNIQUE constraint para evitar duplicatas
ALTER TABLE simulado_questoes
  DROP CONSTRAINT IF EXISTS simulado_questoes_simulado_id_questao_id_key;
ALTER TABLE simulado_questoes
  ADD CONSTRAINT simulado_questoes_simulado_id_questao_id_key
  UNIQUE (simulado_id, questao_id);

-- ── 4. RLS ────────────────────────────────────────────────────
ALTER TABLE simulados ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulado_questoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own simulados" ON simulados;
CREATE POLICY "Users see own simulados" ON simulados
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own simulados" ON simulados;
CREATE POLICY "Users manage own simulados" ON simulados
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own simulado_questoes" ON simulado_questoes;
CREATE POLICY "Users manage own simulado_questoes" ON simulado_questoes
  USING (
    simulado_id IN (
      SELECT id FROM simulados WHERE user_id = auth.uid()
    )
  );

-- ── 5. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_simulados_user ON simulados(user_id);
CREATE INDEX IF NOT EXISTS idx_simulado_questoes_simulado ON simulado_questoes(simulado_id);
