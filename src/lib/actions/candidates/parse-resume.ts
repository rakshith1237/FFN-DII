'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { PDFParse } from 'pdf-parse'
import { extractRawText as mammothExtractRawText } from 'mammoth'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const CertSchema = z.object({
  name:   z.string(),
  issuer: z.string().optional(),
})

const ExperienceSchema = z.object({
  employer:    z.string(),
  role:        z.string(),
  start_date:  z.string().nullable().optional(),
  end_date:    z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

const ParsedResumeSchema = z.object({
  full_name:      z.string().optional(),
  email:          z.string().optional(),
  phone:          z.string().optional(),
  skills:         z.array(z.string()).default([]),
  certifications: z.array(CertSchema).default([]),
  experience:     z.array(ExperienceSchema).default([]),
})

export type ParsedResume = z.infer<typeof ParsedResumeSchema>

export type ParseResumeState = {
  error?:   string
  success?: boolean
  data?:    ParsedResume
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80)
}

export async function parseResume(
  storagePath: string,
  candidateId: string
): Promise<ParseResumeState> {
  await requirePersona(['a_recruiter', 'a_recruiting_manager'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('tenant-assets')
    .download(storagePath)

  if (downloadError || !fileData) {
    return { error: 'Failed to download resume from storage.' }
  }

  const isPdf = storagePath.endsWith('.pdf')
  let rawText = ''

  try {
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    if (isPdf) {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      const result = await parser.getText()
      rawText      = result.text
    } else {
      const result = await mammothExtractRawText({ buffer })
      rawText      = result.value
    }
  } catch (err) {
    return { error: `Failed to extract text: ${(err as Error).message}` }
  }

  if (!rawText.trim()) return { error: 'Resume appears to be empty or unreadable.' }

  // Truncate to avoid token limits
  const truncated = rawText.slice(0, 12000)

  // Call Claude API
  let parsed: ParsedResume
  try {
    const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })
    const response  = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a resume parser. Extract structured data from the resume text.
Return ONLY a valid JSON object — no markdown, no preamble, no explanation.
Format:
{
  "full_name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "skills": ["skill1", "skill2"],
  "certifications": [{"name": "string", "issuer": "string or null"}],
  "experience": [{"employer": "string", "role": "string", "start_date": "YYYY-MM or null", "end_date": "YYYY-MM or null", "description": "string or null"}]
}`,
      messages: [{ role: 'user', content: truncated }],
    })

    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text in response')
    const cleaned = block.text.trim().replace(/^```json\n?|```$/g, '')
    parsed = ParsedResumeSchema.parse(JSON.parse(cleaned))
  } catch (err) {
    return { error: `Resume parsing failed: ${(err as Error).message}` }
  }

  // Upsert skills into x_ffn_skill_taxonomy (grow organically)
  for (const skillName of parsed.skills) {
    const code = slugify(skillName)
    if (!code) continue
    await supabaseAdmin
      .from('x_ffn_skill_taxonomy')
      .upsert(
        {
          code,
          name:       skillName,
          category:   'technical',
          is_active:  true,
          sort_order: 0,
        },
        { onConflict: 'code', ignoreDuplicates: true }
      )
  }

  // Mark candidate as parsed
  await supabaseAdmin
    .from('x_ffn_candidate')
    .update({ resume_parsed_at: new Date().toISOString() })
    .eq('id', candidateId)
    .eq('tenant_id', tenantId)

  return { success: true, data: parsed }
}
