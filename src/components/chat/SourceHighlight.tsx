export function SourceHighlight({
  text,
  query,
  maxLength = 280,
}: {
  text: string
  query?: string
  maxLength?: number
}) {
  const truncated =
    text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '\u2026' : text

  if (!query || !query.trim()) {
    return (
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{truncated}</p>
    )
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = truncated.split(re)

  return (
    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-amber-100 text-foreground rounded px-0.5"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  )
}
