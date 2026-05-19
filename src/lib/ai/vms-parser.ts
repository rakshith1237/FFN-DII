import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const FieldResultSchema = z.object({
  value:      z.string().nullable(),
  confidence: z.number().min(0).max(1),
})
const VmsParseSchema = z.object({
  requisition_id:   FieldResultSchema,
  job_title:        FieldResultSchema,
  description:      FieldResultSchema,
  business_unit:    FieldResultSchema,
  location_city:    FieldResultSchema,
  location_state:   FieldResultSchema,
  location_country: FieldResultSchema,
  work_type:        FieldResultSchema,
  start_date:       FieldResultSchema,
  end_date:         FieldResultSchema,
  bill_rate:        FieldResultSchema,
  skills:           FieldResultSchema,
  headcount:        FieldResultSchema,
  priority:         FieldResultSchema,
})
type VmsParseResult = z.infer<typeof VmsParseSchema>

const SYSTEM_PROMPT = `You are a VMS (Vendor Management System) email parser for a staffing platform.
Extract exactly these 14 fields from the email body provided.
Return ONLY a valid JSON object — no preamble, no markdown, no explanation.

Fields to extract:
- requisition_id: the job or requisition ID/number
- job_title: the position title
- description: full job description or summary
- business_unit: department or business unit name
- location_city: city of work location
- location_state: state or province
- location_country: country
- work_type: one of: onsite, remote, hybrid
- start_date: ISO8601 date string (YYYY-MM-DD) or null
- end_date: ISO8601 date string (YYYY-MM-DD) or null
- bill_rate: numeric bill rate as string (e.g. "85.00") or null
- skills: comma-separated list of required skills
- headcount: number of positions as string (e.g. "1") or null
- priority: one of: high, medium, low, or null

For each field return: { "value": <extracted value or null>, "confidence": <0.0 to 1.0> }
confidence 1.0 = explicitly stated. 0.5 = inferred. 0.0 = not found.

Return format:
{
  "job_title": { "value": "ServiceNow Developer", "confidence": 0.99 },
  ... all 14 fields ...
}`

export async function parseVmsEmail(inboxId: string, tenantId: string): Promise<void> {
  // Fetch the inbox record
  const { data: record, error: fetchError } = await supabaseAdmin
    .from('x_ffn_vms_inbox')
    .select('id, raw_body, parse_status')
    .eq('id', inboxId)
    .single()
  if (fetchError || !record) {
    console.error('[FFN][vms-parser] Record not found:', inboxId)
    return
  }
  if (record.parse_status !== 'pending') {
    console.error('[FFN][vms-parser] Record not in pending state:', record.parse_status)
    return
  }

  // Call Claude API
  let parsed: VmsParseResult
  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: record.raw_body }],
    })
    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response')
    const rawJson = textBlock.text.trim().replace(/^```json\n?|```$/g, '')
    parsed = VmsParseSchema.parse(JSON.parse(rawJson))
  } catch (parseError) {
    console.error('[FFN][vms-parser] Parse failed:', (parseError as Error).message)
    await supabaseAdmin.from('x_ffn_vms_inbox').update({
      parse_status: 'failed',
      parse_error:  (parseError as Error).message,
    }).eq('id', inboxId)
    return
  }

  // Mode detection
  const MANDATORY = ['job_title', 'start_date', 'location_city', 'skills', 'work_type'] as const
  const lowConfidenceCount = MANDATORY.filter(field => {
    const f = parsed[field]
    return !f.value || f.confidence < 0.80
  }).length

  const MODE_D_THRESHOLD = 3
  const vmsMode: 'A' | 'C' = lowConfidenceCount >= MODE_D_THRESHOLD ? 'C' : 'A'
  const newStatus = vmsMode === 'C' ? 'manual' : 'parsed'

  // Build confidence map and average
  const confidenceMap: Record<string, number> = {}
  let totalConfidence = 0
  for (const [key, val] of Object.entries(parsed)) {
    confidenceMap[key] = val.confidence
    totalConfidence += val.confidence
  }
  const avgConfidence = totalConfidence / 14

  // Update inbox record
  await supabaseAdmin.from('x_ffn_vms_inbox').update({
    extracted_data:   parsed,
    confidence_map:   confidenceMap,
    parse_status:     newStatus,
    parse_confidence: avgConfidence,
    vms_mode:         vmsMode,
    parsed_at:        new Date().toISOString(),
  }).eq('id', inboxId)

  console.info(`[FFN][vms-parser] Parsed ${inboxId} → status=${newStatus} mode=${vmsMode} avgConf=${avgConfidence.toFixed(2)}`)
}
