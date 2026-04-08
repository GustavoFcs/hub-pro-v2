"use client"

import React from 'react'
import { AdminSidebar } from '@/components/AdminSidebar'
import { SimuladoFloatingBar } from '@/components/simulado/SimuladoFloatingBar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-12 bg-background min-h-screen">
        <div className="max-w-[1200px] mx-auto animate-in fade-in slide-in-from-left-4 duration-500">
          {children}
        </div>
      </main>
      <SimuladoFloatingBar />
    </div>
  )
}
