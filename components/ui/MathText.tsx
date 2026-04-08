'use client'

import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  text: string
  className?: string
}

// Render a single line (no \n), splitting out math expressions.
// Inline math: $...$  — content must not cross a sentence boundary (no period+space mid-expression).
// Block math:  $$...$$
function renderLine(line: string, keyPrefix: string) {
  const parts = line.split(/(\$\$[^$]+?\$\$|\$[^$\n]+?\$)/g)
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={`${keyPrefix}-${i}`} math={part.slice(2, -2)} />
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={`${keyPrefix}-${i}`} math={part.slice(1, -1)} />
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>
  })
}

export function MathText({ text, className }: MathTextProps) {
  if (!text) return null

  // Split into paragraphs (double newline) then lines (single newline).
  // \n\n → blank line between paragraphs (spacer <br />)
  // \n   → soft line break (<br />)
  const paragraphs = text.split('\n\n')

  return (
    <span className={className}>
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n')
        return (
          <span key={pIdx}>
            {pIdx > 0 && (
              // Paragraph gap
              <><br /><br /></>
            )}
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {lIdx > 0 && <br />}
                {renderLine(line, `${pIdx}-${lIdx}`)}
              </span>
            ))}
          </span>
        )
      })}
    </span>
  )
}
