import type { Metadata } from 'next'

export function seo(opts: { title: string; description: string; path?: string }): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: opts.path ? { canonical: opts.path } : undefined,
    openGraph: {
      title: opts.title,
      description: opts.description,
      type: 'website',
      url: opts.path,
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
    },
  }
}
