// Cliente de IA — suporta openrouter, openai, anthropic, gemini
// Configure via .env.local — veja .env.example para opcoes.

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { PreparedPdf } from '@/lib/pdf/preparePdf'
import { getActiveAIConfig, getAIHeaders, getAIBaseURL, type AIConfig } from '@/lib/ai/config'

// Tipos publicos

export type VisualElement = {
  type: 'crop' | 'text_only'
  description: string
  pageNumber?: number | null
  imageUrl?: string | null
}

export type AnalyzedQuestion = {
  questionNumber: number
  enunciado: string
  alternatives: { letra: 'a' | 'b' | 'c' | 'd' | 'e'; texto: string }[]
  subject: string
  subtopic: string
  difficulty: 'facil' | 'medio' | 'dificil' | 'muito_dificil'
  visualElement: VisualElement
  gabarito?: string
}

export type AnalyzedPage = {
  pageNumber: number
  questions: AnalyzedQuestion[]
  hasQuestions: boolean
}

export type ExamContext = {
  institution: string
  year: number
  subject?: string
}

// Prompt

const SYSTEM_PROMPT = `Voce e um sistema especializado em digitalizacao de provas de vestibular e concursos brasileiros.
Extraia TODAS as questoes do conteudo fornecido. Retorne APENAS JSON valido, sem texto adicional.`

function buildPrompt(context: ExamContext): string {
  return `Analise TODAS as paginas desta prova de ${context.institution} ${context.year}.

Extraia TODAS as questoes sem excecao. Provas do IME/ITA/FUVEST/ENEM
tipicamente tem entre 30 e 90 questoes - extraia TODAS.

Para cada questao retorne:
- questionNumber: numero inteiro da questao
- enunciado: texto completo (formulas em LaTeX: $formula$)

FORMATO OBRIGATORIO DAS ALTERNATIVAS:
Retorne EXATAMENTE assim, sem variacoes:
"alternatives": [
  { "letra": "a", "texto": "texto completo da alternativa" },
  { "letra": "b", "texto": "texto completo da alternativa" },
  { "letra": "c", "texto": "texto completo da alternativa" },
  { "letra": "d", "texto": "texto completo da alternativa" },
  { "letra": "e", "texto": "texto completo da alternativa" }
]
NUNCA use "text", "letter", "value" - SEMPRE "letra" e "texto".
NUNCA retorne alternativas com texto vazio.

- subject: materia
- subtopic: subtopico especifico
- difficulty: "facil", "medio" ou "dificil"
- visualElement: { type: "crop" | "text_only", pageNumber: number | null, description: string }

REGRAS DE ELEMENTOS VISUAIS:
- Se houver figura/grafico/diagrama/circuito: type="crop", pageNumber=<pagina>, description=<descricao>
- NUNCA usar type="reconstruct" ou type="text_only" quando ha elemento visual
- NUNCA retornar svgContent
- Se nao ha elemento visual: type="text_only"

Retorne SOMENTE este JSON:
{
  "pages": [
    {
      "pageNumber": 1,
      "hasQuestions": true,
      "questions": [ ... ]
    }
  ]
}`
}

// Funcao principal

export async function analyzeExam(
  pdf: PreparedPdf,
  context: ExamContext
): Promise<AnalyzedPage[]> {
  const config = getActiveAIConfig()

  console.log(`[AI] Iniciando extracao | Provider: ${config.provider} | Modelo: ${config.textModel}`)

  try {
    let pages: AnalyzedPage[]

    if (config.provider === 'openrouter' || config.provider === 'openai') {
      pages = await analyzeWithOpenAICompatible(pdf, context, config)
    } else if (config.provider === 'anthropic') {
      pages = await analyzeWithAnthropic(pdf, context, config)
    } else if (config.provider === 'gemini') {
      pages = await analyzeWithGemini(pdf, context, config)
    } else {
      throw new Error(`Provider desconhecido: ${config.provider}`)
    }

    pages = normalizePages(pages)

    const total = pages.reduce((s, p) => s + p.questions.length, 0)
    const withFigure = pages
      .flatMap(p => p.questions)
      .filter(q => q.visualElement?.type === 'crop').length

    console.log(`[AI] Extracao concluida: ${total} questoes | ${withFigure} com figura`)
    console.log('[Debug] Primeira questao raw:', JSON.stringify(pages[0]?.questions[0], null, 2))

    return pages
  } catch (err: any) {
    console.error('[AI Error]', err?.message)
    throw new Error('Falha ao analisar o PDF com IA. Verifique os logs.')
  }
}

// OpenAI / OpenRouter
// text-mode (AI_EXTRACT_AS_TEXT=true): extrai texto do PDF localmente via pdfjs e envia como texto puro.
//   → para modelos text-only como gpt-5.4-nano, gpt-4o-mini, etc.
// file-mode (padrão): envia o PDF como file block base64 inline.
//   → para modelos multimodais como gpt-4o, gemini-2.0-flash, claude.

async function analyzeWithOpenAICompatible(
  pdf: PreparedPdf,
  context: ExamContext,
  config: AIConfig
): Promise<AnalyzedPage[]> {
  const headers = getAIHeaders(config)
  const baseURL = getAIBaseURL(config)
  const isOpenRouter = config.provider === 'openrouter'

  let userContent: unknown[]

  if (config.extractAsText) {
    // Modo texto: extrai o conteúdo textual do PDF localmente e envia como texto puro.
    // Compatível com qualquer modelo de linguagem (text-only ou multimodal).
    const { extractTextFromPdf } = await import('@/lib/pdf/extractText')
    const pdfBuffer = Buffer.from(pdf.base64, 'base64')
    const pdfPages = await extractTextFromPdf(pdfBuffer)

    const pdfText = pdfPages
      .map(p => `=== PÁGINA ${p.pageNumber} ===\n${p.text}`)
      .join('\n\n')

    console.log(`[AI] text-mode: ${pdfPages.length} páginas | ${pdfText.length} chars enviados`)

    userContent = [
      { type: 'text', text: `${buildPrompt(context)}\n\n---\nCONTEÚDO DO PDF:\n\n${pdfText}` },
    ]
  } else {
    // Modo file: envia o PDF como bloco base64 inline.
    // Requer modelo com suporte a PDF (gpt-4o, gemini, claude).
    const dataUri = `data:application/pdf;base64,${pdf.base64}`
    userContent = [
      { type: 'file', file: { file_data: dataUri, filename: 'prova.pdf' } },
      { type: 'text', text: buildPrompt(context) },
    ]
  }

  const bodyObj: Record<string, unknown> = {
    model: config.textModel,
    max_tokens: 32000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  }

  // response_format json_object só para OpenAI nativo
  if (!isOpenRouter) {
    bodyObj.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyObj),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error(`[AI] Erro HTTP ${res.status}:`, errBody)
    if (errBody.includes('File data is missing') || errBody.includes('file_data')) {
      throw new Error(
        `Modelo "${config.textModel}" não suporta envio de PDF inline. ` +
        `Use AI_EXTRACT_AS_TEXT=true no .env.local para habilitar extração de texto local.`
      )
    }
    throw new Error(`API retornou ${res.status}: ${errBody}`)
  }

  const json = await res.json()

  const choice = json.choices?.[0]
  if (!choice) {
    console.error('[AI] Resposta sem choices:', JSON.stringify(json).slice(0, 500))
    throw new Error('API retornou resposta sem choices')
  }
  if (choice.finish_reason === 'content_filter') {
    throw new Error('Conteúdo bloqueado pelo filtro do modelo')
  }

  const raw: string = choice.message?.content ?? ''

  const input = json.usage?.prompt_tokens ?? 0
  const output = json.usage?.completion_tokens ?? 0
  console.log(`[AI Cost] ${config.textModel}: input=${input} output=${output} tokens | finish=${choice.finish_reason}`)

  if (!raw) {
    console.error('[AI] Conteúdo vazio. Full choice:', JSON.stringify(choice).slice(0, 800))
    throw new Error(
      'O modelo retornou conteúdo vazio. Verifique se o modelo suporta PDFs e se há créditos disponíveis.'
    )
  }

  console.log('[AI Raw] Primeiros 500 chars:', raw.slice(0, 500))
  return extractAndParseJSON(raw)
}

// Anthropic

async function analyzeWithAnthropic(
  pdf: PreparedPdf,
  context: ExamContext,
  config: AIConfig
): Promise<AnalyzedPage[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const response = await client.messages.create({
    model: config.textModel,
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdf.base64,
            },
          },
          { type: 'text', text: SYSTEM_PROMPT + '\n\n' + buildPrompt(context) },
        ],
      },
    ],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('')

  console.log('[AI Raw] Primeiros 300 chars:', raw.slice(0, 300))
  return extractAndParseJSON(raw)
}

// Gemini

async function analyzeWithGemini(
  pdf: PreparedPdf,
  context: ExamContext,
  config: AIConfig
): Promise<AnalyzedPage[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: config.textModel })

  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: pdf.base64 } },
    SYSTEM_PROMPT + '\n\n' + buildPrompt(context),
  ])

  const raw = result.response.text()
  console.log('[AI Raw] Primeiros 300 chars:', raw.slice(0, 300))
  return extractAndParseJSON(raw)
}

// Parser robusto

/**
 * LaTeX dentro de strings JSON gera escapes inválidos (\d de \dfrac, \m de \mathbb, etc.).
 * JSON só permite: \" \\ \/ \b \f \n \r \t \uXXXX.
 * Esta função encontra cada string JSON (entre aspas) e dobra barras em escapes inválidos.
 */
function fixLatexEscapesInJSON(json: string): string {
  // Processar char-a-char para encontrar strings JSON corretamente
  let result = ''
  let i = 0
  while (i < json.length) {
    if (json[i] !== '"') {
      result += json[i]
      i++
      continue
    }
    // Início de string JSON
    result += '"'
    i++ // pula o "
    while (i < json.length && json[i] !== '"') {
      if (json[i] === '\\' && i + 1 < json.length) {
        const next = json[i + 1]
        // Escapes JSON válidos
        if ('"\\\/bfnrt'.includes(next)) {
          result += json[i] + json[i + 1]
          i += 2
        } else if (next === 'u') {
          // \uXXXX — manter
          result += json.slice(i, i + 6)
          i += 6
        } else {
          // Escape inválido (ex: \d, \m, \s, \i) → dobrar a barra: \\d
          result += '\\\\' + next
          i += 2
        }
      } else {
        result += json[i]
        i++
      }
    }
    if (i < json.length) {
      result += '"' // fechar string
      i++
    }
  }
  return result
}

function extractAndParseJSON(raw: string): AnalyzedPage[] {
  let cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  const start =
    firstBrace === -1 ? firstBracket :
    firstBracket === -1 ? firstBrace :
    Math.min(firstBrace, firstBracket)

  const lastBrace = cleaned.lastIndexOf('}')
  const lastBracket = cleaned.lastIndexOf(']')
  const end = Math.max(lastBrace, lastBracket)

  if (start === -1 || end === -1) {
    console.error('[AI Parse Error] Nenhum JSON encontrado. Raw completo (1000 chars):', raw.slice(0, 1000))
    return []
  }

  cleaned = cleaned.slice(start, end + 1)

  // LaTeX dentro de strings JSON gera escapes inválidos (\d, \m, \s, \i, etc.).
  // Corrigir: dentro de strings JSON, converter \ seguido de char não-JSON-escape em \\.
  // Escapes JSON válidos: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  cleaned = fixLatexEscapesInJSON(cleaned)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    console.error('[AI Parse Error] JSON invalido:', e)
    console.error('[AI Parse Error] Cleaned string:', cleaned.slice(0, 1000))
    return []
  }

  if (Array.isArray(parsed)) return parsed as AnalyzedPage[]

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj['pages'])) return obj['pages'] as AnalyzedPage[]
    if (Array.isArray(obj['questions'])) {
      return [{ pageNumber: 1, hasQuestions: true, questions: obj['questions'] as AnalyzedQuestion[] }]
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0) return val as AnalyzedPage[]
    }
    console.error('[AI Parse Error] Estrutura JSON desconhecida:', Object.keys(obj))
  }

  return []
}

function normalizePages(pages: AnalyzedPage[]): AnalyzedPage[] {
  const normalized = pages.map((p, i) => ({
    pageNumber: typeof p?.pageNumber === 'number' ? p.pageNumber : i + 1,
    hasQuestions: Boolean(p?.hasQuestions),
    questions: Array.isArray(p?.questions)
      ? p.questions.map((q: any) => {
          const alternatives = (q.alternatives ?? [])
            .map((alt: any) => ({
              letra: (alt.letra ?? alt.letter ?? alt.key ?? '').toLowerCase(),
              texto: alt.texto ?? alt.text ?? alt.value ?? alt.content ?? '',
            }))
            .filter((alt: any) => alt.texto.trim() !== '')

          const rawVisual = q.visualElement
          let visualElement: AnalyzedQuestion['visualElement']
          if (!rawVisual || rawVisual.type === 'text_only') {
            visualElement = { type: 'text_only', description: '' }
          } else {
            visualElement = {
              type: 'crop',
              pageNumber: rawVisual.pageNumber ?? rawVisual.page ?? null,
              description: rawVisual.description ?? '',
              imageUrl: null,
            }
          }

          return { ...q, alternatives, visualElement }
        })
      : [],
  }))

  console.log('[AI] Total questoes normalizadas:', normalized.reduce((s: number, p: any) => s + p.questions.length, 0))
  return normalized
}

// ── Scan de gabarito ──────────────────────────────────────────
// Recebe PDF do gabarito e retorna mapeamento numero→resposta.

const GABARITO_PROMPT = `Analise este gabarito de prova e extraia TODAS as respostas.
Retorne APENAS JSON valido, sem texto adicional:
{"answers":[{"number":1,"answer":"a"},{"number":2,"answer":"b"},{"number":3,"answer":"anulada"},...]}
Regras:
- "number" e o numero inteiro da questao
- "answer" deve ser exatamente: "a", "b", "c", "d", "e" ou "anulada"
- Para questoes anuladas/canceladas use "anulada"
- Inclua TODAS as questoes do gabarito sem excecao`

export async function scanGabaritoFromPdf(
  pdf: PreparedPdf
): Promise<{ number: number; answer: string }[]> {
  const config = getActiveAIConfig()
  console.log(`[scanGabarito] Provider: ${config.provider} | Modelo: ${config.textModel}`)

  try {
    let raw = '{"answers":[]}'

    if (config.provider === 'openrouter' || config.provider === 'openai') {
      const headers = getAIHeaders(config)
      const baseURL = getAIBaseURL(config)
      const isOpenRouter = config.provider === 'openrouter'

      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.textModel,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'user',
            content: [
              {
                type: 'file',
                file: { filename: 'gabarito.pdf', file_data: `data:application/pdf;base64,${pdf.base64}` },
              },
              { type: 'text', text: GABARITO_PROMPT },
            ],
          }],
        }),
      })
      const j = await res.json()
      raw = j.choices?.[0]?.message?.content ?? '{"answers":[]}'

    } else if (config.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
      const r2 = await client.messages.create({
        model: config.textModel,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.base64 } },
            { type: 'text', text: GABARITO_PROMPT },
          ],
        }],
      })
      raw = r2.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
    }

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const start = cleaned.indexOf('{')
    const end   = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1) return []

    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { answers?: unknown }
    const answers = Array.isArray(parsed?.answers) ? parsed.answers as { number: number; answer: string }[] : []

    console.log(`[scanGabarito] ${answers.length} respostas | anuladas: ${answers.filter(a => a.answer === 'anulada').length}`)
    return answers
  } catch (err) {
    console.error('[scanGabarito] Error:', err)
    return []
  }
}