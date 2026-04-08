"use client"

import React, { useState, useEffect } from 'react'
import { FileText, Check, Clock, AlertTriangle, RefreshCw, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ProvaRow {
  id: string
  titulo: string
  ano: number
  status: 'pendente' | 'processando' | 'pendente_revisao' | 'concluido' | 'erro'
  pdf_url: string | null
  created_at: string
  instituicoes: { nome: string; sigla: string | null } | null
  questoesCount: number
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.FC<{ size?: number; className?: string }>; cls: string }> = {
  pendente:          { label: 'Pendente',         icon: Clock,          cls: 'text-muted-foreground border-border bg-secondary' },
  processando:       { label: 'Processando',      icon: Loader2,        cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  pendente_revisao:  { label: 'Aguard. revisão',  icon: AlertTriangle,  cls: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  concluido:         { label: 'Concluído',        icon: Check,          cls: 'text-green-400 border-green-500/30 bg-green-500/10' },
  erro:              { label: 'Erro',             icon: AlertTriangle,  cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays}d atrás`
  return d.toLocaleDateString('pt-BR')
}

export default function GerenciarProvasPage() {
  const [provas, setProvas] = useState<ProvaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ProvaRow['status']>('all')

  async function loadProvas() {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('provas')
      .select('id, titulo, ano, status, pdf_url, created_at, instituicoes(nome, sigla)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error || !data) {
      setLoading(false)
      return
    }

    // Buscar contagens de questões por prova
    const ids = data.map(p => p.id)
    const { data: counts } = await supabase
      .from('questoes')
      .select('prova_id')
      .in('prova_id', ids)

    const countMap: Record<string, number> = {}
    for (const q of counts ?? []) {
      if (q.prova_id) countMap[q.prova_id] = (countMap[q.prova_id] ?? 0) + 1
    }

    const rows: ProvaRow[] = data.map(p => ({
      id: p.id,
      titulo: p.titulo,
      ano: p.ano,
      status: p.status as ProvaRow['status'],
      pdf_url: p.pdf_url,
      created_at: p.created_at,
      instituicoes: Array.isArray(p.instituicoes) ? p.instituicoes[0] ?? null : (p.instituicoes as unknown as ProvaRow['instituicoes']),
      questoesCount: countMap[p.id] ?? 0,
    }))

    setProvas(rows)
    setLoading(false)
  }

  useEffect(() => { loadProvas() }, [])

  const filtered = filter === 'all' ? provas : provas.filter(p => p.status === filter)

  const statusCounts = provas.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight uppercase">GERENCIAR PROVAS</h1>
          <p className="text-[#999999] text-sm font-mono tracking-widest">HISTÓRICO E STATUS DO PIPELINE DE IMPORTAÇÃO</p>
        </div>
        <Button
          onClick={loadProvas}
          variant="outline"
          className="border-[#333] text-[#999] hover:text-white gap-2 font-bold text-xs uppercase tracking-widest"
        >
          <RefreshCw size={14} /> ATUALIZAR
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'all',              label: 'Total',           count: provas.length },
          { key: 'concluido',        label: 'Concluídas',      count: statusCounts['concluido'] ?? 0 },
          { key: 'pendente_revisao', label: 'Aguard. revisão', count: statusCounts['pendente_revisao'] ?? 0 },
          { key: 'processando',      label: 'Processando',     count: statusCounts['processando'] ?? 0 },
          { key: 'erro',             label: 'Com erro',        count: statusCounts['erro'] ?? 0 },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={cn(
              'bg-card rounded-xl border p-4 text-left transition-all',
              filter === key
                ? 'border-accent/60 bg-accent/5'
                : 'border-border hover:border-border/80'
            )}
          >
            <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{count}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-0 text-[10px] font-mono text-[#555] uppercase tracking-widest border-b border-[#222] px-6 py-3">
          <span className="w-16">Ano</span>
          <span>Título / Instituição</span>
          <span className="w-28 text-center">Status</span>
          <span className="w-20 text-center">Questões</span>
          <span className="w-24 text-right">Data</span>
          <span className="w-10" />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-[#555]">
            <Loader2 size={20} className="animate-spin text-accent" />
            <span className="text-sm font-mono">Carregando provas...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText size={32} className="text-border" />
            <span className="text-sm font-mono">Nenhuma prova encontrada</span>
          </div>
        )}

        {!loading && filtered.map((prova, idx) => {
          const cfg = STATUS_CONFIG[prova.status] ?? STATUS_CONFIG['pendente']
          const Icon = cfg.icon
          const isProcessing = prova.status === 'processando'

          return (
            <div
              key={prova.id}
              className={cn(
                'grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-0 items-center px-6 py-4 transition-colors hover:bg-secondary',
                idx !== filtered.length - 1 && 'border-b border-border'
              )}
            >
              {/* Ano */}
              <span className="w-16 text-accent font-mono font-bold text-sm">{prova.ano}</span>

              {/* Título + institução */}
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{prova.titulo}</p>
                {prova.instituicoes && (
                  <p className="text-[#555] text-xs font-mono mt-0.5">
                    {prova.instituicoes.sigla ?? prova.instituicoes.nome}
                  </p>
                )}
              </div>

              {/* Status badge */}
              <div className="w-28 flex justify-center">
                <span className={cn(
                  'flex items-center gap-1.5 text-[10px] font-mono uppercase border rounded-full px-2.5 py-1',
                  cfg.cls
                )}>
                  <Icon size={10} className={isProcessing ? 'animate-spin' : ''} />
                  {cfg.label}
                </span>
              </div>

              {/* Questões */}
              <div className="w-20 text-center">
                <span className="text-white text-sm font-mono font-bold">{prova.questoesCount}</span>
              </div>

              {/* Data */}
              <div className="w-24 text-right">
                <span className="text-[#555] text-xs font-mono">{formatDate(prova.created_at)}</span>
              </div>

              {/* Link para PDF */}
              <div className="w-10 flex justify-end">
                {prova.pdf_url ? (
                  <a
                    href={prova.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#444] hover:text-accent transition-colors"
                    title="Ver PDF"
                  >
                    <ChevronRight size={16} />
                  </a>
                ) : (
                  <span className="w-4" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[#444] text-[10px] font-mono text-right">
        {filtered.length} prova{filtered.length !== 1 ? 's' : ''} • {provas.reduce((a, p) => a + p.questoesCount, 0)} questões total
      </p>
    </div>
  )
}
