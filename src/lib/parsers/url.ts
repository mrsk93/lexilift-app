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
