"use client"

import { useEffect, useRef } from "react"
import { ScrambleTextOnHover } from "@/components/scramble-text"
import { SplitFlapText, SplitFlapMuteToggle, SplitFlapAudioProvider } from "@/components/split-flap-text"
import { AnimatedNoise } from "@/components/animated-noise"
import { BitmapChevron } from "@/components/bitmap-chevron"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

gsap.registerPlugin(ScrollTrigger)

export function LandingPage() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { setAsGuest } = useAuth()

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex items-center pl-6 md:pl-28 pr-6 md:pr-12">
      <AnimatedNoise opacity={0.03} />

      {/* Left vertical labels */}
      <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent -rotate-90 origin-left block whitespace-nowrap">
          DERELICT
        </span>
      </div>

      {/* Main content */}
      <div ref={contentRef} className="flex-1 w-full">
        <SplitFlapAudioProvider>
          <div className="relative">
            <SplitFlapText text="DERELICT" speed={80} />
            <div className="mt-4">
              <SplitFlapMuteToggle />
            </div>
          </div>
        </SplitFlapAudioProvider>

        <h2 className="font-[var(--font-bebas)] text-muted-foreground/60 text-[clamp(1rem,3vw,2rem)] mt-4 tracking-wide">
        Central de Estudos
        </h2>

        <p className="mt-12 max-w-md font-mono text-sm text-muted-foreground leading-relaxed">
          Inventar é imaginar o que ninguém pensou; 
          é acreditar no que ninguém jurou; 
          é arriscar o que ninguém ousou; 
          é realizar o que ninguém tentou. 
          Inventar é transcender. — Alberto Santos Dumont
        </p>

        <div className="mt-16 flex flex-wrap items-center gap-6">
          <Link
            href="/login"
            className="group inline-flex items-center gap-3 border border-accent/60 px-8 py-4 font-mono text-xs uppercase tracking-widest text-white hover:bg-accent hover:text-black transition-all duration-300 rounded-sm"
          >
            <ScrambleTextOnHover text="Fazer Login" as="span" duration={0.6} />
            <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
          </Link>
          
          <button
            className="group inline-flex items-center gap-3 bg-accent/10 border border-accent/20 px-8 py-4 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent/20 transition-all duration-300 rounded-sm"
          >
            <ScrambleTextOnHover text="Criar Conta" as="span" duration={0.6} />
          </button>

          <button
            onClick={setAsGuest}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors duration-200"
          >
            Continuar como Visitante →
          </button>
        </div>
      </div>

      {/* Floating info tag */}
      <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12">
        <div className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          v.2.0 / Derelict System Build
        </div>
      </div>
    </section>
  )
}
