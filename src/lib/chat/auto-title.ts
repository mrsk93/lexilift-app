const MAX_TITLE_LEN = 60

export function deriveTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'New chat'
  if (cleaned.length <= MAX_TITLE_LEN) return cleaned
  const truncated = cleaned.slice(0, MAX_TITLE_LEN)
  const lastSpace = truncated.lastIndexOf(' ')
  return lastSpace > 30 ? truncated.slice(0, lastSpace) + '…' : truncated + '…'
}
