export async function parsePdf(buffer: Buffer): Promise<string> {
  // Side-effect import: polyfills globalThis.DOMMatrix before pdf-parse
  // (and its transitive pdfjs-dist) evaluates on first use. This must
  // run before the dynamic import of pdf-parse below.
  await import('./dommatrix-shim')
  const { PDFParse } = await import('pdf-parse')

  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result.text ?? ''
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to parse PDF file.')
  } finally {
    await parser.destroy().catch(() => {})
  }
}
