'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MathText } from '@/components/ui/MathText'
import { DIFFICULTY_CONFIG, type Difficulty } from '@/lib/difficulty/calculator'
import {
  ArrowLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PlayCircle,
  Check,
  X,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────
type Alternative = { id: string; letra: string; texto: string; ordem: number }

type Question = {
  id: string
  enunciado: string
  dificuldade: string
  ano: number | null
  imagem_url: string | null
  imagem_tipo: string | null
  imagem_svg: string | null
  anulada: boolean | null
  materia: { nome: string } | null
  subtopico: { nome: string } | null
  instituicao: { sigla: string | null; nome: string } | null
  alternativas: Alternative[]
  videos: { youtube_url: string; titulo: string | null }[]
}

type SimuladoData = {
  id: string
  titulo: string
  status: string
  questions: Question[]
}

type ResponseState = {
  resposta: string | null
  pulada: boolean
  correta: boolean | null
  gabarito: string | null
}

type AttemptData = {
  id: string
  status: string
  simulado_responses?: Array<{
    questao_id: string
    resposta: string | null
    pulada: boolean
    correta: boolean | null
  }>
}

// ── QuestionItem ──────────────────────────────────────────────
function QuestionItem({
  question,
  index,
  attemptId,
  response,
  onAnswer,
  onSkip,
  simuladoId,
}: {
  question: Question
  index: number
  attemptId: string
  response?: ResponseState
  onAnswer: (questaoId: string, letra: string) => Promise<void>
  onSkip:   (questaoId: string) => Promise<void>
  simuladoId: string
}) {
  const [answering, setAnswering] = useState(false)

  const inst    = question.instituicao?.sigla ?? question.instituicao?.nome
  const diffKey = question.dificuldade as Difficulty
  const diffCfg = DIFFICULTY_CONFIG[diffKey]

  const sortedAlts = [...(question.alternativas ?? [])].sort((a, b) => a.ordem - b.ordem)

  async function handleAnswer(letra: string) {
    if (response || answering) return
    setAnswering(true)
    try {
      await onAnswer(question.id, letra)
    } finally {
      setAnswering(false)
    }
  }

  function altStyle(letra: string) {
    if (!response) return 'border-border hover:border-accent/40 hover:bg-accent/5 cursor-pointer'
    if (response.pulada) return 'border-border opacity-50'

    const isSelected = response.resposta === letra
    const isGabarito = response.gabarito === letra

    if (isGabarito) return 'border-green-500/60 bg-green-500/10 text-green-300'
    if (isSelected && !response.correta) return 'border-red-500/60 bg-red-500/10 text-red-300'
    return 'border-border opacity-40'
  }

  return (
    <div className="p-5 rounded-[12px] border border-border bg-card mb-4">
      {/* Number + tags */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-mono text-[11px] text-accent font-bold">
          Q{index + 1}
        </span>
        {inst && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-muted/40 text-muted-foreground border border-border">
            {inst}
          </span>
        )}
        {question.ano && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted/40 text-muted-foreground border border-border">
            {question.ano}
          </span>
        )}
        {question.materia && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent border border-accent/20">
            {question.materia.nome}
          </span>
        )}
        {diffCfg && (
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono opacity-0 pointer-events-none select-none', diffCfg.bg, diffCfg.color)}>
            {diffCfg.label}
          </span>
        )}
        {/* Estado da resposta */}
        {response?.pulada && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 ml-auto">
            Pulada
          </span>
        )}
        {response && !response.pulada && (
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono ml-auto', response.correta ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20')}>
            {response.correta ? '✓ Correta' : '✗ Errada'}
          </span>
        )}
      </div>

      {/* Enunciado */}
      <div className="question-font mb-4 text-sm leading-relaxed text-foreground">
        <MathText text={question.enunciado} />
      </div>

      {/* Imagem */}
      {question.imagem_tipo === 'crop' && question.imagem_url && question.imagem_url !== 'skipped' && (
        <div className="my-3 rounded-lg border border-border">
          <img
            src={question.imagem_url}
            alt="Figura da questão"
            className="w-full object-contain bg-white"
          />
        </div>
      )}
      {question.imagem_tipo === 'reconstruida' && question.imagem_svg && (
        <div className="my-3">
          <div
            className="rounded-lg border border-border bg-white p-4 flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: question.imagem_svg }}
          />
          <p className="mt-1 text-[10px] text-muted-foreground font-mono italic">
            Imagem reconstruída a partir de referência
            {(question.instituicao?.sigla ?? question.instituicao?.nome) ? ` da ${question.instituicao?.sigla ?? question.instituicao?.nome}` : ''}
            {question.ano ? `, ${question.ano}` : ''}
          </p>
        </div>
      )}

      {/* Alternativas */}
      <div className="flex flex-col gap-2 mb-4">
        {sortedAlts.map(alt => (
          <button
            key={alt.id}
            disabled={!!response || answering}
            onClick={() => handleAnswer(alt.letra)}
            className={cn(
              'flex gap-3 text-sm py-2.5 px-3 rounded-lg border transition-all text-left',
              altStyle(alt.letra)
            )}
          >
            <span className="font-mono text-accent shrink-0 font-bold">{alt.letra.toUpperCase()})</span>
            <span className="question-font"><MathText text={alt.texto} /></span>
            {response?.gabarito === alt.letra && (
              <Check size={14} className="text-green-400 ml-auto shrink-0 self-center" />
            )}
            {response?.resposta === alt.letra && !response.correta && (
              <X size={14} className="text-red-400 ml-auto shrink-0 self-center" />
            )}
          </button>
        ))}
      </div>

      {/* Link YouTube */}
      {question.videos?.[0]?.youtube_url && (
        <a
          href={question.videos[0].youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors font-mono"
        >
          <PlayCircle size={12} /> Ver resolução
        </a>
      )}

      {response?.pulada && (
        <p className="text-xs text-muted-foreground font-mono">
          Gabarito: <span className="text-yellow-400 font-bold uppercase">{response.gabarito ?? '—'}</span>
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function SimuladoResolvePage() {
  const params     = useParams<{ id: string }>()
  const simuladoId = params.id

  const [simulado,  setSimulado]  = useState<SimuladoData | null>(null)
  const [attempt,   setAttempt]   = useState<AttemptData | null>(null)
  const [responses, setResponses] = useState<Record<string, ResponseState>>({})
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  // Pagination / filter
  const [page,    setPage]    = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [filter,  setFilter]  = useState<'all' | 'correct' | 'wrong' | 'skipped' | 'unanswered'>('all')

  // ── Load ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch simulado + attempt in parallel
      const [sRes, aRes] = await Promise.all([
        fetch(`/api/simulado/${simuladoId}`),
        fetch(`/api/simulado/${simuladoId}/attempt`),
      ])

      const simData  = await sRes.json()
      const attData  = await aRes.json()

      setSimulado(simData)
      setAttempt(attData)

      // Build responses map
      if (attData?.simulado_responses) {
        const map: Record<string, ResponseState> = {}
        for (const r of attData.simulado_responses) {
          map[r.questao_id] = {
            resposta: r.resposta,
            pulada:   r.pulada,
            correta:  r.correta,
            gabarito: null, // gabarito revealed via respond endpoint only
          }
        }
        setResponses(map)
      }
    } finally {
      setLoading(false)
    }
  }, [simuladoId])

  // Create attempt on mount
  useEffect(() => {
    ;(async () => {
      await fetch(`/api/simulado/${simuladoId}/attempt`, { method: 'POST' })
      await load()
    })()
  }, [simuladoId, load])

  // ── Answer handler ───────────────────────────────────────────
  async function handleAnswer(questaoId: string, letra: string) {
    if (!attempt?.id) return

    const res = await fetch(`/api/simulado/${simuladoId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: attempt.id, questaoId, resposta: letra }),
    })
    const { correta, gabarito } = await res.json()

    setResponses(prev => ({
      ...prev,
      [questaoId]: { resposta: letra, pulada: false, correta, gabarito },
    }))
  }

  // ── Skip handler ─────────────────────────────────────────────
  async function handleSkip(questaoId: string) {
    if (!attempt?.id) return

    const res = await fetch(`/api/simulado/${simuladoId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: attempt.id, questaoId, pulada: true }),
    })
    const { gabarito } = await res.json()

    setResponses(prev => ({
      ...prev,
      [questaoId]: { resposta: null, pulada: true, correta: null, gabarito },
    }))
  }

  // ── Export ───────────────────────────────────────────────────
  async function exportPDF(withGabarito: boolean) {
    if (!simulado) return
    setExporting(true)
    try {
      const payload = {
        title: simulado.titulo,
        questions: simulado.questions.map((q, i) => ({
          questionNumber: i + 1,
          statement:    q.enunciado,
          alternatives: (q.alternativas ?? []).map(a => ({ letra: a.letra, texto: a.texto })),
          answer:       withGabarito ? responses[q.id]?.gabarito : undefined,
          anulada:      q.anulada,
          difficulty:   q.dificuldade,
          year:         q.ano,
          institution:  q.instituicao?.sigla ?? q.instituicao?.nome,
          visualElement: q.imagem_tipo === 'reconstruida' && q.imagem_svg
            ? { type: 'svg', svgContent: q.imagem_svg }
            : (q.imagem_tipo === 'crop' && q.imagem_url)
              ? { type: 'crop', imageUrl: q.imagem_url }
              : null,
        })),
      }
      const res = await fetch('/api/simulado/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulado: payload, includeGabarito: withGabarito }),
      })
      if (!res.ok) { alert('Erro ao exportar'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${simulado.titulo}.pdf` })
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  // ── Stats ────────────────────────────────────────────────────
  const allQuestions = simulado?.questions ?? []
  const answered = allQuestions.filter(q => responses[q.id])
  const correct  = answered.filter(q => responses[q.id]?.correta === true)
  const wrong    = answered.filter(q => responses[q.id]?.correta === false && !responses[q.id]?.pulada)
  const skipped  = answered.filter(q => responses[q.id]?.pulada)
  const total    = allQuestions.length

  const pct          = total > 0 ? Math.round((correct.length / total) * 100) : 0
  const correctPct   = total > 0 ? Math.round((correct.length / total) * 100) : 0
  const wrongPct     = total > 0 ? Math.round((wrong.length / total) * 100) : 0

  // ── Filtered questions ───────────────────────────────────────
  const filteredQs = allQuestions.filter(q => {
    const r = responses[q.id]
    if (filter === 'correct')    return r?.correta === true
    if (filter === 'wrong')      return r?.correta === false && !r.pulada
    if (filter === 'skipped')    return r?.pulada === true
    if (filter === 'unanswered') return !r
    return true
  })

  const totalPages = Math.ceil(filteredQs.length / perPage)
  const pagedQs    = filteredQs.slice((page - 1) * perPage, page * perPage)

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    )
  }

  if (!simulado) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <GraduationCap size={48} className="text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-mono">Simulado não encontrado.</p>
        <Link href="/minha-lista">
          <Button variant="outline" className="border-border text-muted-foreground hover:border-accent hover:text-accent text-xs">
            Voltar
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-full max-w-[900px] px-6 py-8 md:px-10">

        {/* Voltar */}
        <Link
          href="/minha-lista"
          className="inline-flex items-center gap-2 mb-6 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft size={14} /> Minha Lista
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-[var(--font-bebas)] tracking-tight text-foreground">
              {simulado.titulo}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {total} questão{total !== 1 ? 'ões' : ''}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              onClick={() => exportPDF(false)}
              disabled={exporting}
              className="border-border text-muted-foreground hover:border-accent hover:text-accent text-xs gap-2"
            >
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              PDF sem gabarito
            </Button>
            <Button
              variant="outline"
              onClick={() => exportPDF(true)}
              disabled={exporting}
              className="border-border text-muted-foreground hover:border-accent hover:text-accent text-xs gap-2"
            >
              <Download size={12} />
              PDF com gabarito
            </Button>
          </div>
        </div>

        {/* Filtros + paginação */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="text-[11px] text-muted-foreground font-mono">
            Pág. {page}/{Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>

          <select
            value={filter}
            onChange={e => { setFilter(e.target.value as typeof filter); setPage(1) }}
            className="text-[11px] bg-card border border-border rounded px-2 py-1
                       text-muted-foreground focus:outline-none focus:border-accent/50 font-mono"
          >
            <option value="all">Todas ({total})</option>
            <option value="correct">Corretas ({correct.length})</option>
            <option value="wrong">Erradas ({wrong.length})</option>
            <option value="skipped">Puladas ({skipped.length})</option>
            <option value="unanswered">Não respondidas ({total - answered.length})</option>
          </select>

          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
            className="text-[11px] bg-card border border-border rounded px-2 py-1
                       text-muted-foreground focus:outline-none focus:border-accent/50 font-mono"
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
          </select>
        </div>

        {/* Lista de questões */}
        {pagedQs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <GraduationCap size={36} className="text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground font-mono">Nenhuma questão neste filtro.</p>
          </div>
        ) : (
          pagedQs.map((q, idx) => (
            <QuestionItem
              key={q.id}
              question={q}
              index={(page - 1) * perPage + idx}
              attemptId={attempt?.id ?? ''}
              response={responses[q.id]}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              simuladoId={simuladoId}
            />
          ))
        )}

        {/* Paginação inferior */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'w-8 h-8 rounded text-xs font-mono transition-colors',
                  p === page
                    ? 'bg-accent text-black font-bold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
