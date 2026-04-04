"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Link from "next/link"

gsap.registerPlugin(ScrollTrigger)

const hubItems = [
  {
    title: "Banco de Questões",
    category: "01 / Exploração",
    description: "Milhares de questões processadas por IA com filtros avançados.",
    href: "/app/banco-questoes",
    span: "col-span-2 row-span-2",
    id: "01"
  },
  {
    title: "Minha Lista",
    category: "02 / Personalização",
    description: "Sua coleção privada de questões para estudo focado.",
    href: "/app/minha-lista",
    span: "col-span-1 row-span-1",
    id: "02"
  },
  {
    title: "Vocalab",
    category: "03 / Integração",
    description: "Ferramentas externas integradas para expansão de conhecimento.",
    href: "/app/vocalab",
    span: "col-span-1 row-span-2",
    id: "03"
  },
  {
    title: "Dashboard",
    category: "04 / Analytics",
    description: "Acompanhe sua evolução com gráficos e estatísticas detalhadas.",
    href: "/app/dashboard",
    span: "col-span-1 row-span-1",
    id: "04"
  },
  {
    title: "Admin",
    category: "05 / Gestão",
    description: "Painel administrativo para upload e configuração de IA.",
    href: "/admin",
    span: "col-span-2 row-span-1",
    id: "05"
  },
]

export function HubSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !gridRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      )

      const cards = gridRef.current?.querySelectorAll("article")
      if (cards && cards.length > 0) {
        gsap.set(cards, { y: 60, opacity: 0 })
        gsap.to(cards, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="hub" className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12 bg-background">
      {/* Section header */}
      <div ref={headerRef} className="mb-16 flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">02 / Platform Hub</span>
          <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight text-foreground">CENTRAL DE ACESSO</h2>
        </div>
        <p className="hidden md:block max-w-xs font-mono text-xs text-muted-foreground text-right leading-relaxed">
          Navegue pelas seções principais da plataforma Derelict e gerencie seus estudos.
        </p>
      </div>

      {/* Asymmetric grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px] md:auto-rows-[200px]"
      >
        {hubItems.map((item, index) => (
          <Link key={index} href={item.href} className={item.span}>
            <article
              className={cn(
                "group relative border border-border/40 p-5 flex flex-col justify-between h-full transition-all duration-500 cursor-pointer overflow-hidden hover:border-accent/60",
              )}
            >
              {/* Background layer */}
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="relative z-10">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {item.category}
                </span>
                <h3 className="mt-3 font-[var(--font-bebas)] text-2xl md:text-4xl tracking-tight transition-colors duration-300 group-hover:text-accent text-foreground">
                  {item.title}
                </h3>
              </div>

              {/* Description & ID */}
              <div className="relative z-10 flex items-end justify-between">
                <p className="font-mono text-xs text-muted-foreground leading-relaxed transition-all duration-500 max-w-[280px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                  {item.description}
                </p>
                <span className="font-mono text-[10px] text-accent/40 font-bold">{item.id}</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}
