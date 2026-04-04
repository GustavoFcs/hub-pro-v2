"use client"

import React from 'react'
import { AdminSidebar } from '@/components/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-12 bg-[#0a0a0a] min-h-screen">
        <div className="max-w-[1200px] mx-auto animate-in fade-in slide-in-from-left-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
