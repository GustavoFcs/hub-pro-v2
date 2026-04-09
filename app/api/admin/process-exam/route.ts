// POST /api/admin/process-exam
// Recebe o PDF, envia para a IA → extrai questões → localiza e recorta figuras.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { preparePdf } from '@/lib/pdf/preparePdf'
import { analyzeExam, AnalyzedQuestion } from '@/lib/ai/client'
import { locateFigureOnPage } from '@/lib/ai/locateFigure'
import { renderPageAsPng, cropFigureFromPage } from '@/lib/pdf/cropFigure'
import { uploadQuestionImage } from '@/lib/storage/uploadQuestionImage'
import { pdfSessionStore } from '@/lib/pdfSessionStore'
import { calculateDifficulty } from '@/lib/difficulty/calculator'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

export type ProcessedQuestion = AnalyzedQuestion & {
  pagina: number
}

export type ProcessExamResponse = {
  provaId: string
  pdfUrl: string
  questions: ProcessedQuestion[]
  sessionId: string
}

export async function POST(req: NextRequest) {
  // ── 0. Verificar OPENROUTER_API_KEY ───────────────────────
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'Nenhuma chave de API de IA configurada no .env.local' },
      { status: 500 }
    )
  }

  // ── 1. Autenticação + autorização ──────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // ── 2. Parsear form-data ───────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const file = formData.get('pdf') as File | null
  const titulo = (formData.get('titulo') as string | null)?.trim()
  const ano = parseInt((formData.get('ano') as string | null) ?? '0', 10)
  const instituicaoId = (formData.get('instituicao_id') as string | null)?.trim()
  const cropMode = (formData.get('cropMode') as string | null) ?? 'ai'

  if (!file || !titulo || !ano || !instituicaoId) {
    return NextResponse.json({
      error: 'Campos obrigatórios: pdf, titulo, ano, instituicao_id'
    }, { status: 400 })
  }
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    return NextResponse.json({ error: 'Arquivo deve ser um PDF' }, { status: 400 })
  }
  if (ano < 1990 || ano > new Date().getFullYear() + 1) {
    return NextResponse.json({ error: 'Ano inválido' }, { status: 400 })
  }

  const pdfBuffer = Buffer.from(await file.arrayBuffer())

  // ── 2.5. Criar sessão para render-page (crop manual) ──────
  const sessionId = randomUUID()
  pdfSessionStore.set(sessionId, pdfBuffer)
  setTimeout(() => pdfSessionStore.delete(sessionId), 30 * 60 * 1000)
  console.log(`[Session] PDF salvo com sessionId: ${sessionId}`)

  // ── 3. Validar e preparar o PDF ────────────────────────────
  let preparedPdf
  try {
    preparedPdf = await preparePdf(pdfBuffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF inválido'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  console.log(`[process-exam] PDF preparado: ${preparedPdf.sizeKB} KB | tipo: ${preparedPdf.type}`)

  // ── 4. Upload do PDF para o Storage ───────────────────────
  const storagePath = `provas/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: uploadError } = await supabase.storage
    .from('provas-pdfs')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    console.error('[process-exam] Upload error:', uploadError)
    return NextResponse.json({ error: 'Falha ao fazer upload do PDF' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('provas-pdfs').getPublicUrl(storagePath)
  const pdfUrl = urlData.publicUrl

  // ── 5. Criar registro da prova no banco ───────────────────
  const { data: prova, error: provaError } = await supabase
    .from('provas')
    .insert({
      titulo,
      ano,
      instituicao_id: instituicaoId,
      pdf_url: pdfUrl,
      status: 'processando',
    })
    .select('id')
    .single()

  if (provaError || !prova) {
    console.error('[process-exam] Prova insert error:', provaError)
    return NextResponse.json({ error: 'Falha ao criar registro da prova' }, { status: 500 })
  }

  // ── 6. Buscar nome da instituição para contexto IA ────────
  const { data: inst } = await supabase
    .from('instituicoes')
    .select('nome, sigla')
    .eq('id', instituicaoId)
    .single()
  const institutionName = inst?.sigla ?? inst?.nome ?? 'Instituição'

  // ── 7. Enviar PDF inteiro para a IA ───────────────────────
  let pages
  try {
    pages = await analyzeExam(preparedPdf, { institution: institutionName, year: ano })
    console.log('[Debug] Primeira questão raw:',
      JSON.stringify(pages[0]?.questions[0], null, 2))
  } catch (err) {
    console.error('[process-exam] AI error:', err)
    await supabase.from('provas').update({ status: 'erro' }).eq('id', prova.id)
    return NextResponse.json({ error: 'Falha na análise da IA' }, { status: 500 })
  }

  // ── 8. Achatar questões de todas as páginas ───────────────
  const allQuestions: ProcessedQuestion[] = []
  for (const page of pages) {
    // Aceitar páginas com hasQuestions=true OU que tenham questões no array
    // (a IA às vezes marca hasQuestions=false mesmo tendo extraído questões)
    if (page.hasQuestions || page.questions.length > 0) {
      for (const q of page.questions) {
        allQuestions.push({ ...q, pagina: page.pageNumber })
      }
    }
  }

  // ── 8.1. Normalizar NFC — corrigir ç/ã/ê decompostos ─────
  function normalizeNFC(val: unknown): unknown {
    if (typeof val === 'string') return val.normalize('NFC')
    if (Array.isArray(val)) return val.map(normalizeNFC)
    if (val && typeof val === 'object') {
      return Object.fromEntries(
        Object.entries(val).map(([k, v]) => [k, normalizeNFC(v)])
      )
    }
    return val
  }
  for (let i = 0; i < allQuestions.length; i++) {
    allQuestions[i] = normalizeNFC(allQuestions[i]) as ProcessedQuestion
  }

  console.log(`[process-exam] Questões extraídas: ${allQuestions.length} em ${pages.length} páginas`)

  // ── 8.5. Refinar dificuldade com calculator ───────────────
  for (const question of allQuestions) {
    question.difficulty = calculateDifficulty({
      aiSuggestion:    question.difficulty,
      institution:     institutionName,
      subject:         question.subject,
      hasFormula:      /\[|\(|\$/.test(question.enunciado ?? ''),
      hasFigure:       question.visualElement?.type === 'crop',
      statementLength: question.enunciado?.length,
    })
  }

  // ── 9. Processar crops: render página → localizar figura → recortar ──────
  if (cropMode !== 'manual') {
  const questionsWithFigures = allQuestions.filter(
    q => q.visualElement?.type === 'crop' && q.visualElement?.pageNumber
  )

  console.log(`[Crop] ${questionsWithFigures.length} questões com figura para processar`)

  // Cache de páginas já renderizadas (base64 PNG) para evitar re-renders
  const pageCache = new Map<number, Buffer>()

  for (const question of questionsWithFigures) {
    const { pageNumber, description } = question.visualElement!
    if (!pageNumber) continue

    console.log(`[Crop] Processando Q${question.questionNumber} - página ${pageNumber}`)

    try {
      // 9a. Renderizar página como PNG (cache)
      if (!pageCache.has(pageNumber)) {
        const rendered = await renderPageAsPng(pdfBuffer, pageNumber)
        pageCache.set(pageNumber, rendered)
      }
      const pageImageBuffer = pageCache.get(pageNumber)!
      const pageMeta = await sharp(pageImageBuffer).metadata()
      const pageWidth  = pageMeta.width  ?? 800
      const pageHeight = pageMeta.height ?? 1100

      // 9b. Visão: localizar figura na página renderizada
      const cropBox = await locateFigureOnPage(
        pageImageBuffer.toString('base64'),
        description ?? 'figura da questão',
        question.questionNumber,
        pageWidth,
        pageHeight
      )

      if (!cropBox) {
        console.warn(`[Crop] Q${question.questionNumber}: figura não localizada, pulando`)
        continue
      }

      // 9c. Recortar figura
      const croppedBuffer = await cropFigureFromPage(pageImageBuffer, cropBox)

      // 9d. Upload para Storage
      const fileName = `q${question.questionNumber}-p${pageNumber}-${Date.now()}.png`
      const imageUrl = await uploadQuestionImage(croppedBuffer, fileName)

      if (imageUrl) {
        question.visualElement!.imageUrl = imageUrl
        console.log(`[Crop] Q${question.questionNumber}: ✅ ${imageUrl}`)
      } else {
        console.warn(`[Crop] Q${question.questionNumber}: ⚠️ upload falhou`)
      }
    } catch (err: any) {
      console.error(`[Crop] Q${question.questionNumber}: erro:`, err?.message)
      // Continuar com as demais questões
    }
  }
  } // end: cropMode !== 'manual'

  // Atualizar status para pendente_revisao
  await supabase.from('provas').update({ status: 'pendente_revisao' }).eq('id', prova.id)

  return NextResponse.json({
    provaId: prova.id,
    pdfUrl,
    questions: allQuestions,
    sessionId,
  } satisfies ProcessExamResponse)
}
