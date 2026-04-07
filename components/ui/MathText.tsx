'use client'

import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  text: string
  className?: string
}

export function MathText({ text, className }: MathTextProps) {
  if (!text) return null

  // Dividir o texto em partes: texto normal e fórmulas
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <BlockMath key={i} math={part.slice(2, -2)} />
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={i} math={part.slice(1, -1)} />
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
