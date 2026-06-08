import { FileText } from 'lucide-react'
import { SourceHighlight } from './SourceHighlight'

export function CitationCard({
  index,
  documentName,
  snippet,
  query,
}: {
  index: number
  documentName: string
  snippet: string
  query?: string
}) {
  return (
    <div className="border border-border rounded-lg p-3 bg-muted/30 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 font-medium">
          [{index}]
        </span>
        <FileText className="h-3 w-3" />
        <span className="truncate font-medium text-foreground">
          {documentName || 'Source'}
        </span>
      </div>
      <SourceHighlight text={snippet} query={query} />
    </div>
  )
}
