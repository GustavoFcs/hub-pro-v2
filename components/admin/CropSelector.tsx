'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Loader2, RotateCcw, Check } from 'lucide-react'

interface CropBox {
  xPct: number
  yPct: number
  wPct: number
  hPct: number
}

interface CropSelectorProps {
  sessionId: string
  pageNumber: number
  questionNumber: number
  initialCropBox?: CropBox | null
  onConfirm: (cropBox: CropBox) => void
  onSkip: () => void
}

export function CropSelector({
  sessionId,
  pageNumber,
  questionNumber,
  initialCropBox,
  onConfirm,
  onSkip,
}: CropSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  // Keep current box in a ref so the draw function never goes stale
  const currentBoxRef = useRef<CropBox | null>(initialCropBox ?? null)
  const [currentBox, setCurrentBox] = useState<CropBox | null>(initialCropBox ?? null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isDraggingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })

  // ── Draw (reads from refs, never stale) ──────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || canvas.width === 0) return

    const box = currentBoxRef.current
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    if (!box) return

    const x = (box.xPct / 100) * canvas.width
    const y = (box.yPct / 100) * canvas.height
    const w = (box.wPct / 100) * canvas.width
    const h = (box.hPct / 100) * canvas.height

    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(x, y, w, h)
    ctx.drawImage(img, x, y, w, h, x, y, w, h)

    ctx.strokeStyle = '#ff6600'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)

    const hs = 8
    ctx.fillStyle = '#ff6600'
    ;[
      [x, y], [x + w, y], [x, y + h], [x + w, y + h],
      [x + w / 2, y], [x + w / 2, y + h],
      [x, y + h / 2], [x + w, y + h / 2],
    ].forEach(([hx, hy]) => ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs))

    ctx.fillStyle = '#ff6600'
    ctx.fillRect(x, y - 22, 120, 22)
    ctx.fillStyle = '#000'
    ctx.font = '11px monospace'
    ctx.fillText(`Q${questionNumber} — seleção`, x + 4, y - 6)
  }, [questionNumber])

  // ── Fetch page base64 ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCanvasReady(false)
    imgRef.current = null

    fetch('/api/admin/render-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, pageNumber }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (!data.base64) { setError(data.error ?? 'Falha ao carregar página'); setLoading(false); return }

        const img = new Image()
        img.onload = () => {
          if (cancelled) return
          imgRef.current = img
          setLoading(false)
          // Canvas sizing runs after loading=false paints the canvas element
          requestAnimationFrame(() => {
            const canvas = canvasRef.current
            const container = containerRef.current
            if (!canvas || !container) return
            const maxW = container.clientWidth || 800
            canvas.width  = maxW
            canvas.height = Math.round(img.naturalHeight * (maxW / img.naturalWidth))
            setCanvasReady(true)
          })
        }
        img.onerror = () => { if (!cancelled) { setError('Falha ao decodificar imagem'); setLoading(false) } }
        img.src = `data:image/png;base64,${data.base64}`
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [sessionId, pageNumber])

  // ── Draw whenever canvas becomes ready or box changes ─────────────
  useEffect(() => {
    if (canvasReady) draw()
  }, [canvasReady, draw])

  useEffect(() => {
    currentBoxRef.current = currentBox
    if (canvasReady) draw()
  }, [currentBox, canvasReady, draw])

  // ── Mouse events (refs only — no state in hot path) ───────────────
  const getPct = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startPosRef.current = getPct(e)
    isDraggingRef.current = true
    setCurrentBox(null)
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return
    const pos = getPct(e)
    const sp = startPosRef.current
    const box: CropBox = {
      xPct: Math.min(sp.x, pos.x),
      yPct: Math.min(sp.y, pos.y),
      wPct: Math.abs(pos.x - sp.x),
      hPct: Math.abs(pos.y - sp.y),
    }
    // Draw directly to avoid setState thrashing during drag
    currentBoxRef.current = box
    draw()
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    // Commit to state so buttons react
    setCurrentBox(currentBoxRef.current)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
          Questão {questionNumber} — Página {pageNumber}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Arraste para selecionar a figura
        </span>
      </div>

      {/* Canvas — always in DOM so containerRef.clientWidth is measurable */}
      <div ref={containerRef} className="relative w-full rounded-lg overflow-hidden border border-accent/30 bg-[#0a0a0a]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center h-48">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        )}
        {error && !loading && (
          <div className="flex items-center justify-center h-48 text-xs text-red-400 font-mono px-4 text-center">
            {error}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`w-full cursor-crosshair ${loading || error ? 'invisible h-0' : ''}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={(e) => onMouseUp(e)}
        />
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setCurrentBox(initialCropBox ?? null)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
                     border border-white/10 text-muted-foreground
                     hover:border-white/20 hover:text-white transition-colors"
        >
          <RotateCcw size={12} />
          Resetar sugestão da IA
        </button>

        <button
          onClick={onSkip}
          className="px-3 py-1.5 rounded text-xs
                     border border-white/10 text-muted-foreground
                     hover:border-white/20 hover:text-white transition-colors"
        >
          Pular (sem imagem)
        </button>

        <button
          disabled={!currentBox || currentBox.wPct < 2 || currentBox.hPct < 2}
          onClick={() => currentBox && onConfirm(currentBox)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs
                     bg-accent text-black font-medium
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-accent/80 transition-colors"
        >
          <Check size={12} />
          Confirmar seleção
        </button>
      </div>
    </div>
  )
}
