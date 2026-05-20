import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPTS: Record<string, string> = {
  improve:
    'You are a professional job description writer. Improve the following job description to be compelling, clear, and professional. Return ONLY the improved text in clean HTML (use <p>, <ul>, <li>, <strong> tags only). No preamble.',
  add_keywords:
    'You are an ATS optimisation expert. Add relevant technical keywords and skills to the following job description. Return ONLY the enhanced text in clean HTML. No preamble.',
  tighten:
    'You are a technical editor. Tighten the following job description: remove redundancy, improve clarity, make it concise. Return ONLY the edited text in clean HTML. No preamble.',
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { action: string; content: string }
  try {
    body = await request.json() as { action: string; content: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, content } = body
  if (!action || !content) return NextResponse.json({ error: 'action and content required' }, { status: 400 })

  const systemPrompt = SYSTEM_PROMPTS[action]
  if (!systemPrompt) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })

  try {
    const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: 'user', content }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    return NextResponse.json({ result: textBlock.text.trim() })
  } catch (err) {
    console.error('[FFN][smart-write]', (err as Error).message)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
