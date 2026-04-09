-- Tabela de questões salvas por usuário
CREATE TABLE IF NOT EXISTS questoes_salvas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questao_id  UUID NOT NULL REFERENCES questoes(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, questao_id)
);

-- RLS
ALTER TABLE questoes_salvas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_own_saves'
  ) THEN
    CREATE POLICY "users_own_saves" ON questoes_salvas
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
