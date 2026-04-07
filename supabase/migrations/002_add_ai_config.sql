CREATE TABLE IF NOT EXISTS ai_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'openrouter',
  model text NOT NULL DEFAULT 'google/gemini-2.0-flash',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO ai_config (provider, model, active)
VALUES ('openrouter', 'google/gemini-2.0-flash', true);

-- RLS
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only" ON ai_config
  USING (auth.role() = 'authenticated');
