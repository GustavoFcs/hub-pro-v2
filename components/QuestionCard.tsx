"use client"

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Bookmark, BarChart2, CheckCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Alternative {
  id: string
  text: string
}

interface Question {
  id: string
  topic: string
  subtopic: string
  difficulty: 'Fácil' | 'Médio' | 'Difícil'
  year: number
  text: string
  alternatives: Alternative[]
}

export function QuestionCard({ question }: { question: Question }) {
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null)

  return (
    <Card className="bg-[#1a1a1a] border-accent/40 hover:border-accent transition-all duration-300 rounded-[12px] p-6 mb-4 group shadow-lg">
      <CardHeader className="p-0 mb-4 flex flex-row items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors duration-200">
            Questão #{question.id} — {question.subtopic}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#999999] uppercase tracking-widest">
              {question.topic} | {question.year}
            </span>
          </div>
        </div>
        <Badge className="bg-accent/20 border border-accent text-accent px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          {question.difficulty}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <p className="text-[15px] text-[#CCCCCC] leading-relaxed mb-6 font-medium">
          {question.text}
        </p>

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
                <span className="flex-1 font-medium">{alt.text}</span>
              </button>
            )
          })}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-black transition-all duration-300 rounded-md font-semibold text-xs py-5 px-6 gap-2">
            <Bookmark size={14} />
            ADICIONAR À LISTA
          </Button>
          <Button variant="outline" className="border-[#333333] text-[#999999] hover:bg-[#222222] hover:text-white transition-all duration-300 rounded-md font-semibold text-xs py-5 px-6 gap-2">
            <BarChart2 size={14} />
            VER GRÁFICO
          </Button>
          <Button className="bg-accent text-white hover:bg-[#E55A2B] transition-all duration-300 rounded-md font-semibold text-xs py-5 px-8 ml-auto">
            RESPONDER
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
