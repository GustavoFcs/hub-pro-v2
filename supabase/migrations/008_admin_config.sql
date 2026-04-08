-- Migration 008: tabela admin_config para configurações persistidas via painel admin
-- Armazena pares key/value JSONB; acessível apenas via service_role (bypasses RLS).

CREATE TABLE IF NOT EXISTS public.admin_config (
  key        TEXT PRIMARY KEY,
  value      JSONB         NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- RLS habilitado: nenhum acesso via anon/authenticated — somente service_role
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Sem políticas: somente o service_role (que bypassa RLS) pode ler/escrever
-- Seed padrão com os modelos (admin pode sobrescrever via painel)
INSERT INTO public.admin_config (key, value)
VALUES (
  'ai_models',
  '{
    "provider": "openrouter",
    "textModel": "openai/gpt-4.1-nano",
    "visionModel": "google/gemini-2.0-flash",
    "svgModel": "google/gemini-2.5-pro-preview",
    "extractAsText": "false"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
