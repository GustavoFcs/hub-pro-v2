'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSimuladoStore, type SimuladoQuestion } from '@/lib/simulado/store'
import { DIFFICULTY_CONFIG, type Difficulty } from '@/lib/difficulty/calculator'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  GripVertical,
  X,
  Save,
  Download,
  GraduationCap,
  Loader2,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SimuladoNovoPage() {
  const router = useRouter()
  const questions  = useSimuladoStore(s => s.questions)
  const title      = useSimuladoStore(s => s.title)
  const setTitle   = useSimuladoStore(s => s.setTitle)
  const reorder    = useSimuladoStore(s => s.reorder)
  const removeQ    = useSimuladoStore(s => s.removeQuestion)
  const clearList  = useSimuladoStore(s => s.clearList)

  const [saving, setSaving]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const [withGabarito, setWithGabarito] = useState(false)

  // Folder support
  const [folders, setFolders]   = useState<{ id: string; nome: string }[]>([])
  const [folderId, setFolderId] = useState<string>('')

  useEffect(() => {
    fetch('/api/simulado/folders')
      .then(r => r.ok ? r.json() : [])
      .then(setFolders)
      .catch(() => {})
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx = questions.findIndex(q => q.id === active.id)
    const toIdx   = questions.findIndex(q => q.id === over.id)
    if (fromIdx !== -1 && toIdx !== -1) reorder(fromIdx, toIdx)
  }

  // Distribuição por dificuldade
  const diffDist = questions.reduce<Record<string, number>>((acc, q) => {
    const k = q.difficulty ?? 'medio'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  // Distribuição por assunto
  const subjectDist = questions.reduce<Record<string, number>>((acc, q) => {
    const k = q.subject ?? q.topic ?? '—'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  async function handleSave() {
    if (!questions.length) return
    setSaving(true)
    try {
      const res = await fetch('/api/simulado/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          questionIds: questions.map(q => q.id),
          folderId: folderId || undefined,
        }),
      })
      if (res.ok) {
        clearList()
        router.push('/simulados')
      } else {
        const err = await res.json()
        alert(err.error ?? 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (!questions.length) return
    setExporting(true)
    try {
      const simuladoPayload = {
        title,
        questions: questions.map((q, i) => ({
          questionNumber: i + 1,
          statement: q.text,
          alternatives: q.alternatives.map(a => ({ letra: a.id, texto: a.text })),
          answer: undefined,
          subject: q.subject ?? q.topic,
          difficulty: q.difficulty,
          year: q.year,
          institution: q.institution,
          visualElement: q.visualElement ?? null,
        })),
      }

      const res = await fetch('/api/simulado/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulado: simuladoPayload, includeGabarito: withGabarito }),
      })

      if (!res.ok) { alert('Erro ao exportar PDF'); return }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10">

        {/* Voltar */}
        <div className="mb-6">
          <Link
            href="/simulados"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft size={14} />
            Meus simulados
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-transparent text-4xl md:text-5xl font-[var(--font-bebas)] tracking-tight
                       text-foreground outline-none border-b border-transparent
                       hover:border-white/10 focus:border-accent transition-colors
                       w-full sm:max-w-[500px]"
            placeholder="Nome do simulado"
          />
          {folders.length > 0 && (
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="self-start text-xs bg-[#111] border border-white/10 rounded-lg px-3 py-2
                         text-muted-foreground focus:outline-none focus:border-accent/50
                         font-mono hover:border-accent/30 transition-colors"
            >
              <option value="">Sem pasta</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={withGabarito}
                onChange={e => setWithGabarito(e.target.checked)}
                className="w-3.5 h-3.5 accent-[var(--accent)]"
              />
              <span className="font-mono text-[11px] text-muted-foreground">Com gabarito</span>
            </label>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting || !questions.length}
              className="border-white/10 text-muted-foreground hover:border-accent hover:text-accent
                         transition-all text-xs font-semibold gap-2 disabled:opacity-40"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Exportar PDF
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !questions.length}
              className="bg-accent text-white hover:bg-accent/80 transition-all text-xs font-semibold gap-2 disabled:opacity-40"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <GraduationCap size={48} className="text-white/10" />
            <p className="font-mono text-sm text-muted-foreground">
              Nenhuma questão adicionada ainda
            </p>
            <Link href="/banco-questoes">
              <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-black transition-all text-xs font-semibold">
                Ir ao banco de questões
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
            {/* Lista de questões */}
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                {questions.length} questão{questions.length !== 1 ? 'ões' : ''} — arraste para reordenar
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {questions.map((q, idx) => (
                    <SortableQuestionRow
                      key={q.id}
                      question={q}
                      index={idx}
                      onRemove={() => removeQ(q.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Sidebar de estatísticas */}
            <div className="flex flex-col gap-4">
              {/* Total */}
              <div className="rounded-[12px] border border-white/10 bg-[#111] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Total
                </p>
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-accent" />
                  <span className="text-2xl font-bold text-white">{questions.length}</span>
                  <span className="text-sm text-muted-foreground">questões</span>
                </div>
              </div>

              {/* Por dificuldade */}
              <div className="rounded-[12px] border border-white/10 bg-[#111] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Por dificuldade
                </p>
                <div className="flex flex-col gap-2">
                  {Object.entries(diffDist).map(([key, count]) => {
                    const cfg = DIFFICULTY_CONFIG[key as Difficulty]
                    const pct = Math.round((count / questions.length) * 100)
                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className={cn('font-mono text-[10px]', cfg?.color ?? 'text-muted-foreground')}>
                            {cfg?.label ?? key}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5">
                          <div
                            className={cn('h-full rounded-full', cfg?.bg?.replace('/10', '/60') ?? 'bg-white/20')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Por assunto */}
              <div className="rounded-[12px] border border-white/10 bg-[#111] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Por assunto
                </p>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(subjectDist)
                    .sort((a, b) => b[1] - a[1])
                    .map(([subj, count]) => (
                      <div key={subj} className="flex justify-between items-center">
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {subj}
                        </span>
                        <span className="font-mono text-[10px] text-accent font-bold ml-2">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SortableQuestionRow({
  question,
  index,
  onRemove,
}: {
  question: SimuladoQuestion
  index: number
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const diffKey = question.difficulty?.toLowerCase() as Difficulty
  const diffCfg = DIFFICULTY_CONFIG[diffKey]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-[10px] border border-white/10 bg-[#111]
                 p-4 hover:border-accent/30 transition-all group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-white/20
                   hover:text-white/50 transition-colors"
        tabIndex={-1}
      >
        <GripVertical size={16} />
      </button>

      {/* Número */}
      <span className="shrink-0 w-6 text-center font-mono text-[11px] text-muted-foreground/60 mt-0.5">
        {index + 1}
      </span>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {question.year > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-muted-foreground border border-white/10">
              {question.year}
            </span>
          )}
          {question.institution && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/5 text-muted-foreground border border-white/10">
              {question.institution}
            </span>
          )}
          {(question.subject ?? question.topic) && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-accent/10 text-accent border border-accent/20">
              {question.subject ?? question.topic}
            </span>
          )}
          {question.difficulty && (
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-mono border border-current/20',
              diffCfg?.bg ?? 'bg-white/5',
              diffCfg?.color ?? 'text-muted-foreground',
            )}>
              {diffCfg?.label ?? question.difficulty}
            </span>
          )}
        </div>
        <p className="text-sm text-[#CCCCCC] leading-relaxed line-clamp-2">
          {question.text}
        </p>
      </div>

      {/* Remover */}
      <button
        onClick={onRemove}
        className="shrink-0 mt-0.5 text-white/20 hover:text-red-400 transition-colors"
        title="Remover"
      >
        <X size={14} />
      </button>
    </div>
  )
}
