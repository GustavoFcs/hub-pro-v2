// Usa o modelo de visão para localizar uma figura em uma página renderizada como PNG.
// Retorna a bounding box em percentuais (0-100) ou null se não encontrar.

import { getActiveAIConfig } from '@/lib/ai/config'

export type CropBox = {
  xPct: number  // left edge  (0-100)
  yPct: number  // top edge   (0-100)
  wPct: number  // width      (0-100)
  hPct: number  // height     (0-100)
}

// ── Shared API helper ─────────────────────────────────────────────────────────

async function callVisionAPI(
  pageImageBase64: string,
  prompt: string,
  questionNumber: number
): Promise<any | null> {
  const config = getActiveAIConfig()

  const isOpenRouter = config.provider === 'openrouter'
  const baseURL = isOpenRouter
    ? 'https://openrouter.ai/api/v1'
    : 'https://api.openai.com/v1'
  const apiKey = isOpenRouter
    ? process.env.OPENROUTER_API_KEY!
    : process.env.OPENAI_API_KEY!

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (isOpenRouter) {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    headers['X-OpenRouter-Title'] = 'Hub Pro'
  }

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.visionModel,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${pageImageBase64}`, detail: 'high' },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error(`[locateFigure] Q${questionNumber}: HTTP ${res.status}:`, errBody)
    return null
  }

  const json = await res.json()
  const raw: string = json.choices?.[0]?.message?.content ?? ''
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    console.error(`[locateFigure] Q${questionNumber}: JSON inválido:`, cleaned)
    return null
  }
}

// ── Validate and normalize a parsed bounding box ──────────────────────────────

function parseCropBox(parsed: any, questionNumber: number): CropBox | null {
  const rawBox = {
    xPct: Number(parsed.xPct),
    yPct: Number(parsed.yPct),
    wPct: Number(parsed.wPct),
    hPct: Number(parsed.hPct),
  }

  if (Object.values(rawBox).some(v => isNaN(v))) {
    console.error(`[locateFigure] Q${questionNumber}: valores NaN:`, parsed)
    return null
  }

  // Clamp origin to [0, 99] and dimensions to fit within image
  const xPct = Math.min(Math.max(rawBox.xPct, 0), 99)
  const yPct = Math.min(Math.max(rawBox.yPct, 0), 99)
  const wPct = Math.min(Math.max(rawBox.wPct, 1), 100 - xPct)
  const hPct = Math.min(Math.max(rawBox.hPct, 1), 100 - yPct)

  // Reject boxes too small — likely a hallucinated or empty-space prediction
  if (wPct < 5 || hPct < 5) {
    console.error(`[locateFigure] Q${questionNumber}: box muito pequena: w=${wPct.toFixed(1)}% h=${hPct.toFixed(1)}%`)
    return null
  }

  // Reject boxes that cover the entire page — almost certainly wrong
  if (wPct > 95 && hPct > 95) {
    console.warn(`[locateFigure] Q${questionNumber}: box cobre página inteira — provavelmente errada`)
    return null
  }

  return { xPct, yPct, wPct, hPct }
}

// ── Retry with a simpler prompt ───────────────────────────────────────────────

async function locateFigureOnPageRetry(
  pageImageBase64: string,
  description: string,
  questionNumber: number,
  pageWidth: number,
  pageHeight: number
): Promise<CropBox | null> {
  const prompt = `
Na imagem de ${pageWidth}x${pageHeight}px, encontre: "${description}".
Retorne JSON: {"xPct":N,"yPct":N,"wPct":N,"hPct":N}
Apenas a figura, sem texto. Sem markdown.
  `.trim()

  try {
    const parsed = await callVisionAPI(pageImageBase64, prompt, questionNumber)
    if (!parsed || parsed?.notFound) return null
    const box = parseCropBox(parsed, questionNumber)
    if (box) console.log(`[locateFigure] Q${questionNumber}: box (retry)=${JSON.stringify(box)}`)
    return box
  } catch (err: any) {
    console.error(`[locateFigure] Q${questionNumber}: retry erro:`, err?.message)
    return null
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function locateFigureOnPage(
  pageImageBase64: string,
  description: string,
  questionNumber: number,
  pageWidth: number,
  pageHeight: number
): Promise<CropBox | null> {
  const prompt = `
Você está analisando uma página de prova brasileira com dimensões ${pageWidth}x${pageHeight} pixels.

Localize a figura associada à questão ${questionNumber}: "${description}".

INSTRUÇÕES:
- Identifique apenas a figura/diagrama/gráfico relacionado à questão
- NÃO inclua texto de enunciado, alternativas A/B/C/D/E, cabeçalhos ou rodapés
- Adicione 2% de padding em cada lado ao redor da figura
- Se houver múltiplas figuras relacionadas à mesma questão, englobe todas em uma única box
- A box deve conter SOMENTE elementos visuais (linhas, formas, gráficos, diagramas)
- NUNCA retorne coordenadas de área em branco ou espaço vazio

Retorne SOMENTE JSON puro, sem markdown:
{
  "xPct": <borda esquerda como % da largura — número decimal>,
  "yPct": <borda superior como % da altura — número decimal>,
  "wPct": <largura da box como % da largura total — número decimal>,
  "hPct": <altura da box como % da altura total — número decimal>,
  "confidence": <sua confiança de 0 a 1>
}

Se não houver figura visual, retorne: {"notFound": true}
Retorne APENAS JSON, sem explicações, sem markdown.
`.trim()

  try {
    const parsed = await callVisionAPI(pageImageBase64, prompt, questionNumber)
    if (!parsed) return null

    if (parsed?.notFound) {
      console.log(`[locateFigure] Q${questionNumber}: figura não encontrada na página`)
      return null
    }

    // Retry on low confidence
    if (typeof parsed.confidence === 'number' && parsed.confidence < 0.5) {
      console.warn(`[locateFigure] Q${questionNumber}: confiança baixa (${parsed.confidence}), tentando novamente...`)
      return await locateFigureOnPageRetry(pageImageBase64, description, questionNumber, pageWidth, pageHeight)
    }

    const box = parseCropBox(parsed, questionNumber)
    if (box) console.log(`[locateFigure] Q${questionNumber}: box=${JSON.stringify(box)}`)
    return box
  } catch (err: any) {
    console.error(`[locateFigure] Q${questionNumber}: erro:`, err?.message)
    return null
  }
}

