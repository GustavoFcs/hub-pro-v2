'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Folder,
  FolderPlus,
  FileText,
  MoreHorizontal,
  Download,
  Trash2,
  Pencil,
  Eye,
  GraduationCap,
  Loader2,
  Check,
  X,
  FolderOpen,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  FolderInput,
  FolderMinus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useSavedQuestions } from '@/hooks/useSavedQuestions'

type Folder = {
  id: string
  nome: string
  created_at: string
}

type SimuladoItem = {
  id: string
  titulo: string
  status: 'draft' | 'ready' | 'exported'
  folder_id: string | null
  created_at: string
  simulado_questoes: { count: number }[]
}

export default function MinhaListaPage() {
  const router = useRouter()
  const supabase = createClient()
  const { savedCount } = useSavedQuestions()

  const [folders, setFolders]     = useState<Folder[]>([])
  const [simulados, setSimulados] = useState<SimuladoItem[]>([])
  const [loading, setLoading]     = useState(true)

  // Folder UI state
  const [creatingFolder, setCreatingFolder]   = useState(false)
  const [newFolderName, setNewFolderName]     = useState('')
  const [renamingId, setRenamingId]           = useState<string | null>(null)
  const [renameValue, setRenameValue]         = useState('')
  const [openFolderId, setOpenFolderId]       = useState<string | null>(null)

  // Search
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fRes, sRes] = await Promise.all([
        supabase.from('simulado_folders').select('id, nome, created_at').order('nome'),
        supabase
          .from('simulados')
          .select('id, titulo, status, folder_id, created_at, simulado_questoes(count)')
          .order('created_at', { ascending: false }),
      ])
      setFolders(fRes.data ?? [])
      setSimulados((sRes.data as unknown as SimuladoItem[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // ── Folder CRUD ──────────────────────────────────────────────
  async function createFolder() {
    if (!newFolderName.trim()) return
    const res = await fetch('/api/simulado/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: newFolderName.trim() }),
    })
    if (res.ok) {
      setNewFolderName('')
      setCreatingFolder(false)
      load()
    }
  }

  async function renameFolder(id: string) {
    if (!renameValue.trim()) return
    await fetch('/api/simulado/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nome: renameValue.trim() }),
    })
    setRenamingId(null)
    load()
  }

  async function deleteFolder(id: string) {
    if (!confirm('Excluir pasta? Os simulados dentro serão movidos para "Sem pasta".')) return
    await fetch('/api/simulado/folders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  // ── Simulado actions ─────────────────────────────────────────
  async function deleteSimulado(id: string) {
    if (!confirm('Excluir este simulado permanentemente?')) return
    await fetch(`/api/simulado/${id}`, { method: 'DELETE' })
    load()
  }

  async function moveSimuladoToPasta(simuladoId: string, folderId: string | null) {
    const supabase = createClient()
    await supabase
      .from('simulados')
      .update({ folder_id: folderId })
      .eq('id', simuladoId)
    await load()
  }

  async function exportPDF(s: SimuladoItem) {
    const detail = await fetch(`/api/simulado/${s.id}`).then(r => r.json())
    if (!detail?.questions?.length) { alert('Simulado vazio'); return }

    const payload = {
      title: detail.titulo,
      questions: detail.questions.map((q: { id: string; enunciado: string; alternativas?: { letra: string; texto: string; ordem?: number }[]; dificuldade?: string; ano?: number; gabarito?: string; anulada?: boolean; imagem_url?: string | null; instituicao?: { sigla?: string; nome?: string } }, i: number) => ({
        questionNumber: i + 1,
        statement:   q.enunciado,
        alternatives: [...(q.alternativas ?? [])]
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
          .map((a) => ({ letra: a.letra, texto: a.texto })),
        answer:      q.gabarito,
        anulada:     q.anulada ?? false,
        difficulty:  q.dificuldade,
        year:        q.ano,
        institution: q.instituicao?.sigla ?? q.instituicao?.nome,
        visualElement: q.imagem_url ? { type: 'crop', imageUrl: q.imagem_url } : null,
      })),
    }

    const includeGabarito = window.confirm('Incluir gabarito no PDF?')

    const res = await fetch('/api/simulado/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulado: payload, includeGabarito }),
    })
    if (!res.ok) { alert('Erro ao exportar'); return }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${s.titulo}.pdf` })
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Helpers ──────────────────────────────────────────────────
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function questaoCount(s: SimuladoItem) {
    return s.simulado_questoes?.[0]?.count ?? 0
  }

  const filtered = simulados.filter(s =>
    s.titulo.toLowerCase().includes(search.toLowerCase())
  )

  const unfiledSimulados  = filtered.filter(s => !s.folder_id)
  const folderSimuladoMap = folders.reduce<Record<string, SimuladoItem[]>>((acc, f) => {
    acc[f.id] = filtered.filter(s => s.folder_id === f.id)
    return acc
  }, {})

  // ── SimuladoCard component ───────────────────────────────────
  function SimuladoCard({ s }: { s: SimuladoItem }) {
    return (
      <div className="group p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{s.titulo}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              {questaoCount(s)} questão{questaoCount(s) !== 1 ? 'ões' : ''} · {formatDate(s.created_at)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="shrink-0 p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border text-sm">
              <DropdownMenuItem
                onClick={() => router.push(`/simulados/${s.id}`)}
                className="gap-2 cursor-pointer"
              >
                <Eye size={13} /> Ver / Resolver
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportPDF(s)}
                className="gap-2 cursor-pointer"
              >
                <Download size={13} /> Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Mover para pasta */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <FolderInput size={13} /> Mover para pasta
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-card border-border">
                  <DropdownMenuItem
                    onClick={() => moveSimuladoToPasta(s.id, null)}
                    className="gap-2 cursor-pointer"
                  >
                    <FolderMinus size={13} className="text-muted-foreground" />
                    Sem pasta
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {folders.map(f => (
                    <DropdownMenuItem
                      key={f.id}
                      onClick={() => moveSimuladoToPasta(s.id, f.id)}
                      className={cn('gap-2 cursor-pointer', s.folder_id === f.id && 'text-accent')}
                    >
                      <Folder size={13} />
                      {f.nome}
                      {s.folder_id === f.id && <Check size={11} className="ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Remover da pasta */}
              {s.folder_id && (
                <DropdownMenuItem
                  onClick={() => moveSimuladoToPasta(s.id, null)}
                  className="gap-2 cursor-pointer text-orange-400 hover:text-orange-300"
                >
                  <FolderMinus size={13} /> Remover da pasta
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => deleteSimulado(s.id)}
                className="gap-2 cursor-pointer text-red-400 hover:bg-red-400/10 focus:text-red-400"
              >
                <Trash2 size={13} /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          onClick={() => router.push(`/simulados/${s.id}`)}
          className="w-full py-1.5 rounded text-xs font-semibold font-mono uppercase tracking-wider
                     border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
        >
          Iniciar / Continuar
        </button>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-8 md:px-10" style={{ zoom: 0.82 }}>

        {/* Voltar */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-8 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft size={14} /> Voltar ao lar
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              02 / Personalização
            </p>
            <h1 className="text-5xl md:text-6xl font-[var(--font-bebas)] tracking-tight text-foreground">
              Minha Lista
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua coleção privada de simulados para estudo focado.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setCreatingFolder(true)}
              className="border-border text-muted-foreground hover:border-accent hover:text-accent text-xs font-semibold gap-2"
            >
              <FolderPlus size={13} /> Nova pasta
            </Button>
            <Button
              onClick={() => router.push('/banco-questoes')}
              className="bg-accent text-white hover:bg-accent/80 text-xs font-semibold gap-2"
            >
              <Plus size={13} /> Adicionar questões
            </Button>
          </div>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar simulado..."
            className="w-full max-w-sm bg-card border border-border rounded-lg px-4 py-2
                       text-sm text-foreground placeholder:text-muted-foreground
                       focus:outline-none focus:border-accent/50 transition-colors font-mono"
          />
        </div>

        {/* Seção Salvos — sempre presente */}
        <div className="mb-8">
          <h2 className="text-sm font-mono uppercase tracking-widest
                          text-muted-foreground mb-3 flex items-center gap-2">
            <Bookmark size={14} />
            Salvos
            <span className="text-accent font-bold">{savedCount}</span>
          </h2>
          <button
            onClick={() => router.push('/minha-lista/salvos')}
            className="rounded-lg border border-border bg-card p-3
                       hover:border-accent/50 transition-all duration-200
                       cursor-pointer flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20
                              flex items-center justify-center shrink-0">
                <BookmarkCheck size={15} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  Questões Salvas
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {savedCount} questões
                </p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* Criar nova pasta — sempre visível */}
        {creatingFolder && (
          <div className="mb-4 flex items-center gap-2 p-4 rounded-lg border border-accent/40 bg-accent/5">
            <FolderPlus size={16} className="text-accent shrink-0" />
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createFolder()
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
              }}
              placeholder="Nome da pasta..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button onClick={createFolder} className="text-accent hover:text-accent/80 transition-colors">
              <Check size={15} />
            </button>
            <button onClick={() => { setCreatingFolder(false); setNewFolderName('') }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : simulados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <GraduationCap size={48} className="text-foreground/10" />
            <p className="font-mono text-sm text-muted-foreground text-center">
              Nenhum simulado ainda.
            </p>
            <Button
              onClick={() => router.push('/banco-questoes')}
              variant="outline"
              className="border-accent text-accent hover:bg-accent hover:text-black text-xs font-semibold"
            >
              Ir ao banco de questões
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">

            {/* Pastas */}
            {folders.map(folder => {
              const isOpen  = openFolderId === folder.id
              const items   = folderSimuladoMap[folder.id] ?? []

              return (
                <div key={folder.id}>
                  {/* Folder header */}
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card
                               hover:bg-secondary cursor-pointer transition-colors group mb-2"
                    onClick={() => setOpenFolderId(isOpen ? null : folder.id)}
                  >
                    {isOpen
                      ? <FolderOpen size={16} className="text-accent shrink-0" />
                      : <Folder size={16} className="text-accent shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      {renamingId === folder.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renameFolder(folder.id)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          className="bg-transparent text-sm text-foreground outline-none border-b border-accent w-full"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">{folder.nome}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {items.length} simulado{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn('text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-90')}
                    />
                    <div
                      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { setRenamingId(folder.id); setRenameValue(folder.nome) }}
                        className="p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteFolder(folder.id)}
                        className="p-1 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Simulados na pasta */}
                  {isOpen && (
                    <div className="ml-4 pl-4 border-l border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 col-span-full font-mono">
                          Pasta vazia
                        </p>
                      ) : (
                        items.map(s => <SimuladoCard key={s.id} s={s} />)
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Simulados sem pasta */}
            {unfiledSimulados.length > 0 && (
              <div>
                {folders.length > 0 && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Sem pasta
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unfiledSimulados.map(s => <SimuladoCard key={s.id} s={s} />)}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── Colophon ─────────────────────────────────────── */}
        <footer className="mt-20 border-t border-border pt-10 pb-8">
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
            © 2026 Derelict System. Construído para avaliação contínua.
          </p>
        </footer>

      </div>
    </div>
  )
}
