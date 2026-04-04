"use client"

import React, { useState } from 'react'
import { UploadCloud, FileType, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export default function UploadProvaPage() {
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert("Por favor, envie apenas arquivos PDF.")
      return
    }
    setUploadedFile(file)
    simulateUpload()
  }

  const simulateUpload = () => {
    setIsUploading(true)
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight uppercase">UPLOAD DE PROVA</h1>
        <p className="text-[#999999] text-sm font-mono tracking-widest">ENVIE UM PDF PARA PROCESSAMENTO COM IA</p>
      </div>

      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-24 transition-all duration-300 flex flex-col items-center justify-center gap-6",
          dragActive 
            ? "border-accent bg-accent/5 scale-[1.01]" 
            : "border-accent/30 bg-[#111111] hover:border-accent/60"
        )}
      >
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
          <UploadCloud className="text-accent" size={32} />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">Arraste seu PDF aqui</h3>
          <p className="text-[#999999] text-sm">Ou clique para selecionar o arquivo no seu computador</p>
        </div>

        <input 
          type="file" 
          id="file-upload" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          accept=".pdf"
          onChange={handleFileChange}
        />

        <Button className="bg-accent text-white hover:bg-[#E55A2B] px-8 py-6 rounded-md font-bold text-xs uppercase tracking-widest gap-2">
          SELECIONAR ARQUIVO
        </Button>
      </div>

      {isUploading && (
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-accent/20 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
              <FileType size={16} className="text-accent" />
              PROCESSANDO: {uploadedFile?.name}
            </span>
            <span className="text-accent font-mono">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2 bg-black" />
          <p className="text-[#999999] text-[10px] font-mono uppercase tracking-widest text-center animate-pulse">
            A IA está extraindo as questões... por favor aguarde
          </p>
        </div>
      )}

      {uploadedFile && !isUploading && (
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-green-500/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <CheckCircle className="text-green-500" size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold uppercase tracking-widest text-sm">Upload concluído</h4>
              <p className="text-[#999999] text-xs font-mono">{uploadedFile.name} — 24 questões extraídas</p>
            </div>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-black font-bold text-xs uppercase tracking-widest rounded-md px-6 py-5">
            REVISAR QUESTÕES
          </Button>
        </div>
      )}
    </div>
  )
}
