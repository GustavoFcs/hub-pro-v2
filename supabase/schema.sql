-- =============================================================
-- DERELICT QB — Schema Supabase (idempotente)
-- Execute no Supabase Dashboard > SQL Editor
-- =============================================================

-- ── Extensões ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABELAS
-- =============================================================

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── materias ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── subtopicos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtopicos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  materia_id  UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── instituicoes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instituicoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL UNIQUE,
  sigla       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── provas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT NOT NULL,
  instituicao_id  UUID REFERENCES instituicoes(id),
  ano             INTEGER NOT NULL,
  pdf_url         TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── questoes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prova_id        UUID REFERENCES provas(id) ON DELETE SET NULL,
  materia_id      UUID REFERENCES materias(id),
  subtopico_id    UUID REFERENCES subtopicos(id),
  instituicao_id  UUID REFERENCES instituicoes(id),
  ano             INTEGER,
  numero_questao  INTEGER,
  enunciado       TEXT NOT NULL,
  dificuldade     TEXT NOT NULL DEFAULT 'medio'
                    CHECK (dificuldade IN ('facil', 'medio', 'dificil')),
  tem_imagem      BOOLEAN NOT NULL DEFAULT FALSE,
  imagem_tipo     TEXT CHECK (imagem_tipo IN ('crop', 'reconstruida', NULL)),
  imagem_url      TEXT,
  imagem_svg      TEXT,
  gabarito        TEXT CHECK (gabarito IN ('a','b','c','d','e', NULL)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── alternativas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alternativas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id  UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  letra       TEXT NOT NULL CHECK (letra IN ('a','b','c','d','e')),
  texto       TEXT NOT NULL,
  ordem       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── videos_yt ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos_yt (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id   UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  youtube_url  TEXT NOT NULL,
  titulo       TEXT,
  professor    TEXT,
  validado     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── simulados ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL DEFAULT 'Simulado sem título',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── simulado_questoes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulado_questoes (
  simulado_id  UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  questao_id   UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  ordem        INTEGER NOT NULL,
  PRIMARY KEY (simulado_id, questao_id)
);

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Cria perfil automaticamente quando um usuário registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_provas_updated_at ON provas;
CREATE TRIGGER set_provas_updated_at
  BEFORE UPDATE ON provas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_questoes_updated_at ON questoes;
CREATE TRIGGER set_questoes_updated_at
  BEFORE UPDATE ON questoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE materias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopicos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE instituicoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE provas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE questoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternativas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos_yt          ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulado_questoes  ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: verifica se o usuário logado é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── Policies: profiles ───────────────────────────────────────
DROP POLICY IF EXISTS "profiles: leitura própria" ON profiles;
CREATE POLICY "profiles: leitura própria"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profiles: edição própria" ON profiles;
CREATE POLICY "profiles: edição própria"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles: inserção própria" ON profiles;
CREATE POLICY "profiles: inserção própria"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ── Policies: materias, subtopicos, instituicoes ─────────────
DROP POLICY IF EXISTS "materias: leitura pública" ON materias;
CREATE POLICY "materias: leitura pública"
  ON materias FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "materias: escrita admin" ON materias;
CREATE POLICY "materias: escrita admin"
  ON materias FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "subtopicos: leitura pública" ON subtopicos;
CREATE POLICY "subtopicos: leitura pública"
  ON subtopicos FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "subtopicos: escrita admin" ON subtopicos;
CREATE POLICY "subtopicos: escrita admin"
  ON subtopicos FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "instituicoes: leitura pública" ON instituicoes;
CREATE POLICY "instituicoes: leitura pública"
  ON instituicoes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "instituicoes: escrita admin" ON instituicoes;
CREATE POLICY "instituicoes: escrita admin"
  ON instituicoes FOR ALL USING (is_admin());

-- ── Policies: provas ─────────────────────────────────────────
DROP POLICY IF EXISTS "provas: leitura pública" ON provas;
CREATE POLICY "provas: leitura pública"
  ON provas FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "provas: escrita admin" ON provas;
CREATE POLICY "provas: escrita admin"
  ON provas FOR ALL USING (is_admin());

-- ── Policies: questoes ───────────────────────────────────────
DROP POLICY IF EXISTS "questoes: leitura pública" ON questoes;
CREATE POLICY "questoes: leitura pública"
  ON questoes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "questoes: escrita admin" ON questoes;
CREATE POLICY "questoes: escrita admin"
  ON questoes FOR ALL USING (is_admin());

-- ── Policies: alternativas ───────────────────────────────────
DROP POLICY IF EXISTS "alternativas: leitura pública" ON alternativas;
CREATE POLICY "alternativas: leitura pública"
  ON alternativas FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "alternativas: escrita admin" ON alternativas;
CREATE POLICY "alternativas: escrita admin"
  ON alternativas FOR ALL USING (is_admin());

-- ── Policies: videos_yt ──────────────────────────────────────
DROP POLICY IF EXISTS "videos_yt: leitura pública" ON videos_yt;
CREATE POLICY "videos_yt: leitura pública"
  ON videos_yt FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "videos_yt: escrita admin" ON videos_yt;
CREATE POLICY "videos_yt: escrita admin"
  ON videos_yt FOR ALL USING (is_admin());

-- ── Policies: simulados ──────────────────────────────────────
DROP POLICY IF EXISTS "simulados: acesso próprio" ON simulados;
CREATE POLICY "simulados: acesso próprio"
  ON simulados FOR ALL
  USING (user_id = auth.uid());

-- ── Policies: simulado_questoes ──────────────────────────────
DROP POLICY IF EXISTS "simulado_questoes: acesso próprio" ON simulado_questoes;
CREATE POLICY "simulado_questoes: acesso próprio"
  ON simulado_questoes FOR ALL
  USING (
    simulado_id IN (
      SELECT id FROM simulados WHERE user_id = auth.uid()
    )
  );

-- =============================================================
-- STORAGE BUCKETS
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('provas-pdfs', 'provas-pdfs', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('questoes-imagens', 'questoes-imagens', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy storage: provas-pdfs (apenas admins enviam/leem)
DROP POLICY IF EXISTS "provas-pdfs: upload admin" ON storage.objects;
CREATE POLICY "provas-pdfs: upload admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'provas-pdfs' AND is_admin());

DROP POLICY IF EXISTS "provas-pdfs: leitura admin" ON storage.objects;
CREATE POLICY "provas-pdfs: leitura admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'provas-pdfs' AND is_admin());

-- Policy storage: questoes-imagens (leitura pública, upload admin)
DROP POLICY IF EXISTS "questoes-imagens: leitura pública" ON storage.objects;
CREATE POLICY "questoes-imagens: leitura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'questoes-imagens');

DROP POLICY IF EXISTS "questoes-imagens: upload admin" ON storage.objects;
CREATE POLICY "questoes-imagens: upload admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'questoes-imagens' AND is_admin());

-- =============================================================
-- SEED: materias e subtopicos
-- =============================================================

INSERT INTO materias (nome) VALUES
  ('Matemática'),
  ('Física'),
  ('Química'),
  ('Português'),
  ('Inglês')
ON CONFLICT (nome) DO NOTHING;

-- Subtópicos Matemática
INSERT INTO subtopicos (nome, materia_id)
SELECT s.nome, m.id FROM materias m
CROSS JOIN (VALUES
  ('Funções'),
  ('Progressões'),
  ('Geometria'),
  ('Trigonometria'),
  ('Álgebra Linear')
) AS s(nome)
WHERE m.nome = 'Matemática'
ON CONFLICT DO NOTHING;

-- Subtópicos Física
INSERT INTO subtopicos (nome, materia_id)
SELECT s.nome, m.id FROM materias m
CROSS JOIN (VALUES
  ('Cinemática'),
  ('Dinâmica'),
  ('Termodinâmica'),
  ('Óptica'),
  ('Eletromagnetismo')
) AS s(nome)
WHERE m.nome = 'Física'
ON CONFLICT DO NOTHING;

-- Subtópicos Química
INSERT INTO subtopicos (nome, materia_id)
SELECT s.nome, m.id FROM materias m
CROSS JOIN (VALUES
  ('Estequiometria'),
  ('Físico-Química'),
  ('Orgânica'),
  ('Inorgânica')
) AS s(nome)
WHERE m.nome = 'Química'
ON CONFLICT DO NOTHING;

-- Subtópicos Português
INSERT INTO subtopicos (nome, materia_id)
SELECT s.nome, m.id FROM materias m
CROSS JOIN (VALUES
  ('Interpretação'),
  ('Gramática'),
  ('Redação'),
  ('Literatura')
) AS s(nome)
WHERE m.nome = 'Português'
ON CONFLICT DO NOTHING;

-- Subtópicos Inglês
INSERT INTO subtopicos (nome, materia_id)
SELECT s.nome, m.id FROM materias m
CROSS JOIN (VALUES
  ('Reading'),
  ('Grammar'),
  ('Vocabulary')
) AS s(nome)
WHERE m.nome = 'Inglês'
ON CONFLICT DO NOTHING;

-- =============================================================
-- SEED: instituicoes
-- =============================================================

INSERT INTO instituicoes (nome, sigla) VALUES
  ('Exame Nacional do Ensino Médio', 'ENEM'),
  ('Fundação Universitária para o Vestibular', 'FUVEST'),
  ('Universidade Estadual de Campinas', 'UNICAMP'),
  ('Universidade do Estado do Rio de Janeiro', 'UERJ'),
  ('Universidade Federal do Rio de Janeiro', 'UFRJ'),
  ('Universidade de São Paulo', 'USP'),
  ('Instituto Militar de Engenharia', 'IME'),
  ('Instituto Tecnológico de Aeronáutica', 'ITA')
ON CONFLICT (nome) DO NOTHING;
