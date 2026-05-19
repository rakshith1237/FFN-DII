'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { type JdDraftInput, type GeoRule, type ScoringCriterion, saveDraftJD } from './save-draft-jd'

// GeoRule and ScoringCriterion are re-exported for consumers of this module
export type { GeoRule, ScoringCriterion }

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })
const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type PublishJdState = {
  error?:        string
  flaggedTerms?: string[]
  success?:      boolean
}

export async function publishJD(input: JdDraftInput): Promise<PublishJdState> {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  // Fetch current JD state
  const { data: jd, error: fetchError } = await supabaseAdmin
    .from('x_ffn_job_description')
    .select('id, status, source, assigned_hm_id, assigned_recruiter_id, vms_inbox_id')
    .eq('id', input.jdId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !jd) return { error: 'JD not found.' }

  // BR-JD-003: Pre-draft (Mode C / source='pre_draft') cannot publish
  if (jd.status === 'pre_draft') {
    return { error: 'This JD requires manual review before it can be published (Mode C). Complete all required fields first.' }
  }

  // Save draft first (persist all edits)
  const saveResult = await saveDraftJD(input)
  if (saveResult.error) return { error: saveResult.error }

  // BR-JD-001: Dual binding check — HM and Recruiter cannot be the same person
  const recruiterId = input.assignedRecruiterId || null
  const hmId        = jd.assigned_hm_id || null
  if (hmId && recruiterId && hmId === recruiterId) {
    return { error: 'BR-JD-001: The Hiring Manager and Recruiter cannot be the same person.' }
  }

  // BR-JD-002: Inclusive language scan via Claude API
  if (input.descriptionHtml.trim()) {
    const plainText = input.descriptionHtml.replace(/<[^>]+>/g, ' ').trim()
    try {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 512,
        system:     `You are an inclusive language reviewer for job descriptions.
Scan for non-inclusive language, biased terms, or discriminatory phrases.
Return ONLY valid JSON — no markdown, no preamble.
Format: { "passed": boolean, "flaggedTerms": string[] }
If no issues: { "passed": true, "flaggedTerms": [] }`,
        messages: [{ role: 'user', content: plainText }],
      })

      const textBlock = response.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        const scan = JSON.parse(textBlock.text.trim()) as { passed: boolean; flaggedTerms: string[] }
        if (!scan.passed && scan.flaggedTerms.length > 0) {
          return {
            error:        'BR-JD-002: Non-inclusive language detected. Please review and revise.',
            flaggedTerms: scan.flaggedTerms,
          }
        }
      }
    } catch {
      // Scan failure is non-blocking — log and continue
      console.error('[FFN][publish-jd] Inclusive language scan failed — proceeding')
    }
  }

  // All checks passed — publish
  const { error: publishError } = await supabaseAdmin
    .from('x_ffn_job_description')
    .update({
      status:                'published',
      inclusive_scan_passed: true,
      published_at:          new Date().toISOString(),
      updated_at:            new Date().toISOString(),
    })
    .eq('id', input.jdId)
    .eq('tenant_id', tenantId)

  if (publishError) return { error: publishError.message }

  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'p_hiring_manager',
    action:       'jd.published',
    entity_type:  'x_ffn_job_description',
    entity_id:    input.jdId,
    new_values:   { title: input.title },
    ip_address:   null,
    user_agent:   null,
  })

  return { success: true }
}
