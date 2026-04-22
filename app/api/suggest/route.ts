import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

/**
 * POST /api/suggest
 * 
 * Generates exactly 3 context-aware suggestions from recent transcript.
 * Uses GPT-OSS 120B with reasoning disabled for faster, cleaner JSON output.
 */
export async function POST(request: NextRequest) {
  try {
    const { transcript, prompt, apiKey } = await request.json()

    if (!transcript || !prompt || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const groq = new Groq({ apiKey })

    const finalPrompt = prompt.replace('{transcript}', transcript)

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      max_tokens: 1024,
      // @ts-ignore — Groq SDK types may not include this yet
      include_reasoning: false,  // Disable reasoning to get clean JSON output
    } as any)

    // GPT-OSS 120B returns content in choices[0].message.content
    const responseText = completion.choices[0]?.message?.content || ''

    if (!responseText.trim()) {
      console.error('Empty response from GPT-OSS 120B')
      return NextResponse.json(
        { error: 'Empty response from model' },
        { status: 500 }
      )
    }

    try {
      const suggestions = extractJSON(responseText)

      if (!suggestions || !Array.isArray(suggestions) || suggestions.length < 3) {
        console.error('Invalid suggestions format:', responseText)
        return NextResponse.json(
          { error: 'Invalid suggestions format', raw: responseText },
          { status: 500 }
        )
      }

      // Take first 3 and validate structure
      const validated = suggestions.slice(0, 3).map(s => ({
        type: String(s.type || 'TALKING_POINT').toUpperCase().replace(/\s+/g, '_'),
        title: String(s.title || 'Suggestion'),
        preview: String(s.preview || ''),
      }))

      return NextResponse.json({ suggestions: validated })
    } catch (parseError) {
      console.error('Failed to parse suggestions:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse suggestions', raw: responseText },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Suggestion error:', error)
    return NextResponse.json(
      { error: error.message || 'Suggestion generation failed' },
      { status: 500 }
    )
  }
}

/**
 * Extracts a JSON array from model output that may contain
 * markdown code blocks, reasoning text, or other wrapping.
 */
function extractJSON(text: string): any[] | null {
  // Method 1: Direct parse
  try {
    const parsed = JSON.parse(text.trim())
    if (Array.isArray(parsed)) return parsed
  } catch {}

  // Method 2: Remove markdown code blocks
  try {
    let cleaned = text.trim()
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const parsed = JSON.parse(cleaned.trim())
    if (Array.isArray(parsed)) return parsed
  } catch {}

  // Method 3: Find JSON array using bracket matching
  try {
    const firstBracket = text.indexOf('[')
    const lastBracket = text.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const jsonStr = text.substring(firstBracket, lastBracket + 1)
      const parsed = JSON.parse(jsonStr)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}

  // Method 4: Find individual JSON objects with required fields
  try {
    const matches = text.match(/\{[^{}]*"type"[^{}]*"title"[^{}]*"preview"[^{}]*\}/g)
    if (matches && matches.length >= 3) {
      return matches.slice(0, 3).map(m => JSON.parse(m))
    }
  } catch {}

  return null
}
