-- Migration 001: Adicionar campos de processamento de provas
-- Execute no Supabase SQL Editor APÓS o schema.sql inicial

-- Adicionar status pendente_revisao à enum da tabela provas
-- (O PostgreSQL não permite ALTER TYPE em enums de forma direta, usamos uma abordagem segura)

DO $$
BEGIN
  -- Verificar se o constraint ja existe antes de modificar
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'prova_status')
    AND enumlabel = 'pendente_revisao'
  ) THEN
    -- Adicionar novo valor à enum existente
    ALTER TYPE prova_status ADD VALUE IF NOT EXISTS 'pendente_revisao' AFTER 'processando';
  END IF;
EXCEPTION
  -- Se a enum não existir (schema antigo usa TEXT), apenas ignorar
  WHEN undefined_object THEN NULL;
END $$;

-- Caso a tabela provas use TEXT em vez de enum customizada (schema atual):
-- O campo status já suporta qualquer string, então 'pendente_revisao' já funciona.
-- Esta migration garante consistência apenas se você usar enum.

-- Garantir que o campo status da tabela provas aceita 'pendente_revisao'
-- Verificar se existe restrição de check no campo status
DO $$
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'provas_status_check'
    AND table_name = 'provas'
  ) THEN
    ALTER TABLE provas DROP CONSTRAINT provas_status_check;
  END IF;
END $$;

-- Adicionar nova restrição incluindo 'pendente_revisao'
ALTER TABLE provas
  ADD CONSTRAINT provas_status_check
  CHECK (status IN ('pendente', 'processando', 'pendente_revisao', 'concluido', 'erro'));

-- Índice para busca rápida por status (útil para o dashboard de admin)
CREATE INDEX IF NOT EXISTS idx_provas_status ON provas(status);
CREATE INDEX IF NOT EXISTS idx_questoes_prova_id ON questoes(prova_id);
CREATE INDEX IF NOT EXISTS idx_questoes_materia ON questoes(materia_id);
CREATE INDEX IF NOT EXISTS idx_questoes_instituicao ON questoes(instituicao_id);
CREATE INDEX IF NOT EXISTS idx_questoes_ano ON questoes(ano);
CREATE INDEX IF NOT EXISTS idx_videos_yt_questao ON videos_yt(questao_id);
CREATE INDEX IF NOT EXISTS idx_alternativas_questao ON alternativas(questao_id);
