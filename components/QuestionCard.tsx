"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MathText } from '@/components/ui/MathText'
import { useSimuladoStore } from '@/lib/simulado/store'
import { Bookmark, BookmarkCheck, PlayCircle, ExternalLink, Check, Eye, EyeOff, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const DIFICULDADE_LABEL: Record<string, string> = {
  facil:        'Nivelamento',
  medio:        'Consolidação',
  dificil:      'Aprofundamento',
  muito_dificil: 'Especialização Avançada',
}

const DIFICULDADE_COLOR: Record<string, string> = {
  facil:        'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  medio:        'text-blue-400   border-blue-400/30   bg-blue-400/10',
  dificil:      'text-orange-400 border-orange-400/30 bg-orange-400/10',
  muito_dificil: 'text-red-400    border-red-400/30    bg-red-400/10',
}

function formatTempo(segundos: number | null): string {
  if (!segundos) return ''
  if (segundos < 60)  return `${segundos}s`
  const min = Math.floor(segundos / 60)
  const sec = segundos % 60
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`
}

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
  visualElement?: {
    type: string
    imageUrl?: string | null
    svgContent?: string | null
    description?: string
  } | null
  // Vídeo YouTube
  videoUrl?: string | null
  videoTitulo?: string | null
  videoProfessor?: string | null
  gabarito?: string | null
  anulada?: boolean
  // Frentes e tempo estimado
  frentes?: string[]
  dificuldade?: string
  tempo_estimado_segundos?: number | null
}

export function QuestionCard({
  question,
  questionIndex,
  isSaved: isSavedProp,
  onToggleSave,
}: {
  question: Question
  questionIndex?: number
  isSaved?: boolean
  onToggleSave?: (id: string) => void
}) {
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [answered, setAnswered] = useState(false)

  function handleResponder() {
    if (!selectedAlternative || answered) return
    setAnswered(true)
  }

  const addQuestion    = useSimuladoStore(s => s.addQuestion)
  const removeQuestion = useSimuladoStore(s => s.removeQuestion)
  const hasQuestion    = useSimuladoStore(s => s.hasQuestion)
  const isAdded        = hasQuestion(question.id)

  return (
    <Card className="bg-card border-accent/40 hover:border-accent transition-all duration-300 rounded-[12px] p-4 mb-3 group shadow-lg">
      <CardHeader className="p-0 mb-3 flex flex-row items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold text-foreground group-hover:text-accent transition-colors duration-200">
            Questão {questionIndex ?? 1}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              {question.topic} | {question.year}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border
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
                               bg-card text-muted-foreground border border-border">
                {question.year}
              </span>
            )}
            {question.institution && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase
                               bg-card text-muted-foreground border border-border">
                {question.institution}
              </span>
            )}
            {question.subject && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono
                               bg-accent/10 text-accent border border-accent/20">
                {question.subject}
              </span>
            )}
            {question.dificuldade && (
              <span className={cn(
                'text-[10px] font-mono px-2 py-0.5 rounded border',
                DIFICULDADE_COLOR[question.dificuldade] ?? 'text-muted-foreground border-border bg-card',
              )}>
                {DIFICULDADE_LABEL[question.dificuldade] ?? question.dificuldade}
              </span>
            )}
            {question.tempo_estimado_segundos && (
              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <Clock size={10} />
                {formatTempo(question.tempo_estimado_segundos)}
              </span>
            )}
          </div>
        )}

        {/* Tags de frentes — visíveis apenas quando expandido */}
        {showDetails && question.frentes && question.frentes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {question.frentes.map(frente => (
              <span
                key={frente}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full
                           border border-accent/20 bg-accent/5 text-accent/70"
              >
                {frente}
              </span>
            ))}
          </div>
        )}

        <div className="question-font text-[13px] text-foreground leading-relaxed mb-3 font-medium">
          <MathText text={question.text} />
        </div>

        {/* Elemento visual — crop */}
        {question.visualElement?.type === 'crop' && question.visualElement?.imageUrl && (
          <div className="mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.visualElement.imageUrl}
              alt={question.visualElement.description ?? 'Imagem da questão'}
              className="max-w-full h-auto max-h-56 object-contain rounded-lg border border-border block"
            />
          </div>
        )}

        {/* Elemento visual — SVG reconstruído */}
        {question.visualElement?.type === 'svg' && question.visualElement?.svgContent && (
          <div className="mb-3">
            <div
              className="question-svg-preview rounded-lg border border-border bg-white p-2"
              dangerouslySetInnerHTML={{ __html: question.visualElement.svgContent }}
            />
            <p className="mt-1 text-[10px] text-muted-foreground font-mono italic">
              Imagem reconstruída a partir de referência
              {question.institution ? ` da ${question.institution}` : ''}
              {question.year ? `, ${question.year}` : ''}
            </p>
          </div>
        )}

        {/* Fallback: crop pendente de reconstrução (nunca exposto publicamente) */}
        {question.visualElement?.type === 'crop' &&
         !question.visualElement?.imageUrl &&
         !question.visualElement?.svgContent && (
          <div className="mb-4 p-3 rounded-lg border border-yellow-400/20
                          bg-yellow-400/5 flex items-center gap-2">
            <span className="text-xs text-yellow-400">
              ⚠ Figura pendente de reconstrução
            </span>
          </div>
        )}

        {/* Alternativas */}
        <div className="flex flex-col gap-2 mb-4 ml-2">
          {question.alternatives.map((alt, index) => {
            const letter = String.fromCharCode(97 + index)
            const isSelected = selectedAlternative === alt.id

            // Computed styles based on answered state
            const isGabarito = answered && question.gabarito && alt.id === question.gabarito
            const isWrong    = answered && isSelected && alt.id !== question.gabarito

            return (
              <button
                key={alt.id}
                onClick={() => { if (!answered) setSelectedAlternative(alt.id) }}
                className={cn(
                  "flex items-center gap-3 text-sm transition-all duration-200 text-left",
                  !answered && "group/alt cursor-pointer",
                  answered && "cursor-default",
                  isGabarito ? "text-green-400" :
                  isWrong    ? "text-red-400" :
                  answered   ? "text-muted-foreground opacity-40" :
                  isSelected ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold transition-all duration-200 shrink-0",
                  isGabarito ? "bg-green-500 border-green-500 text-white" :
                  isWrong    ? "bg-red-500 border-red-500 text-white" :
                  answered   ? "border-border opacity-40" :
                  isSelected ? "bg-accent border-accent text-black" : "border-border group-hover/alt:border-accent/50"
                )}>
                  {letter.toUpperCase()}
                </span>
                <span className="flex-1 font-medium question-font text-[13px]">
                  <MathText text={alt.text} />
                </span>
              </button>
            )
          })}
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* YouTube link — esquerda */}
          {question.videoUrl && (
            <a
              href={question.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={question.videoProfessor
                ? `Ver resolução com ${question.videoProfessor}`
                : 'Ver resolução em vídeo'
              }
              className="h-9 px-4 text-xs font-semibold rounded-md inline-flex
                         items-center gap-2 border border-red-500/40 text-red-400
                         hover:bg-red-500/10 transition-all duration-200"
            >
              <PlayCircle size={13} />
              {question.videoProfessor
                ? `VER COM ${question.videoProfessor.toUpperCase().slice(0, 22)}`
                : 'VER CORREÇÃO'
              }
              <ExternalLink size={10} className="opacity-50" />
            </a>
          )}

          <div className="flex-1" />

          {/* Salvar questão (bookmark persistente) */}
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(question.id)}
              title={isSavedProp ? 'Remover dos salvos' : 'Salvar questão'}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-md border transition-all duration-300",
                isSavedProp
                  ? "border-accent text-accent bg-accent/10 hover:bg-accent/20"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent"
              )}
            >
              {isSavedProp ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          )}

          {/* Icon-only add-to-list button */}
          <button
            onClick={() => isAdded ? removeQuestion(question.id) : addQuestion(question)}
            title={isAdded ? 'Remover da lista' : 'Adicionar à lista'}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md border transition-all duration-300",
              isAdded
                ? "border-accent text-accent bg-accent/10 hover:bg-accent/20"
                : "border-accent/40 text-accent/60 hover:border-accent hover:text-accent hover:bg-accent/10"
            )}
          >
            {isAdded ? <Check size={15} /> : <Bookmark size={15} />}
          </button>

          {/* RESPONDER */}
          <Button
            onClick={handleResponder}
            className={cn(
              "h-9 px-4 text-xs font-semibold rounded-md transition-all duration-300",
              answered
                ? selectedAlternative === question.gabarito
                  ? "bg-green-600 text-white cursor-default hover:bg-green-600"
                  : "bg-red-600 text-white cursor-default hover:bg-red-600"
                : "bg-accent text-white hover:bg-accent/80"
            )}
          >
            {answered
              ? question.gabarito
                ? selectedAlternative === question.gabarito
                  ? '✓ Correta!'
                  : `✗ Gabarito: ${question.gabarito.toUpperCase()}`
                : 'Respondida'
              : 'RESPONDER'
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
