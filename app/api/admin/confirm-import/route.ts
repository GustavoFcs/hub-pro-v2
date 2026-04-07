// POST /api/admin/confirm-import
// Receber rascunho revisado pelo admin e persistir questões no banco
// Questões com tipo "crop" têm a descrição da imagem salva em imagem_svg
// com o prefixo [CROP_DESCRIPTION]: para indicação de adição manual posterior.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchCorrectionVideo } from '@/lib/youtube/searchCorrection'

interface AlternativaInput {
  letra: 'a' | 'b' | 'c' | 'd' | 'e'
  texto: string
}

interface QuestaoInput {
  questionNumber: number
  pagina: number
  enunciado: string
  alternatives: AlternativaInput[]
  subject: string         // nome da matéria (será resolvido para ID)
  subtopic: string        // nome do subtópico (será resolvido para ID)
  difficulty: 'facil' | 'medio' | 'dificil'
  gabarito?: string
  visualElement: {
    type: 'crop' | 'reconstruct' | 'text_only'
    description: string
    imageUrl?: string | null   // URL já uploadada por process-exam
    boundingBox?: { x: number; y: number; width: number; height: number }
    svgContent?: string
  }
  // Buscar vídeo YouTube?
  searchVideo?: boolean
}

interface ConfirmImportBody {
  provaId: string
  ano: number
  instituicaoId: string
  questoes: QuestaoInput[]
}

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // ── Parse body ─────────────────────────────────────────────
  let body: ConfirmImportBody
  try {
    body = await req.json() as ConfirmImportBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { provaId, ano, instituicaoId, questoes } = body
  if (!provaId || !ano || !instituicaoId || !Array.isArray(questoes)) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  // ── Carregar materias + subtopicos para resolver IDs ───────
  const [{ data: materias }, { data: subtopicos }] = await Promise.all([
    supabase.from('materias').select('id, nome'),
    supabase.from('subtopicos').select('id, nome, materia_id'),
  ])

  function resolveMateria(nome: string): string | null {
    const norm = nome.toLowerCase().trim()
    return materias?.find(m => m.nome.toLowerCase().includes(norm) || norm.includes(m.nome.toLowerCase()))?.id ?? null
  }

  function resolveSubtopico(nome: string, materiaId: string | null): string | null {
    const norm = nome.toLowerCase().trim()
    return (
      subtopicos?.find(
        s => (materiaId ? s.materia_id === materiaId : true) &&
          (s.nome.toLowerCase().includes(norm) || norm.includes(s.nome.toLowerCase()))
      )?.id ?? null
    )
  }

  // ── Inserir questões + alternativas + vídeos ───────────────
  const createdIds: string[] = []

  for (const q of questoes) {
    const materiaId = resolveMateria(q.subject)
    const subtopico_id = resolveSubtopico(q.subtopic, materiaId)

    // Processar elemento visual
    let imagem_tipo: 'crop' | 'reconstruida' | null = null
    let imagem_url: string | null = null
    let imagem_svg: string | null = null
    let tem_imagem = false

    if (q.visualElement.type === 'reconstruct' && q.visualElement.svgContent) {
      imagem_tipo = 'reconstruida'
      imagem_svg = q.visualElement.svgContent
      tem_imagem = true
    } else if (q.visualElement.type === 'crop') {
      imagem_tipo = 'crop'
      tem_imagem = true
      if (q.visualElement.imageUrl && q.visualElement.imageUrl !== 'skipped') {
        // Imagem já recortada e uploadada pelo process-exam → persiste a URL
        imagem_url = q.visualElement.imageUrl
        imagem_svg = null
      } else {
        // Crop falhou ou foi pulado → salvar descrição para adição manual
        imagem_svg = `[CROP_DESCRIPTION]: ${q.visualElement.description}`
      }
    }

    // Inserir questão
    const { data: questao, error: questaoErr } = await supabase
      .from('questoes')
      .insert({
        prova_id: provaId,
        materia_id: materiaId,
        subtopico_id,
        instituicao_id: instituicaoId,
        ano,
        numero_questao: q.questionNumber,
        enunciado: q.enunciado,
        dificuldade: q.difficulty,
        tem_imagem,
        imagem_tipo,
        imagem_url,
        imagem_svg,
        anulada: q.gabarito === 'anulada',
        gabarito: (!q.gabarito || q.gabarito === 'anulada')
          ? null
          : (q.gabarito as 'a' | 'b' | 'c' | 'd' | 'e'),
      })
      .select('id')
      .single()

    if (questaoErr || !questao) {
      console.error('[confirm-import] Questao insert error:', questaoErr)
      continue
    }

    createdIds.push(questao.id)

    // Inserir alternativas
    if (q.alternatives.length > 0) {
      const alts = q.alternatives.map((alt, idx) => ({
        questao_id: questao.id,
        letra: alt.letra,
        texto: alt.texto,
        ordem: idx + 1,
      }))
      await supabase.from('alternativas').insert(alts)
    }

    // Buscar vídeo YouTube (se solicitado)
    if (q.searchVideo) {
      const { data: inst } = await supabase
        .from('instituicoes').select('sigla, nome').eq('id', instituicaoId).single()
      const instName = inst?.sigla ?? inst?.nome ?? ''
      const video = await searchCorrectionVideo(q.enunciado, instName, ano, q.questionNumber)

      if (video) {
        await supabase.from('videos_yt').insert({
          questao_id: questao.id,
          youtube_url: `https://www.youtube.com/watch?v=${video.videoId}`,
          titulo: video.title,
          professor: video.channelTitle,
          validado: false,
        })
      }
    }
  }

  // ── Marcar prova como concluída ────────────────────────────
  await supabase.from('provas').update({ status: 'concluido' }).eq('id', provaId)

  return NextResponse.json({
    success: true,
    importedCount: createdIds.length,
    questaoIds: createdIds,
  })
}
