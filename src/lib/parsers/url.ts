import * as cheerio from 'cheerio'

export async function parseUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }
    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove scripts, styles, etc.
    $('script, style, nav, footer, header').remove()

    return $('body').text().replace(/\s+/g, ' ').trim()
  } catch (error) {
    console.error('Error parsing URL:', error)
    throw new Error('Failed to parse URL.')
  }
}

export interface UrlFetchResult {
  title: string
  text: string
  url: string
}

const MAX_BYTES = 5 * 1024 * 1024
const TIMEOUT_MS = 15_000

export async function fetchAndParseUrl(input: string): Promise<UrlFetchResult> {
  let u: URL
  try {
    u = new URL(input)
  } catch {
    throw new Error('UNSUPPORTED_PROTOCOL')
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error('UNSUPPORTED_PROTOCOL')
  }

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'LexiLiftBot/1.0' },
    })
  } finally {
    clearTimeout(t)
  }

  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`)
  }
  const contentLength = Number(res.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BYTES) {
    throw new Error('TOO_LARGE')
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  $('script, style, noscript, header, footer, nav, aside').remove()
  const title = $('title').first().text().trim() || u.hostname
  const text = ($('body').text() ?? '').replace(/\s+/g, ' ').trim()

  return { title, text, url: u.toString() }
}
