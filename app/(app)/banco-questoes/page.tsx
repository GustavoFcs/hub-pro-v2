"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { QuestionCard } from "@/components/QuestionCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  ChevronRight,
  ChevronDown,
  Settings2,
  X,
  BookOpen,
  Building2,
  Calendar,
  BarChart3,
  ShieldAlert,
  Zap,
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  FolderOpen,
  Loader2,
  ListPlus,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Materia, Subtopico, Instituicao, QuestaoCompleta } from "@/lib/supabase/types"

/* ── Types ──────────────────────────────────────────────── */
type TabId = "materia" | "instituicao" | "ano" | "dificuldade" | "restritos"

/* ── Filter tabs ────────────────────────────────────────── */
const FILTER_TABS: Array<{ id: TabId; label: string; icon: typeof BookOpen }> = [
  { id: "materia", label: "Matéria", icon: BookOpen },
  { id: "instituicao", label: "Instituição", icon: Building2 },
  { id: "ano", label: "Ano", icon: Calendar },
  { id: "dificuldade", label: "Dificuldade", icon: BarChart3 },
  { id: "restritos", label: "Restritos", icon: ShieldAlert },
]

type FilterNode = { label: string; children?: string[] }

const DIFICULDADE_ITEMS: FilterNode[] = [
  { label: "Fácil" },
  { label: "Médio" },
  { label: "Difícil" },
  { label: "Muito Difícil" },
]

const DIFFICULTY_MAP: Record<string, 'facil' | 'medio' | 'dificil' | 'muito_dificil'> = {
  'Fácil': 'facil',
  'Médio': 'medio',
  'Difícil': 'dificil',
  'Muito Difícil': 'muito_dificil',
}

interface FilterData {
  materias: Array<Materia & { subtopicos: Subtopico[] }>
  instituicoes: Instituicao[]
  anos: number[]
}

/* ══════════════════════════════════════════════════════════ */

export default function BancoQuestoesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("materia")
  const [query, setQuery] = useState("")
  const [restrict, setRestrict] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [restricted, setRestricted] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showQuestions, setShowQuestions] = useState(false)
  const [isLoading, setIsLoading]         = useState(false)
  const [isFiltersLoading, setIsFiltersLoading] = useState(true)
  const [filterData, setFilterData] = useState<FilterData>({ materias: [], instituicoes: [], anos: [] })
  const [frentesPorMateria, setFrentesPorMateria] = useState<Record<string, string[]>>({})
  const [questions, setQuestions] = useState<ReturnType<typeof mapQuestao>[]>([])

  // Criar lista panel
  const [criarOpen,     setCriarOpen]     = useState(false)
  const [criarNome,     setCriarNome]     = useState('Minha lista')
  const [criarFolderId, setCriarFolderId] = useState('')
  const [folders,       setFolders]       = useState<{ id: string; nome: string }[]>([])
  const [isSaving,      setIsSaving]      = useState(false)

  // Load folders once
  useEffect(() => {
    fetch('/api/simulado/folders')
      .then(r => r.ok ? r.json() : [])
      .then(setFolders)
      .catch(() => {})
  }, [])

  function mapQuestao(q: QuestaoCompleta) {
    // Build visualElement from DB columns
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
      imagemUrl: q.imagem_url,
      imagemSvg: q.imagem_svg,
      imagemTipo: q.imagem_tipo,
      visualElement,
      videoUrl: q.videos?.[0]?.youtube_url ?? null,
      videoTitulo: q.videos?.[0]?.titulo ?? null,
      videoProfessor: q.videos?.[0]?.professor ?? null,
      gabarito: q.gabarito ?? null,
      anulada: q.anulada,
      frentes: (q as Record<string, unknown>).frentes as string[] ?? [],
      dificuldade: q.dificuldade,
      tempo_estimado_segundos: (q as Record<string, unknown>).tempo_estimado_segundos as number | null ?? null,
    }
  }

  // Derive FILTER_ITEMS from fetched data
  const FILTER_ITEMS: Record<TabId, FilterNode[]> = useMemo(() => ({
    materia: filterData.materias.map(m => ({
      label: m.nome,
      children: [
        ...m.subtopicos.map(s => s.nome),
        ...(frentesPorMateria[m.id] ?? []),
      ].filter((v, i, a) => a.indexOf(v) === i), // dedupe
    })),
    instituicao: filterData.instituicoes.map(i => ({ label: i.sigla ?? i.nome })),
    ano: filterData.anos.map(a => ({ label: String(a) })),
    dificuldade: DIFICULDADE_ITEMS,
    restritos: Object.keys(restricted)
      .filter(k => restricted[k])
      .map(nome => ({ label: nome })),
  }), [filterData, restricted, frentesPorMateria])

  // Fetch filter data on mount
  useEffect(() => {
    async function loadFilters() {
      setIsFiltersLoading(true)
      const supabase = createClient()

      const [materiasRes, subtopicosRes, instsRes, anosRes, frentesRes] = await Promise.all([
        supabase.from('materias').select('*').order('nome'),
        supabase.from('subtopicos').select('*').order('nome'),
        supabase.from('instituicoes').select('*').order('nome'),
        supabase.from('questoes').select('ano').not('ano', 'is', null),
        supabase.from('questoes').select('frentes, materia_id'),
      ])

      const materias = (materiasRes.data ?? []) as Materia[]
      const subtopicos = (subtopicosRes.data ?? []) as Subtopico[]
      const instituicoes = (instsRes.data ?? []) as Instituicao[]

      const anosSet = new Set<number>()
      ;(anosRes.data ?? []).forEach((r: { ano: number | null }) => {
        if (r.ano != null) anosSet.add(r.ano)
      })
      const anos = Array.from(anosSet).sort((a, b) => b - a)

      // Agrupar frentes por materia_id
      const fpm: Record<string, string[]> = {}
      ;(frentesRes.data ?? []).forEach((r: { frentes: string[] | null; materia_id: string | null }) => {
        if (!r.materia_id) return
        if (!fpm[r.materia_id]) fpm[r.materia_id] = []
        ;(r.frentes ?? []).forEach((f: string) => {
          if (!fpm[r.materia_id!].includes(f)) fpm[r.materia_id!].push(f)
        })
      })
      // Sort frentes alphabetically
      for (const key of Object.keys(fpm)) fpm[key].sort()
      setFrentesPorMateria(fpm)

      setFilterData({
        materias: materias.map(m => ({
          ...m,
          subtopicos: subtopicos.filter(s => s.materia_id === m.id),
        })),
        instituicoes,
        anos,
      })
      setIsFiltersLoading(false)
    }

    loadFilters()
  }, [])

  /* derived */
  const items = FILTER_ITEMS[activeTab]
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.children?.some((c) => c.toLowerCase().includes(q)),
    )
  }, [items, query])

  const selectedLabels = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k)
  const restrictedLabels = Object.entries(restricted)
    .filter(([, v]) => v)
    .map(([k]) => k)

  /* helpers */
  function toggleItem(item: string) {
    if (activeTab === 'restritos') {
      // In restritos tab, always remove the restriction
      setRestricted((p) => { const next = { ...p }; delete next[item]; return next })
      return
    }
    if (restrict) {
      setRestricted((p) => ({ ...p, [item]: !p[item] }))
    } else {
      setSelected((p) => ({ ...p, [item]: !p[item] }))
    }
  }

  function removeTag(item: string) {
    setSelected((p) => {
      const next = { ...p }
      delete next[item]
      return next
    })
    setRestricted((p) => {
      const next = { ...p }
      delete next[item]
      return next
    })
  }

  function toggleExpand(label: string) {
    setExpanded((p) => ({ ...p, [label]: !p[label] }))
  }

  async function buildAndFetchQuestions() {
    const supabase = createClient()

    // Collect selected IDs from labels
    const materiasNomes = selectedLabels.filter(l =>
      filterData.materias.some(m => m.nome === l)
    )
    const subtopicosNomes = selectedLabels.filter(l =>
      filterData.materias.some(m => m.subtopicos.some(s => s.nome === l))
    )
    const instituicoesLabels = selectedLabels.filter(l =>
      filterData.instituicoes.some(i => (i.sigla ?? i.nome) === l)
    )
    const anosLabels = selectedLabels.filter(l =>
      filterData.anos.includes(Number(l))
    )
    const dificuldadesLabels = selectedLabels.filter(l =>
      DIFICULDADE_ITEMS.some(d => d.label === l)
    )

    // Collect frentes from labels
    const allFrentesSet = new Set(Object.values(frentesPorMateria).flat())
    const frentesLabels = selectedLabels.filter(l => allFrentesSet.has(l))

    // Restricted items by type
    const restrictedSubtopicosNomes = restrictedLabels.filter(l =>
      filterData.materias.some(m => m.subtopicos.some(s => s.nome === l))
    )
    const restrictedFrentesLabels = restrictedLabels.filter(l => allFrentesSet.has(l))
    const restrictedMateriasNomes = restrictedLabels.filter(l =>
      filterData.materias.some(m => m.nome === l)
    )
    const restrictedInstituicoesLabels = restrictedLabels.filter(l =>
      filterData.instituicoes.some(i => (i.sigla ?? i.nome) === l)
    )
    const restrictedAnosLabels = restrictedLabels.filter(l =>
      filterData.anos.includes(Number(l))
    )
    const restrictedDificuldadesLabels = restrictedLabels.filter(l =>
      DIFICULDADE_ITEMS.some(d => d.label === l)
    )

    const materiaIds = filterData.materias
      .filter(m => materiasNomes.includes(m.nome))
      .map(m => m.id)

    const subtopicosAll = filterData.materias.flatMap(m => m.subtopicos)
    const subtopicosIds = subtopicosAll
      .filter(s => subtopicosNomes.includes(s.nome))
      .map(s => s.id)
    const restrictedSubtopicosIds = subtopicosAll
      .filter(s => restrictedSubtopicosNomes.includes(s.nome))
      .map(s => s.id)
    const restrictedMateriaIds = filterData.materias
      .filter(m => restrictedMateriasNomes.includes(m.nome))
      .map(m => m.id)
    const restrictedInstituicaoIds = filterData.instituicoes
      .filter(i => restrictedInstituicoesLabels.includes(i.sigla ?? i.nome))
      .map(i => i.id)
    const restrictedAnos = restrictedAnosLabels.map(Number)
    const restrictedDificuldades = restrictedDificuldadesLabels.map(l => DIFFICULTY_MAP[l])

    const instituicaoIds = filterData.instituicoes
      .filter(i => instituicoesLabels.includes(i.sigla ?? i.nome))
      .map(i => i.id)

    const anos = anosLabels.map(Number)
    const dificuldades = dificuldadesLabels.map(l => DIFFICULTY_MAP[l])

    let q = supabase
      .from('questoes')
      .select(`
        *,
        materia:materias(*),
        subtopico:subtopicos(*),
        instituicao:instituicoes(*),
        alternativas(*),
        videos:videos_yt(*)
      `)
      .limit(50)

    if (materiaIds.length > 0)             q = q.in('materia_id', materiaIds)
    if (subtopicosIds.length > 0)          q = q.in('subtopico_id', subtopicosIds)
    if (instituicaoIds.length > 0)         q = q.in('instituicao_id', instituicaoIds)
    if (anos.length > 0)                   q = q.in('ano', anos)
    if (dificuldades.length > 0)           q = q.in('dificuldade', dificuldades)
    if (frentesLabels.length > 0)          q = q.overlaps('frentes', frentesLabels)
    if (restrictedSubtopicosIds.length > 0)
      q = q.not('subtopico_id', 'in', `(${restrictedSubtopicosIds.join(',')})`)
    if (restrictedMateriaIds.length > 0)
      q = q.not('materia_id', 'in', `(${restrictedMateriaIds.join(',')})`)
    if (restrictedInstituicaoIds.length > 0)
      q = q.not('instituicao_id', 'in', `(${restrictedInstituicaoIds.join(',')})`)
    if (restrictedAnos.length > 0)
      q = q.not('ano', 'in', `(${restrictedAnos.join(',')})`)
    if (restrictedDificuldades.length > 0)
      q = q.not('dificuldade', 'in', `(${restrictedDificuldades.join(',')})`)
    for (const frente of restrictedFrentesLabels)
      q = q.not('frentes', 'cs', `{${frente}}`)
    const { data } = await q
    return ((data as unknown as QuestaoCompleta[]) ?? []).map(mapQuestao)
  }

  // Preview — loads + shows questions
  async function handlePreview() {
    setIsLoading(true)
    setShowQuestions(false)
    setCriarOpen(false)
    try {
      const mapped = await buildAndFetchQuestions()
      setQuestions(mapped)
    } catch {
      setQuestions([])
    } finally {
      setIsLoading(false)
      setShowQuestions(true)
    }
  }

  // Criar lista — loads questions and opens the create panel
  async function handleCriarLista() {
    setIsLoading(true)
    setShowQuestions(false)
    setCriarOpen(false)
    try {
      const mapped = await buildAndFetchQuestions()
      setQuestions(mapped)
      if (mapped.length > 0) {
        setCriarOpen(true)
        setShowQuestions(true)
      } else {
        setShowQuestions(true) // show empty state
      }
    } catch {
      setQuestions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Save — persists the loaded questions as a simulado
  async function handleSalvarCriar() {
    if (!criarNome.trim() || questions.length === 0) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/simulado/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       criarNome.trim(),
          questionIds: questions.map(q => q.id),
          folderId:    criarFolderId || undefined,
        }),
      })
      if (res.ok) {
        setCriarOpen(false)
        setShowQuestions(false)
        setQuestions([])
        setCriarNome('Minha lista')
        setCriarFolderId('')
        window.location.href = '/minha-lista'
      } else {
        const err = await res.json()
        alert(err.error ?? 'Erro ao salvar lista')
      }
    } finally {
      setIsSaving(false)
    }
  }

  /* aggregate for dev panel */
  const devData = useMemo(() => {
    const materias: string[] = []
    const assuntos: string[] = []
    const bancas: string[] = []
    const anos: string[] = []
    const dificuldades: string[] = []
    const frentes: string[] = []

    const allSubtopicos = filterData.materias.flatMap(m => m.subtopicos)
    const allFrentesDevSet = new Set(Object.values(frentesPorMateria).flat())

    for (const label of selectedLabels) {
      if (filterData.materias.some(m => m.nome === label)) { materias.push(label); continue }
      if (allSubtopicos.some(s => s.nome === label)) { assuntos.push(label); continue }
      if (allFrentesDevSet.has(label)) { frentes.push(label); continue }
      if (filterData.instituicoes.some(i => (i.sigla ?? i.nome) === label)) { bancas.push(label); continue }
      if (filterData.anos.includes(Number(label))) { anos.push(label); continue }
      if (DIFICULDADE_ITEMS.some(d => d.label === label)) { dificuldades.push(label); continue }
    }

    return { materias, assuntos, frentes, bancas, anos, dificuldades, restritos: restrictedLabels }
  }, [selectedLabels, restrictedLabels, filterData, frentesPorMateria])

  const allTags = [...selectedLabels, ...restrictedLabels.filter((r) => !selectedLabels.includes(r))]

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 md:px-10" style={{ zoom: 0.82 }}>
        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft size={14} />
            Voltar ao lar
          </Link>
          <Link
            href="/minha-lista"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent"
          >
            Minhas Listas
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="font-[var(--font-bebas)] text-5xl md:text-6xl tracking-tight text-foreground">
          Banco de Questões
          </h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Filtre e remova assuntos indesejados com precisão cirúrgica.
          </p>
        </div>

        {/* ── Dev panel (always visible) ──────────────────── */}
        <div className="mb-6 rounded-[12px] border border-border/40 bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Settings2 size={12} className="text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Painel de desenvolvedor (filtros ativos)
            </span>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
            {([
              { label: "Matérias", items: devData.materias, red: false },
              { label: "Bancas", items: devData.bancas, red: false },
              { label: "Anos", items: devData.anos, red: false },
              { label: "Dificuldades", items: devData.dificuldades, red: false },
              { label: "Assuntos", items: devData.assuntos, red: false },
              { label: "Frentes", items: devData.frentes, red: false },
              { label: "Restritos", items: devData.restritos, red: true },
            ]).map((col) => (
              <div key={col.label}>
                <span className={cn("font-mono text-[10px] uppercase tracking-[0.15em] font-bold", col.red ? "text-[#ff5a5a]" : "text-muted-foreground")}>
                  {col.label}
                </span>
                {col.items.length === 0 ? (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground/40 italic">Vazio</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {col.items.map((i) => (
                      <li key={i} className={cn("font-mono text-[10px]", col.red ? "text-[#ff8080]" : "text-foreground/70")}>{i}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Main grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left: filters */}
          <div className="rounded-[12px] border border-border/40 bg-card overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center border-b border-border/40 overflow-x-auto">
              {FILTER_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setQuery("") }}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors border-b-2 -mb-px",
                      isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Search + toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-b border-border/40 px-5 py-3">
              <div className="relative flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar filtros..."
                  className="h-9 border-border/40 bg-background pl-9 text-foreground placeholder:text-muted-foreground/50 focus-visible:border-accent"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Inclusão</span>
                <Switch checked={restrict} onCheckedChange={setRestrict} className="data-[state=checked]:bg-[#ff5a5a]" />
                <span className={cn("font-mono text-[10px] uppercase tracking-[0.12em]", restrict ? "text-[#ff5a5a]" : "text-muted-foreground")}>Restringir</span>
              </div>
            </div>

            {/* Item list */}
            <ScrollArea className="h-[340px]">
              <div className="divide-y divide-border/20">
                {isFiltersLoading ? (
                  <p className="px-5 py-10 text-center font-mono text-xs text-muted-foreground/50">Carregando...</p>
                ) : filteredItems.length === 0 ? (
                  <p className="px-5 py-10 text-center font-mono text-xs text-muted-foreground/50">Nenhum item encontrado.</p>
                ) : (
                  filteredItems.map((node) => {
                    const isChecked = Boolean(selected[node.label]) || Boolean(restricted[node.label])
                    const isRestricted = Boolean(restricted[node.label])
                    const isOpen = Boolean(expanded[node.label])
                    const hasChildren = node.children && node.children.length > 0

                    return (
                      <div key={node.label}>
                        {/* Parent row */}
                        <div className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/5 group">
                          <button type="button" onClick={() => toggleItem(node.label)} className="flex items-center gap-3 flex-1 text-left">
                            <span className={cn(
                              "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
                              isRestricted ? "border-[#ff5a5a] bg-[#ff5a5a]" : isChecked ? "border-accent bg-accent" : "border-border/60 group-hover:border-accent/50",
                            )}>
                              {(isChecked || isRestricted) && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                            </span>
                            <span className={cn(
                              "text-sm transition-colors",
                              isRestricted ? "text-[#ff8080] font-medium" : isChecked ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground",
                            )}>
                              {node.label}
                            </span>
                          </button>

                          {hasChildren && (
                            <button type="button" onClick={() => toggleExpand(node.label)} className="p-1 text-muted-foreground/40 hover:text-accent transition-colors">
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                        </div>

                        {/* Children tray */}
                        {hasChildren && isOpen && (
                          <div className="bg-background border-y border-border/20">
                            {node.children!.map((child) => {
                              const childChecked = Boolean(selected[child]) || Boolean(restricted[child])
                              const childRestricted = Boolean(restricted[child])
                              return (
                                <button
                                  key={child}
                                  type="button"
                                  onClick={() => toggleItem(child)}
                                  className="flex w-full items-center gap-3 pl-12 pr-5 py-2.5 text-left transition-colors hover:bg-accent/5 group/child"
                                >
                                  <span className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                                    childRestricted ? "border-[#ff5a5a] bg-[#ff5a5a]" : childChecked ? "border-accent bg-accent" : "border-border/50 group-hover/child:border-accent/50",
                                  )}>
                                    {(childChecked || childRestricted) && <span className="h-1.5 w-1.5 rounded-sm bg-black" />}
                                  </span>
                                  <span className={cn(
                                    "text-xs transition-colors",
                                    childRestricted ? "text-[#ff8080]" : childChecked ? "text-foreground" : "text-muted-foreground/70 group-hover/child:text-foreground",
                                  )}>
                                    {child}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: summary */}
          <div className="flex flex-col gap-6">
            {/* Count */}
            <div className="rounded-[12px] border border-border/40 bg-card p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Questões encontradas</span>
              <p className="mt-1 font-[var(--font-bebas)] text-5xl tracking-tight text-foreground">{showQuestions ? questions.length : 0}</p>
            </div>

            {/* Tags */}
            <div className="flex-1 rounded-[12px] border border-border/40 bg-card p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Resumo da seleção</span>

              {allTags.length === 0 ? (
                <p className="mt-3 font-mono text-[10px] text-muted-foreground/40 italic">Nenhum filtro selecionado.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {allTags.map((tag) => {
                    const isR = Boolean(restricted[tag])
                    return (
                      <span
                        key={tag}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors",
                          isR ? "border-[#ff5a5a]/50 bg-[#ff5a5a]/10 text-[#ff8080]" : "border-accent/40 bg-accent/10 text-accent",
                        )}
                      >
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-foreground transition-colors">
                          <X size={10} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Preview button */}
            <Button
              variant="outline"
              className="w-full border-border/40 text-muted-foreground hover:border-accent hover:text-accent font-mono text-[10px] uppercase tracking-[0.15em] h-10 gap-2"
              onClick={handlePreview}
              disabled={isLoading}
            >
              {showQuestions
                ? <><EyeOff size={14} /> Ocultar preview</>
                : <><Eye size={14} /> Pré-visualizar lista</>
              }
            </Button>
          </div>
        </div>

        {/* ── Criar lista panel ─────────────────────────── */}
        {criarOpen && (
          <div className="mt-6 rounded-[12px] border border-accent/40 bg-card p-5 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus size={13} className="text-accent" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Criar lista &middot; {questions.length} quest{questions.length !== 1 ? 'ões' : 'ão'}
                </span>
              </div>
              <button
                onClick={() => setCriarOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Nome */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Nome da lista
                </label>
                <input
                  autoFocus
                  value={criarNome}
                  onChange={e => setCriarNome(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSalvarCriar() }}
                  placeholder="Ex: Matemática IME 2024"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:border-accent/50
                             transition-colors font-mono"
                />
              </div>

              {/* Pasta */}
              <div className="flex flex-col gap-1.5 sm:w-52">
                <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Salvar em
                </label>
                <div className="relative">
                  <FolderOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select
                    value={criarFolderId}
                    onChange={e => setCriarFolderId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2
                               text-sm text-muted-foreground focus:outline-none focus:border-accent/50
                               transition-colors font-mono appearance-none"
                  >
                    <option value="">Sem pasta</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSalvarCriar}
                disabled={isSaving || !criarNome.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-black text-xs
                           font-mono font-bold uppercase tracking-wider hover:bg-accent/80 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar lista
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                {questions.length} quest{questions.length !== 1 ? 'ões' : 'ão'} serão salvas
              </span>
            </div>
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────── */}
        <div className="mt-6">
          <Button
            onClick={handleCriarLista}
            disabled={isLoading}
            className="w-full h-12 rounded-[12px] bg-accent text-white text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#E55A2B] transition-all duration-300 gap-2 shadow-[0_0_40px_rgba(229,90,43,0.12)]"
          >
            {isLoading
              ? <Loader2 size={16} className="animate-spin" />
              : <ListPlus size={16} />
            }
            {isLoading ? 'Carregando...' : 'Criar lista'}
          </Button>
        </div>

        {/* ── Loading ─────────────────────────────────────── */}
        {isLoading && (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[200px] animate-pulse rounded-[12px] border border-border/40 bg-card" />
            ))}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────── */}
        {showQuestions && !isLoading && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Resultados</span>
              <span className="font-mono text-[10px] text-muted-foreground">{questions.length} questões</span>
            </div>
            <div className="flex flex-col gap-6">
              {questions.map((q, idx) => (
                <QuestionCard key={q.id} question={q} questionIndex={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── Footer (minimal colophon) ───────────────────── */}
        <footer className="mt-20 border-t border-border/20 pt-10 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Plataforma</h4>
              <p className="font-mono text-xs text-foreground/70">Derelict QB</p>
            </div>
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Stack</h4>
              <p className="font-mono text-xs text-foreground/70">Next.js · Tailwind · Supabase</p>
            </div>
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Status</h4>
              <p className="font-mono text-xs text-foreground/70">Beta v2.0</p>
            </div>
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Data</h4>
              <p className="font-mono text-xs text-foreground/70">2026</p>
            </div>
          </div>
          <p className="mt-8 font-mono text-[10px] text-muted-foreground/40">
            © 2026 Derelict System. Construído para evolução contínua.
          </p>
        </footer>
      </div>
    </div>
  )
}
