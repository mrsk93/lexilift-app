'use client'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface DocFilter {
  status?: string
  fileType?: string
}

const STATUS_OPTIONS = [
  { value: 'ready', label: 'Ready' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
] as const

export function DocumentFilters({
  value,
  onChange,
  availableFileTypes,
}: {
  value: DocFilter
  onChange: (f: DocFilter) => void
  availableFileTypes: string[]
}) {
  const isActive = !!(value.status || value.fileType)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filter by status"
        value={value.status ?? ''}
        onChange={(e) => onChange({ ...value, status: e.target.value || undefined })}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by file type"
        value={value.fileType ?? ''}
        onChange={(e) => onChange({ ...value, fileType: e.target.value || undefined })}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All file types</option>
        {availableFileTypes.map((t) => (
          <option key={t} value={t}>
            {t.toUpperCase()}
          </option>
        ))}
      </select>

      {isActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="h-9 px-2 text-muted-foreground"
        >
          <X className="w-3 h-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
