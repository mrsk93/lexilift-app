import { NextResponse } from 'next/server'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getLLM } from '@/lib/llm/registry'
import { retrieveContext, buildContextPrompt } from '@/lib/langchain/rag-chain'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { db } from '@/lib/db/client'
import { chatMessages } from '@/lib/db/schema'
import { assertOrgPlanLimit } from '@/lib/billing/assertOrgPlanLimit'
import { incrementUsage } from '@/lib/billing/usage'

type ChatRole = 'system' | 'user' | 'assistant'

type IncomingMessage = {
  role?: string
  content?: string
  parts?: Array<{ type?: string; text?: string }>
}

function extractText(msg: IncomingMessage | undefined): string {
  if (!msg) return ''
  if (typeof msg.content === 'string' && msg.content.length > 0) return msg.content
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p?.type === 'text')
      .map((p) => p.text ?? '')
      .join('')
  }
  return ''
}

export async function POST(req: Request) {
  try {
    await requireAuth()
    const { messages, orgId, sessionId, modelName = 'gpt-4o' } = await req.json()

    if (!messages || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await requireOrgAccess(orgId)

    try {
      await assertOrgPlanLimit(orgId, 'queries')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Query limit reached'
      return NextResponse.json({ error: message }, { status: 402 })
    }

    const lastMessage = messages[messages.length - 1] as IncomingMessage
    const userQuery = extractText(lastMessage)

    const contextItems = await retrieveContext(userQuery, orgId)
    const enrichedPrompt = buildContextPrompt(userQuery, contextItems)

    const llmMessages: Array<{ role: ChatRole; content: string }> = [
      { role: 'system', content: 'You are a helpful, professional AI assistant for LexiLift.' },
      // Prepend a synthetic greeting turn. AI SDK v6's streamText produces
      // empty/useless responses when the messages array contains only
      // (system, user) with no prior conversation. By always starting the
      // LLM thread with a benign 'Hi' exchange, the model responds normally.
      // The 'previous turns' from the real chat follow below.
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! How can I help you today?' },
      ...messages.slice(0, -1).map((m: IncomingMessage) => ({
        role: ((m.role as ChatRole) ?? 'user'),
        content: extractText(m),
      })),
      { role: 'user', content: enrichedPrompt },
    ]

    const llm = getLLM(modelName)
    const startedAt = Date.now()
    const textId = crypto.randomUUID()
    let fullText = ''
    let totalTokens: number | null = null

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: 'text-start', id: textId })
        try {
          for await (const chunk of llm.stream(llmMessages)) {
            if (req.signal?.aborted) break
            if (chunk.type === 'text') {
              fullText += chunk.text
              writer.write({ type: 'text-delta', id: textId, delta: chunk.text })
            } else if (chunk.type === 'finish') {
              totalTokens = chunk.totalTokens ?? null
            }
          }
        } finally {
          writer.write({ type: 'text-end', id: textId })
        }
      },
      onFinish: async () => {
        if (!sessionId) return
        try {
          await db.insert(chatMessages).values([
            { sessionId, role: 'user', content: userQuery },
            {
              sessionId,
              role: 'assistant',
              content: fullText,
              citations: contextItems.map((c, i) => ({
                index: i + 1,
                docId: c.metadata?.docId ?? null,
                docName: c.metadata?.docName ?? c.metadata?.name ?? null,
                pageNum: c.metadata?.pageNum ?? null,
                excerpt: (c.text ?? '').slice(0, 280),
                score: c.score ?? null,
              })),
              tokensUsed: totalTokens,
              latencyMs: Date.now() - startedAt,
            },
          ])
        } catch (e) {
          console.error('Failed to save chat history', e)
        }
        try {
          await incrementUsage(orgId)
        } catch (e) {
          console.error('Usage increment failed', e)
        }
      },
    })

    return createUIMessageStreamResponse({
      stream,
      headers: {
        'x-citations': JSON.stringify(contextItems.map((c) => c.metadata?.docId)),
      },
    })
  } catch (error) {
    console.error('Query API Error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json(
      { error: message },
      { status: message === 'Forbidden' ? 403 : 500 }
    )
  }
}
