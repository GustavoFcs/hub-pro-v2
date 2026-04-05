"use client"

import { useState, useMemo } from "react"
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
} from "lucide-react"

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

/* ── Filter items with optional sub-items ───────────────── */
type FilterNode = { label: string; children?: string[] }

const FILTER_ITEMS: Record<TabId, FilterNode[]> = {
  materia: [
    { label: "Matemática", children: ["Funções", "Progressões", "Geometria", "Trigonometria", "Álgebra Linear"] },
    { label: "Física", children: ["Cinemática", "Dinâmica", "Termodinâmica", "Óptica", "Eletromagnetismo"] },
    { label: "Química", children: ["Estequiometria", "Físico-Química", "Orgânica", "Inorgânica"] },
    { label: "Português", children: ["Interpretação", "Gramática", "Redação", "Literatura"] },
    { label: "Inglês", children: ["Reading", "Grammar", "Vocabulary"] },
  ],
  instituicao: [
    { label: "ENEM" },
    { label: "FUVEST" },
    { label: "UNICAMP" },
    { label: "UERJ" },
    { label: "UFRJ" },
  ],
  ano: [
    { label: "2024" },
    { label: "2023" },
    { label: "2022" },
    { label: "2021" },
    { label: "2020" },
  ],
  dificuldade: [
    { label: "Fácil" },
    { label: "Médio" },
    { label: "Difícil" },
  ],
  restritos: [],
}

/* ── Mock questions ─────────────────────────────────────── */
const mockQuestions = [
  {
    id: "1",
    topic: "Matemática",
    subtopic: "Funções Quadráticas",
    difficulty: "Médio" as const,
    year: 2024,
    text: "Dada a função quadrática f(x) = x² - 4x + 3, determine o valor mínimo da função e as coordenadas do vértice da parábola.",
    alternatives: [
      { id: "a", text: "Vértice (2, -1), Valor mínimo -1" },
      { id: "b", text: "Vértice (-2, 1), Valor mínimo 1" },
      { id: "c", text: "Vértice (2, 1), Valor mínimo 1" },
      { id: "d", text: "Vértice (0, 3), Valor mínimo 3" },
    ],
  },
  {
    id: "2",
    topic: "Física",
    subtopic: "Cinemática",
    difficulty: "Fácil" as const,
    year: 2023,
    text: "Um móvel realiza um movimento retilíneo uniforme com velocidade constante de 20 m/s. Qual a distância percorrida após 10 segundos?",
    alternatives: [
      { id: "a", text: "100 metros" },
      { id: "b", text: "200 metros" },
      { id: "c", text: "300 metros" },
      { id: "d", text: "400 metros" },
    ],
  },
  {
    id: "3",
    topic: "Química",
    subtopic: "Estequiometria",
    difficulty: "Difícil" as const,
    year: 2024,
    text: "Ao reagir 10g de carbonato de cálcio com ácido clorídrico em excesso, calcule o volume de CO₂ produzido nas CNTP.",
    alternatives: [
      { id: "a", text: "2,24 L" },
      { id: "b", text: "1,12 L" },
      { id: "c", text: "3,36 L" },
      { id: "d", text: "4,48 L" },
    ],
  },
]

/* ══════════════════════════════════════════════════════════ */

export default function BancoQuestoesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("materia")
  const [query, setQuery] = useState("")
  const [restrict, setRestrict] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [restricted, setRestricted] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showQuestions, setShowQuestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

  function handleSolicitar() {
    setIsLoading(true)
    setShowQuestions(false)
    setTimeout(() => {
      setIsLoading(false)
      setShowQuestions(true)
    }, 800)
  }

  /* aggregate for dev panel */
  const devData = useMemo(() => {
    const materias: string[] = []
    const assuntos: string[] = []
    const bancas: string[] = []
    const anos: string[] = []
    const dificuldades: string[] = []

    for (const label of selectedLabels) {
      const inMateria = FILTER_ITEMS.materia.find((n) => n.label === label)
      if (inMateria) { materias.push(label); continue }
      const parentMateria = FILTER_ITEMS.materia.find((n) => n.children?.includes(label))
      if (parentMateria) { assuntos.push(label); continue }
      if (FILTER_ITEMS.instituicao.find((n) => n.label === label)) { bancas.push(label); continue }
      if (FILTER_ITEMS.ano.find((n) => n.label === label)) { anos.push(label); continue }
      if (FILTER_ITEMS.dificuldade.find((n) => n.label === label)) { dificuldades.push(label); continue }
    }

    return { materias, assuntos, bancas, anos, dificuldades, restritos: restrictedLabels }
  }, [selectedLabels, restrictedLabels])

  const allTags = [...selectedLabels, ...restrictedLabels.filter((r) => !selectedLabels.includes(r))]

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0a0a] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 md:px-10">
        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft size={14} />
            Voltar ao lar
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
        <div className="mb-6 rounded-[12px] border border-border/40 bg-[#111111] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Settings2 size={12} className="text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Painel de desenvolvedor (filtros ativos)
            </span>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {([
              { label: "Matérias", items: devData.materias, red: false },
              { label: "Bancas", items: devData.bancas, red: false },
              { label: "Anos", items: devData.anos, red: false },
              { label: "Dificuldades", items: devData.dificuldades, red: false },
              { label: "Assuntos", items: devData.assuntos, red: false },
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
          <div className="rounded-[12px] border border-border/40 bg-[#111111] overflow-hidden">
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
                      isActive ? "border-accent text-white" : "border-transparent text-muted-foreground hover:text-white",
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
                  className="h-9 border-border/40 bg-[#0a0a0a] pl-9 text-white placeholder:text-muted-foreground/50 focus-visible:border-accent"
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
                {filteredItems.length === 0 ? (
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
                              isRestricted ? "text-[#ff8080] font-medium" : isChecked ? "text-white font-medium" : "text-muted-foreground group-hover:text-white",
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
                          <div className="bg-[#0a0a0a] border-y border-border/20">
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
                                    childRestricted ? "text-[#ff8080]" : childChecked ? "text-white" : "text-muted-foreground/70 group-hover/child:text-white",
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
            <div className="rounded-[12px] border border-border/40 bg-[#111111] p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Questões encontradas</span>
              <p className="mt-1 font-[var(--font-bebas)] text-5xl tracking-tight text-foreground">{showQuestions ? mockQuestions.length : 0}</p>
            </div>

            {/* Tags */}
            <div className="flex-1 rounded-[12px] border border-border/40 bg-[#111111] p-5">
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
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
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
              onClick={() => setShowQuestions((p) => !p)}
            >
              <Eye size={14} />
              {showQuestions ? "Ocultar preview" : "Pré-visualizar lista"}
            </Button>
          </div>
        </div>

        {/* ── CTA ─────────────────────────────────────────── */}
        <div className="mt-6">
          <Button
            onClick={handleSolicitar}
            disabled={isLoading}
            className="w-full h-12 rounded-[12px] bg-accent text-white text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#E55A2B] transition-all duration-300 gap-2 shadow-[0_0_40px_rgba(229,90,43,0.12)]"
          >
            <Zap size={16} />
            {isLoading ? "Carregando..." : "Solicitar questões"}
          </Button>
        </div>

        {/* ── Loading ─────────────────────────────────────── */}
        {isLoading && (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[200px] animate-pulse rounded-[12px] border border-border/40 bg-[#111111]" />
            ))}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────── */}
        {showQuestions && !isLoading && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Resultados</span>
              <span className="font-mono text-[10px] text-muted-foreground">{mockQuestions.length} questões</span>
            </div>
            <div className="flex flex-col gap-6">
              {mockQuestions.map((q) => (
                <QuestionCard key={q.id} question={q} />
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
