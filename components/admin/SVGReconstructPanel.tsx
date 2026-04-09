'use client'

import { useState } from 'react'
import {
  Wand2, Check, X, RotateCcw,
  Loader2, Eye, Code2,
} from 'lucide-react'

interface SVGReconstructPanelProps {
  questionId:    string
  cropImagePath: string
  description:   string
  pageNumber:    number
  currentSvg?:   string | null
  onApproved:    (svgContent: string) => void
}

export function SVGReconstructPanel({
  questionId,
  cropImagePath,
  description,
  pageNumber,
  currentSvg,
  onApproved,
}: SVGReconstructPanelProps) {
  const [status, setStatus]         = useState<
    'idle' | 'loading' | 'preview' | 'approved' | 'error'
  >(currentSvg ? 'approved' : 'idle')
  const [svgContent, setSvgContent] = useState<string>(currentSvg ?? '')
  const [viewMode, setViewMode]     = useState<'preview' | 'code'>('preview')
  const [errorMsg, setErrorMsg]     = useState<string>('')
  const [attempts, setAttempts]     = useState(0)

  const reconstruct = async () => {
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/admin/reconstruct-svg', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, cropImagePath, description }),
      })

      const data = await res.json() as { svgContent?: string; error?: string }

      if (!res.ok || !data.svgContent) {
        setErrorMsg(data.error ?? 'Falha na reconstrução')
        setStatus('error')
        return
      }

      setSvgContent(data.svgContent)
      setStatus('preview')
      setAttempts(a => a + 1)

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const approve = async () => {
    try {
      const res = await fetch('/api/admin/approve-svg', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          svgContent,
          cropImagePath,
          description,
          pageNumber,
        }),
      })

      if (res.ok) {
        setStatus('approved')
        onApproved(svgContent)
      } else {
        const data = await res.json() as { error?: string }
        setErrorMsg(data.error ?? 'Erro ao salvar SVG')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const reject = () => {
    setSvgContent('')
    setStatus('idle')
  }

  // ── Aprovado ──────────────────────────────────────────────
  if (status === 'approved') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={13} className="text-green-400" />
            <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">
              SVG aprovado
            </span>
          </div>
          <button
            onClick={reject}
            className="text-[10px] font-mono text-muted-foreground
                       hover:text-accent transition-colors underline"
          >
            Substituir
          </button>
        </div>

        <div
          className="rounded-lg border border-green-400/20 bg-white p-4
                     flex items-center justify-center min-h-[120px]"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    )
  }

  // ── Preview após geração ──────────────────────────────────
  if (status === 'preview') {
    return (
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
            Reconstrução #{attempts} — Revisar
          </span>

          {/* Toggle preview / código */}
          <div className="flex items-center gap-1 rounded border border-border p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px]
                         transition-colors ${
                viewMode === 'preview'
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye size={10} /> Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px]
                         transition-colors ${
                viewMode === 'code'
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code2 size={10} /> SVG
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        {viewMode === 'preview' ? (
          <div
            className="rounded-lg border border-border bg-white p-4
                       flex items-center justify-center min-h-[150px]"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <textarea
            value={svgContent}
            onChange={e => setSvgContent(e.target.value)}
            className="w-full h-40 font-mono text-[10px] bg-background
                       border border-border rounded-lg p-3
                       text-muted-foreground resize-y focus:outline-none
                       focus:border-accent/40"
            spellCheck={false}
          />
        )}

        {/* Ações */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={reconstruct}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
                       border border-border text-muted-foreground
                       hover:border-accent/30 hover:text-accent transition-colors"
          >
            <RotateCcw size={11} />
            Tentar novamente
          </button>

          <button
            onClick={reject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
                       border border-border text-muted-foreground
                       hover:border-red-400/30 hover:text-red-400 transition-colors"
          >
            <X size={11} />
            Rejeitar
          </button>

          <button
            onClick={approve}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs
                       bg-accent text-black font-medium
                       hover:bg-accent/80 transition-colors"
          >
            <Check size={11} />
            Aprovar SVG
          </button>
        </div>
      </div>
    )
  }

  // ── Erro ──────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <div className="p-3 rounded-lg border border-red-400/20 bg-red-400/5">
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
        <button
          onClick={reconstruct}
          className="self-start flex items-center gap-1.5 px-3 py-1.5
                     rounded text-xs border border-border
                     text-muted-foreground hover:text-accent transition-colors"
        >
          <RotateCcw size={11} />
          Tentar novamente
        </button>
      </div>
    )
  }

  // ── Idle / Loading ────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground">
        Figura recortada salva. Reconstrua como SVG para
        garantir originalidade da representação.
      </p>

      <button
        onClick={reconstruct}
        disabled={status === 'loading'}
        className="self-start flex items-center gap-2 px-4 py-2 rounded text-xs
                   font-medium border border-accent/30 text-accent
                   hover:bg-accent/10 disabled:opacity-40
                   disabled:cursor-not-allowed transition-colors"
      >
        {status === 'loading' ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            Reconstruindo...
          </>
        ) : (
          <>
            <Wand2 size={12} />
            Reconstruir com IA
          </>
        )}
      </button>
    </div>
  )
}
