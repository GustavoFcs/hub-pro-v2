"use client"

import React from 'react'
import { QuestionCard } from '@/components/QuestionCard'
import { QuestionFilter } from '@/components/QuestionFilter'

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
    ]
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
    ]
  }
]

export default function BancoQuestoesPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
        📚 BANCO DE QUESTÕES
      </h1>
      
      <QuestionFilter />

      <div className="flex flex-col gap-6">
        {mockQuestions.map(question => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </div>
    </div>
  )
}
