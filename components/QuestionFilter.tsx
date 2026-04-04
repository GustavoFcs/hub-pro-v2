"use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export function QuestionFilter() {
  return (
    <div className="bg-[#1a1a1a] p-6 rounded-[12px] border border-accent/30 mb-8 shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Matéria */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-accent uppercase tracking-widest ml-1">Matéria</label>
          <Select>
            <SelectTrigger className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent transition-all duration-200 h-11 rounded-md">
              <SelectValue placeholder="Todas as matérias" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-accent text-white">
              <SelectItem value="matematica">Matemática</SelectItem>
              <SelectItem value="fisica">Física</SelectItem>
              <SelectItem value="quimica">Química</SelectItem>
              <SelectItem value="biologia">Biologia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subtópico */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-accent uppercase tracking-widest ml-1">Subtópico</label>
          <Select>
            <SelectTrigger className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent transition-all duration-200 h-11 rounded-md">
              <SelectValue placeholder="Todos os subtópicos" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-accent text-white">
              <SelectItem value="funcoes">Funções</SelectItem>
              <SelectItem value="geometria">Geometria</SelectItem>
              <SelectItem value="trigonometria">Trigonometria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dificuldade */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-accent uppercase tracking-widest ml-1">Dificuldade</label>
          <Select>
            <SelectTrigger className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent transition-all duration-200 h-11 rounded-md">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-accent text-white">
              <SelectItem value="facil">Fácil</SelectItem>
              <SelectItem value="medio">Médio</SelectItem>
              <SelectItem value="dificil">Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ano */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-accent uppercase tracking-widest ml-1">Ano</label>
          <Select>
            <SelectTrigger className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent transition-all duration-200 h-11 rounded-md">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-accent text-white">
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-accent uppercase tracking-widest ml-1">Palavra-chave</label>
          <Input 
            placeholder="Pesquisar questões..." 
            className="bg-[#0a0a0a] border-[#333333] text-white focus:border-accent h-11 rounded-md"
          />
        </div>
        <Button className="bg-accent text-white hover:bg-[#E55A2B] h-11 px-8 rounded-md font-bold text-xs uppercase tracking-widest gap-2">
          <Search size={16} />
          BUSCAR QUESTÕES
        </Button>
      </div>
    </div>
  )
}
