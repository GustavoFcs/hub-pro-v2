'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, RotateCcw, Check } from 'lucide-react'

type AIConfig = {
  provider: 'openrouter' | 'openai'
  textModel: string
  visionModel: string
  svgModel: string
  extractAsText: boolean
}

const PROVIDER_OPTIONS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai',     label: 'OpenAI (direct)' },
] as const

const POPULAR_MODELS = [
  'openai/gpt-4.1-nano',
  'openai/gpt-4.1-mini',
  'openai/gpt-4o',
  'google/gemini-2.0-flash',
  'google/gemini-2.5-flash-preview',
  'google/gemini-2.5-pro-preview',
  'anthropic/claude-3-5-haiku',
  'anthropic/claude-3-7-sonnet',
  'meta-llama/llama-4-scout',
]

type ModelField = Exclude<keyof AIConfig, 'provider' | 'extractAsText'>

const MODEL_FIELDS: { key: ModelField; label: string; description: string }[] = [
  {
    key: 'textModel',
    label: 'Modelo de Extração de Texto',
    description: 'Lê o PDF e extrai questões, alternativas e metadados.',
  },
  {
    key: 'visionModel',
    label: 'Modelo de Localização de Figuras',
    description: 'Analisa imagens de página para encontrar bounding boxes de figuras.',
  },
  {
    key: 'svgModel',
    label: 'Modelo de Reconstrução SVG',
    description: 'Reconstrói figuras como SVG vetorial colorido de alta qualidade.',
  },
]

export function AIModelSettings() {
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [saved,   setSaved]     = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/ai-config')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: AIConfig) => setConfig(data))
      .catch(() => setError('Não foi possível carregar a configuração.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!config) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          extractAsText: config.extractAsText ? 'true' : 'false',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? res.statusText)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setConfig({
      provider: 'openrouter',
      textModel: 'openai/gpt-4.1-nano',
      visionModel: 'google/gemini-2.0-flash',
      svgModel: 'google/gemini-2.5-pro-preview',
      extractAsText: false,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm font-mono">Carregando configuração...</span>
      </div>
    )
  }

  if (!config) {
    return (
      <p className="text-sm text-red-400 font-mono">
        {error ?? 'Erro ao carregar.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Provider */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Provider
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setConfig(c => c ? { ...c, provider: opt.value } : c)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-mono transition-all ${
                config.provider === opt.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
              {config.provider === opt.value && (
                <span className="ml-2 text-[9px] uppercase tracking-widest">ativo</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Model fields */}
      {MODEL_FIELDS.map(({ key, label, description }) => (
        <div key={key}>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground mb-2">{description}</p>
          <input
            type="text"
            value={config[key]}
            onChange={e => setConfig(c => c ? { ...c, [key]: e.target.value } : c)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card
                       text-sm font-mono text-foreground placeholder:text-muted-foreground
                       focus:outline-none focus:border-accent/60 transition-colors"
            placeholder="provider/model-name"
          />
          {/* Quick-pick grid */}
          <div className="flex flex-wrap gap-1 mt-2">
            {POPULAR_MODELS.map(m => (
              <button
                key={m}
                onClick={() => setConfig(c => c ? { ...c, [key]: m } : c)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                  config[key] === m
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-muted-foreground hover:border-accent/40'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Extract as text toggle */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Modo de Extração PDF
        </p>
        <button
          onClick={() => setConfig(c => c ? { ...c, extractAsText: !c.extractAsText } : c)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full
                     border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className={`relative w-11 h-6 rounded-full transition-colors ${
            config.extractAsText ? 'bg-accent' : 'bg-muted'
          }`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              config.extractAsText ? 'left-6' : 'left-1'
            }`} />
          </div>
          <div className="text-left">
            <span className="text-sm block">Extração local de texto (text-mode)</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {config.extractAsText ? 'Ativo — usa pdfjs local, compatível com modelos text-only' : 'Inativo — envia PDF direto para a IA (requer modelo com suporte a PDF)'}
            </span>
          </div>
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 font-mono">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground
                     text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border
                     text-sm font-mono text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
        >
          <RotateCcw size={14} />
          Padrões
        </button>
      </div>
    </div>
  )
}
