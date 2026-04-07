'use client'

import { useState, useEffect, useRef } from 'react'
import { useSimuladoStore } from '@/lib/simulado/store'
import { useRouter } from 'next/navigation'
import {
  FileText, X, ChevronRight, Save, Loader2,
  FolderOpen, Settings2,
} from 'lucide-react'

export function SimuladoFloatingBar() {
  const questions  = useSimuladoStore(s => s.questions)
  const title      = useSimuladoStore(s => s.title)
  const setTitle   = useSimuladoStore(s => s.setTitle)
  const clearList  = useSimuladoStore(s => s.clearList)
  const router     = useRouter()

  const [open,     setOpen]     = useState(false)
  const [folderId, setFolderId] = useState('')
  const [folders,  setFolders]  = useState<{ id: string; nome: string }[]>([])
  const [saving,   setSaving]   = useState(false)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Load folders when panel opens
  useEffect(() => {
    if (!open) return
    fetch('/api/simulado/folders')
      .then(r => r.ok ? r.json() : [])
      .then(setFolders)
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  if (questions.length === 0) return null

  async function handleSave() {
    if (!title.trim() || !questions.length) return
    setSaving(true)
    try {
      const res = await fetch('/api/simulado/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          questionIds: questions.map(q => q.id),
          folderId: folderId || undefined,
        }),
      })
      if (res.ok) {
        clearList()
        setOpen(false)
        router.push('/minha-lista')
      } else {
        const err = await res.json()
        alert(err.error ?? 'Erro ao salvar lista')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop when panel is open */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel + bar container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-stretch gap-2 w-[min(440px,calc(100vw-2rem))]">

        {/* Criar lista panel */}
        {open && (
          <div className="rounded-2xl bg-[#111] border border-accent/40 shadow-2xl shadow-accent/10
                          backdrop-blur-sm p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">

            <div className="flex items-center gap-2">
              <Settings2 size={13} className="text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Criar lista
              </span>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Nome da lista
              </label>
              <input
                ref={inputRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                placeholder="Ex: Matemática IME 2024"
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                           placeholder:text-muted-foreground focus:outline-none focus:border-accent/50
                           transition-colors font-mono"
              />
            </div>

            {/* Folder */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Salvar em
              </label>
              <div className="relative">
                <FolderOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  value={folderId}
                  onChange={e => setFolderId(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm
                             text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors
                             font-mono appearance-none"
                >
                  <option value="">Sem pasta</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black text-xs
                           font-mono font-bold uppercase tracking-wider hover:bg-accent/80 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar lista
              </button>

              <button
                onClick={() => { setOpen(false); router.push('/simulados/novo') }}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground
                           hover:text-white transition-colors underline-offset-2 hover:underline"
              >
                Montar avançado <ChevronRight size={11} />
              </button>
            </div>
          </div>
        )}

        {/* Floating bar */}
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl
                        bg-[#111] border border-accent/40 shadow-2xl shadow-accent/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText size={16} className="text-accent shrink-0" />
            <span className="text-sm font-medium truncate">
              <span className="text-accent font-bold">{questions.length}</span>
              {' '}questão{questions.length !== 1 ? 'ões' : ''} selecionada{questions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="w-px h-4 bg-white/10 shrink-0" />

          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-medium shrink-0
                       text-accent hover:text-accent/80 transition-colors"
          >
            Criar lista
            <ChevronRight size={14} className={open ? 'rotate-90 transition-transform' : 'transition-transform'} />
          </button>

          <button
            onClick={clearList}
            className="text-muted-foreground hover:text-white transition-colors shrink-0"
            title="Limpar seleção"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
