/**
 * Extract the displayable text from a chat message.
 *
 * AI SDK v6 UIMessage has no `content` field — it has `parts: Array<{ type, text? }>`
 * where each part is a chunk (text, file, tool-call, etc.). v2/v3 used a flat
 * `content: string`. This helper handles both shapes so MessageBubble (and
 * any consumer) doesn't need to know which version produced the message.
 */

type AnyMessage = {
  content?: string
  parts?: Array<{ type?: string; text?: string }>
}

export function getMessageText(message: AnyMessage | null | undefined): string {
  if (!message) return ''

  // v2/v3 shape
  if (typeof message.content === 'string' && message.content.length > 0) {
    return message.content
  }

  // v6 shape: join all text parts
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p?.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('')
  }

  return ''
}
