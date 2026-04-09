'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DIFFICULTY_CONFIG, type Difficulty } from '@/lib/difficulty/calculator'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  FileText,
  Download,
  Trash2,
  Eye,
  GraduationCap,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type SimuladoRow = {
  id: string
  titulo: string
  description: string | null
  status: string
  created_at: string
  updated_at: string | null
  _questoesCount?: number
}

export default function SimuladosPage() {
  const [simulados, setSimulados] = useState<SimuladoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const supabase = createClient()

      const { data: sims } = await supabase
        .from('simulados')
        .select('*')
        .order('created_at', { ascending: false })

      if (!sims) { setIsLoading(false); return }

      // Contar questões por simulado
      const withCounts = await Promise.all(
        sims.map(async (s: any) => {
          const { count } = await supabase
            .from('simulado_questoes')
            .select('*', { count: 'exact', head: true })
            .eq('simulado_id', s.id)
          return { ...s, _questoesCount: count ?? 0 }
        })
      )

      setSimulados(withCounts)
      setIsLoading(false)
    }

    load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Excluir este simulado?')) return
    const supabase = createClient()
    await supabase.from('simulados').delete().eq('id', id)
    setSimulados(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10" style={{ zoom: 0.82 }}>

        {/* Voltar */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft size={14} />
            Voltar ao início
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-[var(--font-bebas)] text-5xl md:text-6xl tracking-tight text-foreground">
              Simulados
            </h1>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Seus simulados montados e exportados.
            </p>
          </div>
          <Link href="/simulados/novo">
            <Button className="bg-accent text-white hover:bg-accent/80 transition-all duration-300 rounded-md font-semibold text-xs py-5 px-6 gap-2">
              <Plus size={14} />
              Novo simulado
            </Button>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : simulados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <GraduationCap size={48} className="text-foreground/10" />
            <p className="font-mono text-sm text-muted-foreground">Nenhum simulado criado ainda</p>
            <Link href="/simulados/novo">
              <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-black transition-all text-xs font-semibold gap-2">
                <Plus size={12} />
                Criar primeiro simulado
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {simulados.map(sim => (
              <SimuladoCard
                key={sim.id}
                simulado={sim}
                onDelete={() => handleDelete(sim.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SimuladoCard({
  simulado,
  onDelete,
}: {
  simulado: SimuladoRow
  onDelete: () => void
}) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Rascunho', color: 'text-yellow-400' },
    ready:     { label: 'Pronto',   color: 'text-green-400'  },
    exported:  { label: 'Exportado', color: 'text-accent'    },
  }
  const status = statusConfig[simulado.status] ?? { label: simulado.status, color: 'text-muted-foreground' }
  const date = new Date(simulado.created_at).toLocaleDateString('pt-BR')

  return (
    <div className="rounded-[12px] border border-border bg-card p-6
                    hover:border-accent/40 transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-accent shrink-0" />
            <h3 className="text-base font-bold text-foreground truncate">{simulado.titulo}</h3>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[10px] text-muted-foreground">
              {simulado._questoesCount} questão{simulado._questoesCount !== 1 ? 'ões' : ''}
            </span>
            <span className="text-foreground/10">·</span>
            <span className="font-mono text-[10px] text-muted-foreground">{date}</span>
            <span className="text-foreground/10">·</span>
            <span className={cn('font-mono text-[10px] font-bold', status.color)}>
              {status.label}
            </span>
          </div>
          {simulado.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{simulado.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportButton simuladoId={simulado.id} title={simulado.titulo} />
          <button
            onClick={onDelete}
            className="flex items-center justify-center w-8 h-8 rounded-lg
                       border border-border text-muted-foreground
                       hover:border-red-500/40 hover:text-red-400 transition-all"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportButton({ simuladoId, title }: { simuladoId: string; title: string }) {
  const [loading, setLoading] = useState(false)
  const [withGabarito, setWithGabarito] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const supabase = createClient()

      // Buscar questões do simulado
      const { data: sqRows } = await supabase
        .from('simulado_questoes')
        .select('questao_id, ordem')
        .eq('simulado_id', simuladoId)
        .order('ordem')

      if (!sqRows?.length) { alert('Simulado sem questões'); return }

      const questaoIds = sqRows.map((r: any) => r.questao_id)
      const { data: questoes } = await supabase
        .from('questoes')
        .select('*, materia:materias(nome), subtopico:subtopicos(nome), instituicao:instituicoes(sigla,nome), alternativas(*)')
        .in('id', questaoIds)

      const questoesOrdenadas = sqRows.map((r: any) =>
        (questoes as any[])?.find((q: any) => q.id === r.questao_id)
      ).filter(Boolean)

      const simuladoPayload = {
        title,
        questions: questoesOrdenadas.map((q: any, i: number) => ({
          questionNumber: i + 1,
          statement: q.enunciado,
          alternatives: [...(q.alternativas ?? [])]
            .sort((a: any, b: any) => a.ordem - b.ordem)
            .map((a: any) => ({ letra: a.letra, texto: a.texto })),
          answer: q.gabarito,
          subject: q.materia?.nome,
          difficulty: q.dificuldade,
          year: q.ano,
          institution: q.instituicao?.sigla ?? q.instituicao?.nome,
          visualElement: q.imagem_tipo === 'reconstruida' && q.imagem_svg
            ? { type: 'svg', svgContent: q.imagem_svg }
            : q.imagem_url
              ? { type: 'crop', imageUrl: q.imagem_url, description: '' }
              : null,
          anulada: (q as any).anulada ?? false,
        })),
      }

      const res = await fetch('/api/simulado/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulado: simuladoPayload, includeGabarito: withGabarito }),
      })

      if (!res.ok) { alert('Erro ao exportar PDF'); return }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={withGabarito}
          onChange={e => setWithGabarito(e.target.checked)}
          className="w-3 h-3 accent-[var(--accent)]"
        />
        <span className="font-mono text-[10px] text-muted-foreground">Gabarito</span>
      </label>
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                   border border-accent/40 text-accent hover:bg-accent/10 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        PDF
      </button>
    </div>
  )
}
