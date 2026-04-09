'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QuestionCard } from '@/components/QuestionCard'
import { useSavedQuestions } from '@/hooks/useSavedQuestions'
import { ArrowLeft, Bookmark, Loader2 } from 'lucide-react'
import type { QuestaoCompleta } from '@/lib/supabase/types'

function mapQuestao(q: QuestaoCompleta) {
  let visualElement: { type: string; imageUrl?: string | null; svgContent?: string | null; description?: string } | null = null
  if (q.imagem_tipo === 'reconstruida' && q.imagem_svg) {
    visualElement = { type: 'svg', svgContent: q.imagem_svg }
  } else if (q.imagem_tipo === 'crop') {
    visualElement = { type: 'crop', imageUrl: q.imagem_url ?? null }
  }

  return {
    id: q.id,
    topic: q.materia?.nome ?? '—',
    subtopic: q.subtopico?.nome ?? '—',
    subject: q.materia?.nome,
    institution: q.instituicao?.sigla ?? q.instituicao?.nome,
    difficulty: q.dificuldade,
    year: q.ano ?? 0,
    text: q.enunciado,
    alternatives: [...q.alternativas]
      .sort((a, b) => a.ordem - b.ordem)
      .map(a => ({ id: a.letra, text: a.texto })),
    visualElement,
    videoUrl: q.videos?.[0]?.youtube_url ?? null,
    videoTitulo: q.videos?.[0]?.titulo ?? null,
    videoProfessor: q.videos?.[0]?.professor ?? null,
    gabarito: q.gabarito ?? null,
    anulada: q.anulada,
    frentes: q.frentes ?? [],
    dificuldade: q.dificuldade,
    tempo_estimado_segundos: q.tempo_estimado_segundos ?? null,
  }
}

export default function SalvosPage() {
  const router = useRouter()
  const { savedIds, isSaved, toggle, loading: savedLoading } = useSavedQuestions()
  const [questions, setQuestions] = useState<ReturnType<typeof mapQuestao>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (savedLoading) return
    const ids = Array.from(savedIds)
    if (ids.length === 0) { setQuestions([]); setLoading(false); return }

    const supabase = createClient()
    supabase
      .from('questoes')
      .select(`
        *,
        materia:materias(*),
        subtopico:subtopicos(*),
        instituicao:instituicoes(*),
        alternativas(*),
        videos:videos_yt(*)
      `)
      .in('id', ids)
      .then(({ data, error }) => {
        if (error) console.error('[Salvos]', error)
        setQuestions(
          ((data as unknown as QuestaoCompleta[]) ?? []).map(mapQuestao)
        )
        setLoading(false)
      })
  }, [savedIds, savedLoading])

  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 md:px-10" style={{ zoom: 0.82 }}>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/minha-lista"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft size={14} />
            Voltar
          </Link>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Bookmark size={18} className="text-accent" />
          Questões Salvas
        </h1>
        <p className="text-xs text-muted-foreground font-mono mb-8">
          {questions.length} questões salvas
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <Bookmark size={36} className="text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground font-mono">Nenhuma questão salva.</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              questionIndex={idx + 1}
              isSaved={isSaved(q.id)}
              onToggleSave={toggle}
            />
          ))
        )}
      </div>
    </div>
  )
}
