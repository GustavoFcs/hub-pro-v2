'use client'

import { Moon, Sun } from 'lucide-react'
import { useThemeStore, ACCENT_THEMES, type AccentTheme } from '@/lib/theme/store'

export function ThemeSettings() {
  const { accent, colorMode, setAccent, toggleColorMode } = useThemeStore()

  return (
    <div className="flex flex-col gap-6">

      {/* ── Toggle Dark / Light ─────────────────────────── */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Modo de cor
        </p>

        <button
          onClick={toggleColorMode}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full
                     border border-white/10 bg-white/5
                     hover:bg-white/[0.08] transition-colors"
        >
          <div className={`relative w-11 h-6 rounded-full transition-colors ${
            colorMode === 'light' ? 'bg-accent' : 'bg-white/10'
          }`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              colorMode === 'light' ? 'left-6' : 'left-1'
            }`} />
          </div>

          <div className="flex items-center gap-2">
            {colorMode === 'dark'
              ? <Moon size={14} className="text-accent" />
              : <Sun  size={14} className="text-accent" />
            }
            <span className="text-sm">
              {colorMode === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
            </span>
          </div>
        </button>
      </div>

      {/* ── Seletor de Accent ───────────────────────────── */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Cor de destaque
        </p>

        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(ACCENT_THEMES) as [AccentTheme, typeof ACCENT_THEMES[AccentTheme]][])
            .map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setAccent(key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  accent === key
                    ? 'border-accent bg-accent/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'
                }`}
              >
                <span className={`w-4 h-4 rounded-full shrink-0 ${theme.preview}`} />

                <div className="flex flex-col items-start">
                  <span className={`text-sm font-medium ${
                    accent === key ? 'text-accent' : 'text-foreground'
                  }`}>
                    {theme.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {theme.hex}
                  </span>
                </div>

                {accent === key && (
                  <span className="ml-auto text-[10px] font-mono text-accent border border-accent/30 px-2 py-0.5 rounded">
                    ativo
                  </span>
                )}
              </button>
          ))}
        </div>
      </div>

      {/* ── Preview ao vivo ─────────────────────────────── */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Preview
        </p>

        <div className="p-4 rounded-lg border border-accent/20 bg-white/5">
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent border border-accent/20">
              Matemática
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-muted-foreground border border-white/10">
              IME • 2024
            </span>
          </div>

          <p className="question-font text-sm mb-3 text-foreground">
            Seja f : ℝ → ℝ uma função contínua tal que f(x + y) = f(x) + f(y).
            Determine o valor de f(0).
          </p>

          <div className="flex flex-col gap-1.5">
            {['A) 0', 'B) 1', 'C) f(1)', 'D) Indeterminado'].map((alt, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm question-font border transition-colors ${
                  i === 0
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-white/10 hover:border-accent/30'
                }`}
              >
                {alt}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button className="px-4 py-1.5 rounded text-xs font-medium bg-accent text-black">
              Responder
            </button>
            <button className="px-4 py-1.5 rounded text-xs font-medium border border-white/10 text-muted-foreground">
              Não sei
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
