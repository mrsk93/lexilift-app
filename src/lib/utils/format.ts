/**
 * Locale-stable date formatters. Use these in SSR/CSR shared components to
 * avoid hydration mismatches caused by different server/client default locales.
 *
 * Server: en-US (fixed)
 * Client: en-US (fixed) — no `toLocaleString`/`toLocaleDateString` without args.
 */

const DEFAULT_LOCALE = 'en-US'

export function formatDate(input: string | Date | null | undefined, fallback = '—'): string {
  if (!input) return fallback
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDateTime(input: string | Date | null | undefined, fallback = '—'): string {
  if (!input) return fallback
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

export function formatNumber(value: number, opts?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(DEFAULT_LOCALE, opts)
}
