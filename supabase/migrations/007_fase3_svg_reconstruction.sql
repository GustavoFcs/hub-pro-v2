-- =============================================================
-- FASE 3 — Reconstrução de figuras via IA
-- Adiciona coluna para path privado do crop original
-- =============================================================

-- Coluna para armazenar o path da imagem privada no bucket questoes-imagens-private
-- Formato: figuras/private/qN-pM-timestamp.png
ALTER TABLE questoes
  ADD COLUMN IF NOT EXISTS crop_image_path TEXT NULL;

-- Documentação da estrutura esperada para imagem_tipo após esta migration:
-- 'crop'       → crop feito, aguardando reconstrução (crop_image_path preenchido, imagem_url NULL)
-- 'reconstruida' → SVG aprovado (imagem_svg preenchido, crop_image_path mantido como ref)
-- NULL         → questão sem imagem

-- =============================================================
-- Bucket privado para crops originais
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'questoes-imagens-private',
  'questoes-imagens-private',
  false,                          -- privado: sem acesso público
  5242880,                        -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: apenas service_role pode inserir (upload via server-side)
-- Nota: service_role bypassa RLS automaticamente — políticas abaixo
-- são para documentação e para evitar acesso via anon/authenticated.
-- Bloquear acesso público ao bucket (negar tudo para anon e authenticated)
CREATE POLICY "deny anon private crops"
  ON storage.objects FOR ALL
  TO anon
  USING (bucket_id != 'questoes-imagens-private')
  WITH CHECK (bucket_id != 'questoes-imagens-private');

CREATE POLICY "deny authenticated private crops"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id != 'questoes-imagens-private')
  WITH CHECK (bucket_id != 'questoes-imagens-private');
