import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

/**
 * POST /api/transcribe
 * 
 * Converts audio chunks to text using Groq's Whisper Large V3.
 * Called every ~30 seconds with a WebM audio blob from MediaRecorder.
 * 
 * Input: FormData with 'audio' (Blob) and 'apiKey' (string)
 * Output: { text: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob
    const apiKey = formData.get('apiKey') as string

    if (!audioFile || !apiKey) {
      return NextResponse.json(
        { error: 'Missing audio file or API key' },
        { status: 400 }
      )
    }

    const groq = new Groq({ apiKey })

    // Convert Blob to File (Groq SDK expects a File object)
    const file = new File([audioFile], 'audio.webm', { type: 'audio/webm' })

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    )
  }
}
