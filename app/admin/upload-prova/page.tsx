"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  UploadCloud, FileText, CheckCircle, AlertCircle, ChevronDown,
  ChevronUp, Trash2, PlayCircle, Loader2, ArrowRight, RotateCcw,
  ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CropSelector } from '@/components/admin/CropSelector'
import { SVGReconstructPanel } from '@/components/admin/SVGReconstructPanel'

interface Instituicao { id: string; nome: string; sigla: string | null }
interface VisualElement {
  type: 'crop' | 'svg' | 'text_only'
  description: string
  pageNumber?: number | null
  imageUrl?: string | null
  cropImagePath?: string | null
  svgContent?: string | null
  reconstructed?: boolean
}
interface Alternative { letra: 'a' | 'b' | 'c' | 'd' | 'e'; texto: string }
interface ReviewQuestion {
  id: string
  questionNumber: number
  pagina: number
  enunciado: string
  alternatives: Alternative[]
  subject: string
  subtopic: string
  difficulty: 'facil' | 'medio' | 'dificil'
  gabarito: string
  visualElement: VisualElement
  selected: boolean
  expanded: boolean
  searchVideo: boolean
}
type ProcessExamResponse = {
  provaId: string
  pdfUrl: string
  questions: Array<ReviewQuestion & { pagina: number }>
  sessionId?: string
}
type Stage = 'upload' | 'gabarito' | 'reviewing' | 'success'

function randomId(): string { return Math.random().toString(36).slice(2) }

export default function UploadProvaPage() {
  const [stage, setStage] = useState<Stage>('upload')
  const [dragActive, setDragActive] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [instituicaoId, setInstituicaoId] = useState('')
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([])
  const [processing, setProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState(0)
  const [processStatus, setProcessStatus] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [provaId, setProvaId] = useState('')
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [cropMode, setCropMode] = useState<'ai' | 'manual'>('ai')

  // Gabarito scan state
  const [gabaritoFile,   setGabaritoFile]   = useState<File | null>(null)
  const [scanningGab,    setScanningGab]     = useState(false)
  const [gabaritoError,  setGabaritoError]   = useState('')
  const [gabaritoResult, setGabaritoResult]  = useState<{ matched: number; total: number; anuladas: number } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('cropMode') as 'ai' | 'manual' | null
    if (saved === 'manual') setCropMode('manual')
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('instituicoes').select('id, nome, sigla').order('nome').then(({ data }) => {
      if (data) setInstituicoes(data)
    })
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f?.type === 'application/pdf') setPdfFile(f)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pdfFile) { setUploadError('Selecione um arquivo PDF'); return }
    if (!titulo.trim()) { setUploadError('Informe o título da prova'); return }
    if (!ano || isNaN(parseInt(ano))) { setUploadError('Informe o ano'); return }
    if (!instituicaoId) { setUploadError('Selecione uma instituição'); return }

    setUploadError(''); setProcessing(true); setProcessProgress(5)
    setProcessStatus('Fazendo upload do PDF...')

    const formData = new FormData()
    formData.append('pdf', pdfFile)
    formData.append('titulo', titulo)
    formData.append('ano', ano)
    formData.append('instituicao_id', instituicaoId)
    formData.append('cropMode', cropMode)

    const progressInterval = setInterval(() => {
      setProcessProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return prev }
        return prev + Math.random() * 8
      })
    }, 1200)

    try {
      setProcessProgress(15); setProcessStatus('Enviando PDF para análise pela IA...')
      setProcessProgress(40); setProcessStatus('Aguardando análise das questões...')
      const res = await fetch('/api/admin/process-exam', { method: 'POST', body: formData })
      clearInterval(progressInterval)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' })) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as ProcessExamResponse
      setProcessProgress(100); setProcessStatus(`Concluído! ${data.questions.length} questões extraídas.`)
      const reviewQs: ReviewQuestion[] = data.questions.map(q => ({
        ...q, id: randomId(), gabarito: q.gabarito ?? '', selected: true, expanded: false, searchVideo: true,
      }))
      setProvaId(data.provaId); setSessionId(data.sessionId ?? null); setQuestions(reviewQs)
      setTimeout(() => setStage('gabarito'), 600)
    } catch (err) {
      clearInterval(progressInterval)
      setUploadError(err instanceof Error ? err.message : 'Erro ao processar a prova')
      setProcessProgress(0); setProcessStatus('')
    } finally { setProcessing(false) }
  }

  async function handleConfirmImport() {
    const selected = questions.filter(q => q.selected)
    if (selected.length === 0) { setImportError('Selecione pelo menos uma questão'); return }
    setImporting(true); setImportError('')
    try {
      const res = await fetch('/api/admin/confirm-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provaId, ano: parseInt(ano), instituicaoId,
          questoes: selected.map(q => ({
            questionNumber: q.questionNumber, pagina: q.pagina, enunciado: q.enunciado,
            alternatives: q.alternatives, subject: q.subject, subtopic: q.subtopic,
            difficulty: q.difficulty, gabarito: q.gabarito || undefined,
            visualElement: q.visualElement, searchVideo: q.searchVideo,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' })) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { importedCount: number }
      setImportedCount(data.importedCount); setStage('success')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao importar questões')
    } finally { setImporting(false) }
  }

  function updateQuestion(id: string, patch: Partial<ReviewQuestion>) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))
  }
  function updateAlternative(qId: string, idx: number, texto: string) {
    setQuestions(qs => qs.map(q => {
      if (q.id !== qId) return q
      const alts = [...q.alternatives]; alts[idx] = { ...alts[idx], texto }
      return { ...q, alternatives: alts }
    }))
  }
  function removeQuestion(id: string) { setQuestions(qs => qs.filter(q => q.id !== id)) }
  function handleReset() {
    setStage('upload'); setPdfFile(null); setTitulo(''); setAno(new Date().getFullYear().toString())
    setInstituicaoId(''); setQuestions([]); setProvaId(''); setSessionId(null); setProcessProgress(0)
    setProcessStatus(''); setUploadError(''); setImportError(''); setImportedCount(0)
    setGabaritoFile(null); setScanningGab(false); setGabaritoError(''); setGabaritoResult(null)
  }

  async function handleScanGabarito() {
    if (!gabaritoFile) return
    setScanningGab(true); setGabaritoError(''); setGabaritoResult(null)
    try {
      const form = new FormData()
      form.append('gabarito', gabaritoFile)
      const res = await fetch('/api/admin/scan-gabarito', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' })) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const { answers } = await res.json() as { answers: { number: number; answer: string }[] }
      const answerMap = new Map(answers.map(a => [a.number, a.answer]))
      setQuestions(qs => qs.map(q => {
        const ans = answerMap.get(q.questionNumber)
        return ans ? { ...q, gabarito: ans } : q
      }))
      const matched  = answers.filter(a => questions.some(q => q.questionNumber === a.number)).length
      const anuladas = answers.filter(a => a.answer === 'anulada').length
      setGabaritoResult({ matched, total: answers.length, anuladas })
    } catch (err) {
      setGabaritoError(err instanceof Error ? err.message : 'Erro ao escanear gabarito')
    } finally {
      setScanningGab(false)
    }
  }

  function toggleCropMode() {
    const next = cropMode === 'ai' ? 'manual' : 'ai'
    setCropMode(next)
    localStorage.setItem('cropMode', next)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight uppercase">UPLOAD DE PROVA</h1>
        <p className="text-muted-foreground text-sm font-mono tracking-widest">IMPORTAÇÃO DE PDF COM ANÁLISE POR INTELIGÊNCIA ARTIFICIAL</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-2">
        {(['upload', 'gabarito', 'reviewing', 'success'] as Stage[]).map((s, i) => {
          const labels = ['1. Upload', '2. Gabarito', '3. Revisão', '4. Concluído']
          const stageOrder = ['upload', 'gabarito', 'reviewing', 'success']
          const isActive = stage === s
          const isDone   = stageOrder.indexOf(stage) > i
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className={cn('h-px flex-1', isDone ? 'bg-accent' : 'bg-border')} />}
              <span className={cn('text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border',
                isActive ? 'text-accent border-accent/60 bg-accent/10' :
                isDone ? 'text-foreground border-white/20 bg-card' : 'text-muted-foreground border-border'
              )}>{labels[i]}</span>
            </React.Fragment>
          )
        })}
      </div>

      {stage === 'upload' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-accent text-xs font-bold uppercase tracking-widest">INFORMAÇÕES DA PROVA</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Título</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: ENEM 2023  Ciências da Natureza"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Ano</label>
                <input type="number" value={ano} onChange={e => setAno(e.target.value)} min={1990} max={new Date().getFullYear() + 1}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Instituição</label>
                <select value={instituicaoId} onChange={e => setInstituicaoId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent">
                  <option value="">Selecione...</option>
                  {instituicoes.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.sigla ? `${inst.sigla}  ${inst.nome}` : inst.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className={cn('relative border-2 border-dashed rounded-2xl p-16 transition-all duration-300 flex flex-col items-center justify-center gap-5',
              dragActive ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-accent/30 bg-card hover:border-accent/60')}>
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
              {pdfFile ? <FileText className="text-accent" size={28} /> : <UploadCloud className="text-accent" size={28} />}
            </div>
            {pdfFile ? (
              <div className="text-center">
                <p className="text-foreground font-bold">{pdfFile.name}</p>
                <p className="text-muted-foreground text-xs mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground mb-1">Arraste o PDF aqui</h3>
                <p className="text-muted-foreground text-sm">ou clique para selecionar o arquivo</p>
              </div>
            )}
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf"
              onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f) }} />
            {!pdfFile && (
              <Button type="button" className="bg-accent text-accent-foreground hover:bg-accent/80 px-8 py-5 rounded-md font-bold text-xs uppercase tracking-widest">SELECIONAR PDF</Button>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} /> {uploadError}
            </div>
          )}
          {processing && (
            <div className="bg-secondary p-6 rounded-2xl border border-accent/20 space-y-3">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-accent" />{processStatus}</span>
                <span className="text-accent">{Math.round(processProgress)}%</span>
              </div>
              <Progress value={processProgress} className="h-1.5 bg-background" />
              <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest text-center">Isso pode levar alguns minutos dependendo do número de páginas</p>
            </div>
          )}
          <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Modo de crop de figuras</p>
              <p className="text-xs text-muted-foreground">
                {cropMode === 'ai'
                  ? 'IA detecta e recorta as figuras automaticamente'
                  : 'Você seleciona manualmente a região de cada figura na revisão'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
                cropMode === 'ai' ? 'text-accent' : 'text-muted-foreground'
              }`}>IA</span>
              <button
                type="button"
                onClick={toggleCropMode}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  cropMode === 'manual' ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                  cropMode === 'manual' ? 'left-5' : 'left-0.5'
                }`} />
              </button>
              <span className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
                cropMode === 'manual' ? 'text-accent' : 'text-muted-foreground'
              }`}>Manual</span>
            </div>
          </div>

          <Button type="submit" disabled={processing || !pdfFile}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/80 py-6 rounded-md font-bold text-sm uppercase tracking-widest gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {processing ? <><Loader2 size={16} className="animate-spin" /> PROCESSANDO...</> : <>PROCESSAR COM IA <ArrowRight size={16} /></>}
          </Button>
        </form>
      )}

      {stage === 'gabarito' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <h3 className="text-accent text-xs font-bold uppercase tracking-widest">GABARITO OFICIAL</h3>
            <p className="text-muted-foreground text-xs font-mono">
              Faça upload do PDF do gabarito. A IA vai ler e atribuir as respostas às {questions.length} questões extraídas.
              Questões anuladas serão marcadas automaticamente.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag}
            onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f?.type === 'application/pdf') setGabaritoFile(f) }}
            className={cn('relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4',
              dragActive ? 'border-accent bg-accent/5' : 'border-accent/30 bg-card hover:border-accent/60')}
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
              {gabaritoFile ? <FileText className="text-accent" size={22} /> : <UploadCloud className="text-accent" size={22} />}
            </div>
            {gabaritoFile ? (
              <div className="text-center">
                <p className="text-foreground font-bold text-sm">{gabaritoFile.name}</p>
                <p className="text-muted-foreground text-xs mt-1">{(gabaritoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <button onClick={() => { setGabaritoFile(null); setGabaritoResult(null) }}
                  className="mt-2 text-xs font-mono text-muted-foreground hover:text-red-400 transition-colors">Remover</button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Arraste o PDF do gabarito</p>
                <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
              </div>
            )}
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setGabaritoFile(f); setGabaritoResult(null) } }} />
          </div>

          {gabaritoError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} /> {gabaritoError}
            </div>
          )}

          {scanningGab && (
            <div className="bg-secondary p-6 rounded-2xl border border-accent/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Loader2 size={12} className="animate-spin text-accent" /> Escaneando gabarito com IA...</div>
              <Progress value={undefined} className="h-1.5 bg-background" />
            </div>
          )}

          {gabaritoResult && (
            <div className="p-5 rounded-2xl border border-green-500/30 bg-green-500/5 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Gabarito escaneado</span>
              </div>
              <p className="text-sm text-foreground">
                <span className="text-accent font-bold">{gabaritoResult.matched}</span> questões atribuídas
                {gabaritoResult.anuladas > 0 && <> · <span className="text-red-400 font-bold">{gabaritoResult.anuladas}</span> anuladas</>}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStage('reviewing')}
              className="border-border text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-widest">
              Pular este passo
            </Button>
            <Button
              onClick={gabaritoResult ? () => setStage('reviewing') : handleScanGabarito}
              disabled={(!gabaritoFile && !gabaritoResult) || scanningGab}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/80 py-6 font-bold text-sm uppercase tracking-widest gap-2 disabled:opacity-50">
              {scanningGab
                ? <><Loader2 size={16} className="animate-spin" /> ESCANEANDO...</>
                : gabaritoResult
                  ? <>CONTINUAR PARA REVISÃO <ArrowRight size={16} /></>
                  : <>ESCANEAR COM IA <ArrowRight size={16} /></>}
            </Button>
          </div>
        </div>
      )}

      {stage === 'reviewing' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-5 flex flex-wrap gap-6 items-center justify-between">
            <div className="flex gap-6">
              <div><p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Extraídas</p><p className="text-2xl font-bold text-foreground">{questions.length}</p></div>
              <div><p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Selecionadas</p><p className="text-2xl font-bold text-accent">{questions.filter(q => q.selected).length}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setQuestions(qs => qs.map(q => ({ ...q, selected: true })))}
                className="border-border text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest font-bold">Selecionar todas</Button>
              <Button variant="outline" onClick={() => setQuestions(qs => qs.map(q => ({ ...q, selected: false })))}
                className="border-border text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest font-bold">Desmarcar todas</Button>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <QuestionReviewCard key={q.id} question={q} index={idx}
                cropMode={cropMode}
                sessionId={sessionId}
                onUpdate={patch => updateQuestion(q.id, patch)}
                onUpdateAlt={(altIdx, texto) => updateAlternative(q.id, altIdx, texto)}
                onRemove={() => removeQuestion(q.id)} />
            ))}
          </div>

          {importError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={16} /> {importError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleReset}
              className="border-border text-muted-foreground hover:text-foreground gap-2 font-bold text-xs uppercase tracking-widest">
              <RotateCcw size={14} /> CANCELAR
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing || questions.filter(q => q.selected).length === 0}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/80 py-6 font-bold text-sm uppercase tracking-widest gap-2 disabled:opacity-50">
              {importing ? <><Loader2 size={16} className="animate-spin" /> IMPORTANDO...</> : <>IMPORTAR {questions.filter(q => q.selected).length} QUESTÕES <ArrowRight size={16} /></>}
            </Button>
          </div>
        </div>
      )}

      {stage === 'success' && (
        <div className="flex flex-col items-center gap-8 py-16">
          <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <CheckCircle className="text-green-400" size={44} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground uppercase tracking-tight">Importação concluída!</h2>
            <p className="text-muted-foreground text-sm font-mono">{importedCount} questões foram adicionadas ao banco com sucesso.</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleReset}
              className="border-border text-muted-foreground hover:text-foreground gap-2 font-bold text-xs uppercase tracking-widest px-8 py-5">
              <UploadCloud size={14} /> NOVA PROVA
            </Button>
            <Button onClick={() => window.location.href = '/admin/gerenciar-provas'}
              className="bg-accent text-accent-foreground hover:bg-accent/80 px-8 py-5 font-bold text-xs uppercase tracking-widest">VER PROVAS</Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface QuestionReviewCardProps {
  question: ReviewQuestion; index: number
  cropMode: 'ai' | 'manual'
  sessionId: string | null
  onUpdate: (patch: Partial<ReviewQuestion>) => void
  onUpdateAlt: (idx: number, texto: string) => void
  onRemove: () => void
}

function QuestionReviewCard({ question: q, index, cropMode, sessionId, onUpdate, onUpdateAlt, onRemove }: QuestionReviewCardProps) {
  const DC: Record<string, string> = {
    facil: 'text-green-400 border-green-500/30 bg-green-500/10',
    medio: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    dificil: 'text-red-400 border-red-500/30 bg-red-500/10',
  }
  return (
    <div className={cn('rounded-2xl border transition-all duration-200',
      q.selected ? 'bg-card border-accent/20' : 'bg-background border-border opacity-60')}>
      <div className="flex items-center gap-4 p-4">
        <input type="checkbox" checked={q.selected} onChange={e => onUpdate({ selected: e.target.checked })}
          className="w-4 h-4 accent-[#FF6B35] cursor-pointer" />
        <span className="text-accent font-mono font-bold text-sm w-8 shrink-0">#{q.questionNumber || index + 1}</span>
        <span className="text-muted-foreground text-xs font-mono truncate flex-1">{q.subject}  {q.subtopic}</span>
        <span className={cn('text-[10px] font-mono uppercase border rounded px-2 py-0.5 opacity-0 pointer-events-none select-none', DC[q.difficulty] ?? 'text-muted-foreground border-border')}>{q.difficulty}</span>
        {q.visualElement.type !== 'text_only' && (
          <span className="text-[10px] font-mono uppercase border rounded px-2 py-0.5 text-blue-400 border-blue-500/30 bg-blue-500/10">
            IMAGEM
          </span>
        )}
        <button type="button" title={q.searchVideo ? 'Buscar vídeo no YouTube' : 'Não buscar vídeo'}
          onClick={() => onUpdate({ searchVideo: !q.searchVideo })}
          className={cn('transition-colors', q.searchVideo ? 'text-red-400' : 'text-muted-foreground')}>
          <PlayCircle size={16} />
        </button>
        <button type="button" onClick={() => onUpdate({ expanded: !q.expanded })} className="text-muted-foreground hover:text-foreground transition-colors">
          {q.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      {q.expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Enunciado</label>
            <textarea value={q.enunciado} onChange={e => onUpdate({ enunciado: e.target.value })} rows={4}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground resize-y focus:outline-none focus:border-accent question-font" />
          </div>
          {/* -- Preview Visual -- */}
          {(q.visualElement?.type === 'crop' || q.visualElement?.type === 'svg') && (
            <div className="mt-3 mb-4">
              {cropMode === 'manual' ? (
                /* -- Manual: crop feito ? painel de reconstrução SVG -- */
                q.visualElement.cropImagePath ? (
                  <SVGReconstructPanel
                    questionId={q.id}
                    cropImagePath={q.visualElement.cropImagePath}
                    description={q.visualElement.description ?? ''}
                    pageNumber={q.visualElement.pageNumber ?? 1}
                    currentSvg={q.visualElement.svgContent ?? null}
                    onApproved={(svgContent) => {
                      onUpdate({
                        visualElement: {
                          ...q.visualElement,
                          type: 'svg',
                          svgContent,
                          reconstructed: true,
                        },
                      })
                    }}
                  />
                ) : q.visualElement.imageUrl === 'skipped' ? (
                  <div className="p-3 bg-background rounded-lg border border-border flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground font-mono italic">Figura pulada</p>
                    <button
                      onClick={() => onUpdate({ visualElement: { ...q.visualElement, imageUrl: null } })}
                      className="text-[10px] font-mono text-muted-foreground hover:text-accent transition-colors underline underline-offset-2"
                    >
                      Selecionar
                    </button>
                  </div>
                ) : (
                  <CropSelector
                    sessionId={sessionId ?? ''}
                    pageNumber={q.visualElement.pageNumber ?? 1}
                    questionNumber={q.questionNumber}
                    initialCropBox={null}
                    onConfirm={async (cropBox) => {
                      try {
                        const res = await fetch('/api/admin/crop-manual', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sessionId,
                            pageNumber: q.visualElement!.pageNumber,
                            cropBox,
                            questionNumber: q.questionNumber,
                          }),
                        })
                        const data = await res.json() as { cropPath?: string; error?: string }
                        if (data.cropPath) {
                          onUpdate({
                            visualElement: {
                              ...q.visualElement,
                              cropImagePath: data.cropPath,
                              reconstructed: false,
                            },
                          })
                        }
                      } catch (err) {
                        console.error('[CropManual] Erro:', err)
                      }
                    }}
                    onSkip={() => onUpdate({ visualElement: { ...q.visualElement, imageUrl: 'skipped' } })}
                  />
                )
              ) : (
                /* -- AI mode: exibir imageUrl gerada pelo process-exam -- */
                <div className="rounded-lg overflow-hidden border border-accent/20">
                  {q.visualElement.imageUrl && q.visualElement.imageUrl !== 'skipped' ? (
                    <img
                      src={q.visualElement.imageUrl}
                      alt={q.visualElement.description}
                      className="w-full object-contain max-h-[400px] bg-background"
                    />
                  ) : (
                    <div className="p-4 bg-background flex items-center gap-3">
                      <ImageIcon size={16} className="text-yellow-500 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {q.visualElement.description ?? 'Imagem não disponível'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Alternativas</label>
            {q.alternatives.map((alt, idx) => (
              <div key={alt.letra} className="flex items-start gap-2">
                <span className="text-accent font-mono text-sm uppercase w-5 shrink-0 mt-2">{alt.letra})</span>
                <input type="text" value={alt.texto} onChange={e => onUpdateAlt(idx, e.target.value)}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent question-font" />
                {q.gabarito === alt.letra && <CheckCircle size={16} className="text-green-400 mt-2.5 shrink-0" />}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Matéria</label>
              <input value={q.subject} onChange={e => onUpdate({ subject: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Subtópico</label>
              <input value={q.subtopic} onChange={e => onUpdate({ subtopic: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Dificuldade</label>
              <select value={q.difficulty} onChange={e => onUpdate({ difficulty: e.target.value as 'facil' | 'medio' | 'dificil' })}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent">
                <option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Gabarito</label>
              <select value={q.gabarito} onChange={e => onUpdate({ gabarito: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent">
                <option value=""></option>
                <option value="anulada" className="text-red-400">Anulada</option>
                {['a','b','c','d','e'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
