import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { widgetTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { retrieveContext, buildContextPrompt } from '@/lib/langchain/rag-chain'
import { getLLM } from '@/lib/adapters/llm'
import { streamText } from 'ai'

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || ''
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    const tokens = await db.select().from(widgetTokens).where(eq(widgetTokens.token, token)).limit(1)
    const widgetConfig = tokens[0]

    if (!widgetConfig || !widgetConfig.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive token' }, { status: 401 })
    }

    // CORS check
    if (widgetConfig.allowedOrigins && widgetConfig.allowedOrigins.length > 0) {
      if (!widgetConfig.allowedOrigins.includes('*') && !widgetConfig.allowedOrigins.includes(origin)) {
        return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
      }
    }

    const { messages, sessionId } = await req.json()
    const lastMessage = messages[messages.length - 1]
    const userQuery = lastMessage.content

    // Retrieve context for org
    const contextItems = await retrieveContext(userQuery, widgetConfig.orgId!)
    const enrichedPrompt = buildContextPrompt(userQuery, contextItems)
    
    const llmMessages = [...messages]
    llmMessages[llmMessages.length - 1] = { ...lastMessage, content: enrichedPrompt }

    const model = getLLM() // We could allow configuring this in widgetSettings too

    const result = streamText({
      model,
      messages: llmMessages,
      system: 'You are a helpful customer support assistant for LexiLift.',
    })

    return result.toDataStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'x-citations': JSON.stringify(contextItems.map(c => c.metadata?.docId))
      }
    })
  } catch (error: any) {
    console.error('Widget API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
