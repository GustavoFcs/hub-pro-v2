"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MathText } from '@/components/ui/MathText'
import { DIFFICULTY_CONFIG, type Difficulty } from '@/lib/difficulty/calculator'
import { useSimuladoStore } from '@/lib/simulado/store'
import { Bookmark, BarChart2, PlayCircle, ExternalLink, ImageIcon, Check, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Alternative {
  id: string
  text: string
}

interface Question {
  id: string
  topic: string
  subtopic: string
  difficulty: string
  year: number
  text: string
  // novos campos opcionais para tags e simulado
  subject?: string
  institution?: string
  alternatives: Alternative[]
  // Elementos visuais (opcionais)
  imagemUrl?: string | null        // URL da imagem (crop)
  imagemSvg?: string | null        // SVG reconstruído
  imagemTipo?: 'crop' | 'reconstruida' | null
  // Elemento visual estruturado
  visualElement?: { type: string; imageUrl?: string | null; description?: string } | null
  // Vídeo YouTube
  videoUrl?: string | null
  videoTitulo?: string | null
  videoProfessor?: string | null
  anulada?: boolean
}

export function QuestionCard({ question, questionIndex }: { question: Question; questionIndex?: number }) {
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Normalizar dificuldade para chave do DIFFICULTY_CONFIG
  const diffKey = question.difficulty?.toLowerCase().replace(' ', '_').replace('á', 'a').replace('é', 'e') as Difficulty
  const diffConfig = DIFFICULTY_CONFIG[diffKey]

  const addQuestion    = useSimuladoStore(s => s.addQuestion)
  const removeQuestion = useSimuladoStore(s => s.removeQuestion)
  const hasQuestion    = useSimuladoStore(s => s.hasQuestion)
  const isAdded        = hasQuestion(question.id)

  return (
    <Card className="bg-[#1a1a1a] border-accent/40 hover:border-accent transition-all duration-300 rounded-[12px] p-6 mb-4 group shadow-lg">
      <CardHeader className="p-0 mb-4 flex flex-row items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors duration-200">
            Questão {questionIndex ?? 1}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#999999] uppercase tracking-widest">
              {question.topic} | {question.year}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10
                     text-muted-foreground hover:border-accent/40 hover:text-accent
                     transition-colors font-mono text-[9px] uppercase tracking-widest"
          title={showDetails ? 'Ocultar detalhes' : 'Ver dificuldade e assunto'}
        >
          {showDetails ? <EyeOff size={11} /> : <Eye size={11} />}
          {showDetails ? 'Ocultar' : 'Detalhes'}
        </button>
        {question.anulada && (
          <span className="ml-2 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/40
                           text-red-400 font-mono text-[9px] uppercase tracking-widest font-bold">
            Anulada
          </span>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Tags: visíveis apenas com showDetails */}
        {showDetails && (question.year || question.institution || question.subject || question.difficulty) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {question.year > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono
                               bg-white/5 text-muted-foreground border border-white/10">
                {question.year}
              </span>
            )}
            {question.institution && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase
                               bg-white/5 text-muted-foreground border border-white/10">
                {question.institution}
              </span>
            )}
            {question.subject && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono
                               bg-accent/10 text-accent border border-accent/20">
                {question.subject}
              </span>
            )}
            {question.difficulty && (
              <span className={cn(
                'px-2 py-0.5 rounded text-[10px] font-mono border border-current/20',
                diffConfig?.bg ?? 'bg-white/5',
                diffConfig?.color ?? 'text-muted-foreground',
              )}>
                {diffConfig?.label ?? question.difficulty}
              </span>
            )}
          </div>
        )}

        <div className="text-[15px] text-[#CCCCCC] leading-relaxed mb-6 font-medium">
          <MathText text={question.text} />
        </div>

        {/* Elemento visual (imagem crop ou SVG reconstruído) */}
        {question.imagemTipo === 'crop' && question.imagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.imagemUrl}
            alt="Imagem da questão"
            className="mb-6 max-w-full h-auto max-h-64 object-contain rounded-md border border-[#333] bg-white block"
          />
        )}

        {question.imagemTipo === 'crop' && !question.imagemUrl && question.imagemSvg?.startsWith('[CROP_DESCRIPTION]:') && null}

        {question.imagemTipo === 'reconstruida' && question.imagemSvg && (
          <div
            className="mb-6 rounded-md border border-[#333] bg-white p-3 overflow-auto max-h-64 inline-block max-w-full"
            dangerouslySetInnerHTML={{ __html: question.imagemSvg }}
          />
        )}

        {question.visualElement?.type === 'crop' && question.visualElement?.imageUrl && (
          <img
            src={question.visualElement.imageUrl}
            alt={question.visualElement.description ?? 'Imagem da questão'}
            className="w-full object-contain max-h-[350px] rounded-lg my-3"
          />
        )}

        {/* Alternativas */}
        <div className="flex flex-col gap-3 mb-8 ml-4">
          {question.alternatives.map((alt, index) => {
            const letter = String.fromCharCode(97 + index)
            const isSelected = selectedAlternative === alt.id

            return (
              <button
                key={alt.id}
                onClick={() => setSelectedAlternative(alt.id)}
                className={cn(
                  "flex items-center gap-4 text-sm transition-all duration-200 text-left group/alt",
                  isSelected ? "text-accent" : "text-[#999999] hover:text-[#CCCCCC]"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold transition-all duration-200",
                  isSelected ? "bg-accent border-accent text-black" : "border-[#333333] group-hover/alt:border-accent/50"
                )}>
                  {letter.toUpperCase()}
                </span>
                <span className="flex-1 font-medium">
                  <MathText text={alt.text} />
                </span>
              </button>
            )
          })}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (isAdded) {
                removeQuestion(question.id)
              } else {
                addQuestion(question)
              }
            }}
            className={cn(
              "transition-all duration-300 rounded-md font-semibold text-xs py-5 px-6 gap-2",
              isAdded
                ? "border-accent text-accent bg-accent/10 hover:bg-accent/20"
                : "border-accent text-accent hover:bg-accent hover:text-black"
            )}
          >
            {isAdded ? <Check size={14} /> : <Bookmark size={14} />}
            {isAdded ? 'ADICIONADA' : 'ADICIONAR À LISTA'}
          </Button>
          <Button variant="outline" className="border-[#333333] text-[#999999] hover:bg-[#222222] hover:text-white transition-all duration-300 rounded-md font-semibold text-xs py-5 px-6 gap-2">
            <BarChart2 size={14} />
            VER GRÁFICO
          </Button>
          {question.videoUrl && (
            <a
              href={question.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-2 border border-red-500/40 text-red-400',
                'hover:bg-red-500/10 transition-all duration-200 rounded-md font-semibold text-xs py-5 px-6'
              )}
              title={question.videoTitulo ?? 'Ver correção em vídeo'}
            >
              <PlayCircle size={14} />
              {question.videoProfessor ? `VER COM ${question.videoProfessor.toUpperCase().slice(0, 20)}` : 'VER CORREÇÃO'}
              <ExternalLink size={10} className="opacity-50" />
            </a>
          )}
          <Button className="bg-accent text-white hover:bg-[#E55A2B] transition-all duration-300 rounded-md font-semibold text-xs py-5 px-8 ml-auto">
            RESPONDER
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
