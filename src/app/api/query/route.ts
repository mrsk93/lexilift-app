import { NextResponse } from 'next/server'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getLLM } from '@/lib/adapters/llm'
import { retrieveContext, buildContextPrompt } from '@/lib/langchain/rag-chain'
import { streamText } from 'ai'
import { db } from '@/lib/db/client'
import { chatMessages, chatSessions } from '@/lib/db/schema'

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    const { messages, orgId, sessionId, modelName = 'gpt-4o' } = await req.json()

    if (!messages || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await requireOrgAccess(orgId)

    // Get latest user message
    const lastMessage = messages[messages.length - 1]
    const userQuery = lastMessage.content

    // Retrieve context
    const contextItems = await retrieveContext(userQuery, orgId)
    
    // Replace the last message content with the enriched prompt (only for the LLM)
    const enrichedPrompt = buildContextPrompt(userQuery, contextItems)
    const llmMessages = [...messages]
    llmMessages[llmMessages.length - 1] = { ...lastMessage, content: enrichedPrompt }

    // Stream response
    const model = getLLM(modelName)
    
    const result = streamText({
      model,
      messages: llmMessages,
      system: 'You are a helpful, professional AI assistant for LexiLift.',
      onFinish: async ({ text }) => {
        // Save to DB in background
        if (sessionId) {
          try {
            await db.insert(chatMessages).values([
              {
                sessionId,
                role: 'user',
                content: userQuery,
              },
              {
                sessionId,
                role: 'assistant',
                content: text,
                metadata: { citations: contextItems }
              }
            ])
          } catch (e) {
            console.error('Failed to save chat history', e)
          }
        }
      }
    })

    return result.toDataStreamResponse({
      headers: {
        'x-citations': JSON.stringify(contextItems.map(c => c.metadata?.docId))
      }
    })

  } catch (error: any) {
    console.error('Query API Error:', error)
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
