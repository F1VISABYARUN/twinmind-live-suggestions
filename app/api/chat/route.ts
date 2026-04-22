import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

/**
 * POST /api/chat
 * 
 * Handles suggestion click (detailed answer) and manual user questions.
 * Uses GPT-OSS 120B with reasoning disabled for direct, clean responses.
 */
export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey } = await request.json()

    if (!messages || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: messages,
      temperature: 0.5,
      max_tokens: 1024,
      // @ts-ignore — Groq SDK types may not include this yet
      include_reasoning: false,  // Disable reasoning for direct answers
    } as any)

    const response = completion.choices[0]?.message?.content || ''

    if (!response.trim()) {
      return NextResponse.json(
        { response: 'No response generated. Please try again.' }
      )
    }

    return NextResponse.json({ response })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}
