-- ─── Pastas de simulados ──────────────────────────────────
CREATE TABLE IF NOT EXISTS simulado_folders (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Adicionar folder_id à tabela simulados ──────────────
ALTER TABLE simulados
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES simulado_folders(id) ON DELETE SET NULL;

-- ─── Tentativas de resolução ──────────────────────────────
CREATE TABLE IF NOT EXISTS simulado_attempts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  simulado_id uuid REFERENCES simulados(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at  timestamptz DEFAULT now(),
  finished_at timestamptz,
  status      text NOT NULL DEFAULT 'in_progress'
);

ALTER TABLE simulado_attempts
  DROP CONSTRAINT IF EXISTS simulado_attempts_status_check;
ALTER TABLE simulado_attempts
  ADD CONSTRAINT simulado_attempts_status_check
  CHECK (status IN ('in_progress', 'finished'));

-- ─── Respostas por questão ────────────────────────────────
CREATE TABLE IF NOT EXISTS simulado_responses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id  uuid REFERENCES simulado_attempts(id) ON DELETE CASCADE,
  questao_id  uuid REFERENCES questoes(id) ON DELETE CASCADE,
  resposta    text,
  pulada      boolean NOT NULL DEFAULT false,
  correta     boolean,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(attempt_id, questao_id)
);

-- ─── RLS ─────────────────────────────────────────────────
ALTER TABLE simulado_folders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulado_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulado_responses ENABLE ROW LEVEL SECURITY;

-- Pastas
DROP POLICY IF EXISTS "user_own_folders" ON simulado_folders;
CREATE POLICY "user_own_folders" ON simulado_folders
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tentativas
DROP POLICY IF EXISTS "user_own_attempts" ON simulado_attempts;
CREATE POLICY "user_own_attempts" ON simulado_attempts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Respostas (via tentativa do usuário)
DROP POLICY IF EXISTS "user_own_responses" ON simulado_responses;
CREATE POLICY "user_own_responses" ON simulado_responses
  USING (
    attempt_id IN (
      SELECT id FROM simulado_attempts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    attempt_id IN (
      SELECT id FROM simulado_attempts WHERE user_id = auth.uid()
    )
  );

-- ─── Índices ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_folders_user        ON simulado_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_simulado   ON simulado_attempts(simulado_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user       ON simulado_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_attempt   ON simulado_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_questao   ON simulado_responses(questao_id);
