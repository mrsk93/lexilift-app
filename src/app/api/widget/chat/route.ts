import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { widgetTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { retrieveContext, buildContextPrompt } from '@/lib/langchain/rag-chain'
import { getLLM } from '@/lib/llm/registry'
import { checkLimit } from '@/lib/ratelimit/scopes'

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(req.headers.get('origin') || '*'),
  })
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || ''
    const authHeader = req.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401, headers: corsHeaders(origin) }
      )
    }

    const token = authHeader.split(' ')[1]
    const tokens = await db.select().from(widgetTokens).where(eq(widgetTokens.token, token)).limit(1)
    const widgetConfig = tokens[0]

    if (!widgetConfig?.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive token' },
        { status: 401, headers: corsHeaders(origin) }
      )
    }

    // CORS check
    if (widgetConfig.allowedOrigins?.length && !widgetConfig.allowedOrigins.includes('*') && !widgetConfig.allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403, headers: corsHeaders(origin) }
      )
    }

    const rl = await checkLimit('widgetChat', `token:${token}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'RATE_LIMITED' },
        { status: 429, headers: corsHeaders(origin) }
      )
    }

    const { messages } = await req.json()
    const lastMessage = messages[messages.length - 1]
    const userQuery = lastMessage.content

    // Retrieve context
    const contextItems = await retrieveContext(userQuery, widgetConfig.orgId!)
    const enrichedPrompt = buildContextPrompt(userQuery, contextItems)

    const llmMessages = [...messages]
    llmMessages[llmMessages.length - 1] = { ...lastMessage, content: enrichedPrompt }

    const llm = getLLM()

    // Stream chunks through a ReadableStream (matches new LLM adapter from Task 5)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of llm.stream(llmMessages)) {
            if (chunk.type === 'text') {
              controller.enqueue(encoder.encode(chunk.text))
            }
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...corsHeaders(origin),
        'x-citations': JSON.stringify(contextItems.map(c => c.metadata?.docId)),
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal Server Error'
    console.error('Widget API Error:', e)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders(req.headers.get('origin') || '') }
    )
  }
}
