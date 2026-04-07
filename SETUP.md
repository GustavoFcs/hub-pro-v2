# Derelict QB — Setup Guide

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (gratuito).
2. Clique em **New project** e preencha:
   - **Name:** derelict-qb (ou qualquer nome)
   - **Database Password:** anote uma senha forte
   - **Region:** South America (São Paulo) — ou a mais próxima
3. Aguarde o projeto ser provisionado (~1 min).

---

## 2. Rodar o schema SQL

1. No painel do Supabase, vá em **SQL Editor** (menu lateral).
2. Clique em **New query**.
3. Copie todo o conteúdo do arquivo `supabase/schema.sql` deste repositório.
4. Cole no editor e clique em **Run**.
5. Verifique que não há erros (mensagem "Success" no rodapé).

---

## 3. Configurar variáveis de ambiente

### Localmente

1. No painel Supabase, vá em **Settings > API**.
2. Copie os valores de:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (em Project API keys) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Na Vercel

1. Acesse o painel do projeto na Vercel.
2. Vá em **Settings > Environment Variables**.
3. Adicione as mesmas duas variáveis acima para os ambientes **Production**, **Preview** e **Development**.

---

## 4. Habilitar autenticação por e-mail

1. No Supabase, vá em **Authentication > Providers**.
2. Certifique-se que **Email** está habilitado.
3. Em **Authentication > Settings**, configure:
   - **Site URL:** `http://localhost:3000` (local) ou sua URL da Vercel (produção)
   - **Redirect URLs:** adicione `http://localhost:3000/**` e `https://seu-projeto.vercel.app/**`

---

## 5. Criar o primeiro usuário admin

### Passo 1 — Criar o usuário

1. Vá em **Authentication > Users** no Supabase.
2. Clique em **Add user > Create new user**.
3. Preencha e-mail e senha.
4. Clique em **Create user**.

### Passo 2 — Promover a admin

No **SQL Editor**, execute:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu-email@dominio.com';
```

---

## 6. Rodar o projeto localmente

```bash
# Instalar dependências
npm install --legacy-peer-deps

# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Dicas de deploy na Vercel

- Conecte o repositório GitHub na Vercel.
- As variáveis de ambiente já devem estar configuradas (passo 3).
- A cada `git push` na branch `main`, um novo deploy é feito automaticamente.
- Use o **Supabase Vercel Integration** (disponível na marketplace da Vercel) para sincronizar as variáveis automaticamente.

---

## Fase 2 — Pipeline de IA (Upload de Provas)

### 7. Configurar variáveis de IA

No `.env.local` (e nas variáveis da Vercel), adicione:

```env
# OpenRouter (recomendado — centraliza todos os modelos)
OPENROUTER_API_KEY=

# Provider padrão (usado como fallback se não houver config no banco)
AI_PROVIDER=openrouter

# OpenAI (obrigatório se AI_PROVIDER=openai ou usar modelos OpenAI direto)
OPENAI_API_KEY=sk-...

# Anthropic (obrigatório se AI_PROVIDER=anthropic ou usar modelos Anthropic direto)
ANTHROPIC_API_KEY=sk-ant-...

# YouTube Data API v3 (opcional — busca vídeos de correção)
YOUTUBE_API_KEY=AIzaSy...
```

**Obtendo as chaves:**
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- YouTube: [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → YouTube Data API v3

### 8. Rodar a migration SQL da Fase 2

No **SQL Editor** do Supabase, execute o arquivo:

```
supabase/migrations/001_add_prova_processing.sql
```

Isso adiciona o status `pendente_revisao` ao campo `status` da tabela `provas` e cria índices de performance.

### 9. Usar o pipeline de upload

1. Acesse `/admin/upload-prova`
2. Preencha: **título**, **ano** e **instituição**
3. Arraste ou selecione o PDF da prova (máx. 20 MB)
4. Clique em **PROCESSAR COM IA** — o backend vai:
   - Fazer upload do PDF para o Supabase Storage (`provas-pdfs`)
   - Enviar o PDF **inteiro** direto para o GPT-4o (Responses API) ou Claude (document block)
   - Não há conversão local de imagens — sem pdfjs, canvas ou sharp
   - Retornar todas as questões de todas as páginas em uma única chamada
5. Na tela de **Revisão**, você pode editar enunciado, alternativas, matéria, dificuldade e gabarito de cada questão
6. Marque o ícone do YouTube nas questões em que deseja busca automática de vídeo
7. Clique em **IMPORTAR** para salvar no banco

### Questões com elemento visual do tipo CROP

Quando a IA identifica uma imagem que não pode ser reconstruída como SVG (foto, mapa, diagrama complexo), ela retorna a descrição do elemento. O campo `imagem_svg` da questão recebe o prefixo `[CROP_DESCRIPTION]: ` seguido da descrição.

**Para adicionar a imagem manualmente:**
1. No Supabase Dashboard, acesse **Storage → questoes-imagens**
2. Faça upload da imagem recortada no caminho `questoes/{provaId}/q{numero}.webp`
3. Copie a URL pública
4. No SQL Editor, execute:
   ```sql
   UPDATE questoes SET imagem_url = 'URL_DA_IMAGEM', imagem_svg = NULL WHERE id = 'ID_DA_QUESTAO';
   ```

> No `QuestionCard`, questões com `[CROP_DESCRIPTION]:` exibem um placeholder visual indicando que a imagem está pendente.

### Custo estimado por prova (PDF típico de 60 questões ~15 páginas)

| Provedor  | Custo por prova |
|-----------|----------------|
| GPT-4o    | ~$0.10–0.20    |
| Claude    | ~$0.12–0.25    |

(varia conforme complexidade das questões e presença de imagens)
