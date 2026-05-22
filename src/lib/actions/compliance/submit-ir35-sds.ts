'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath }       from 'next/cache'

// HMRC IR35 scoring: which answer on each Q indicates "inside IR35"
const INSIDE_INDICATOR: Record<string, 'yes' | 'no'> = {
  q1:  'yes',  // client controls how/when/where
  q2:  'yes',  // personal service required
  q3:  'yes',  // client provides equipment
  q4:  'no',   // no financial risk = inside
  q5:  'no',   // cannot work for multiple clients = inside
  q6:  'yes',  // integrated into client team
  q7:  'yes',  // mutuality of obligation
  q8:  'yes',  // client sets hours
  q9:  'no',   // fixed rate regardless of hours = inside
  q10: 'no',   // no specific deliverable = inside
  q11: 'yes',  // client provides benefits
  q12: 'yes',  // working > 2 years for client
}

export const IR35_QUESTIONS: { id: string; text: string }[] = [
  { id: 'q1',  text: 'Does the client control how, when, and where you carry out the work?' },
  { id: 'q2',  text: 'Must you personally carry out the work (is substitution prohibited or restricted)?' },
  { id: 'q3',  text: 'Does the client provide the equipment, tools, or resources needed for the work?' },
  { id: 'q4',  text: 'Do you bear financial risk if the work is done incorrectly or late?' },
  { id: 'q5',  text: 'Are you free to work for multiple clients simultaneously during this engagement?' },
  { id: 'q6',  text: 'Are you integrated into the client organisation (e.g. team meetings, org chart, email address)?' },
  { id: 'q7',  text: 'Is there a mutual obligation — the client offers work and you must accept it?' },
  { id: 'q8',  text: 'Does the client set your working hours and days?' },
  { id: 'q9',  text: 'Are you paid a fixed daily/hourly rate regardless of the volume of work produced?' },
  { id: 'q10', text: 'Does the contract specify a particular outcome or deliverable rather than ongoing services?' },
  { id: 'q11', text: 'Does the client provide benefits such as holiday pay, sick pay, or pension contributions?' },
  { id: 'q12', text: 'Have you been working for this client continuously for more than 2 years?' },
]

export async function submitIr35Sds(input: {
  placementId:  string
  candidateId:  string
  jdId:         string
  answers:      Record<string, 'yes' | 'no' | 'depends'>
}): Promise<{ error: string | null; determination: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', determination: null }
  if (!['p_hiring_manager','p_super_admin'].includes(persona)) {
    return { error: 'Forbidden', determination: null }
  }

  // Validate all 12 questions answered
  const missing = IR35_QUESTIONS.filter(q => !input.answers[q.id])
  if (missing.length > 0) {
    return { error: `Please answer all questions. Missing: ${missing.map(q => q.id).join(', ')}`, determination: null }
  }

  // Compute score
  let insideScore = 0
  for (const [qId, insideAnswer] of Object.entries(INSIDE_INDICATOR)) {
    const answer = input.answers[qId]
    if (answer === insideAnswer) insideScore++
    // 'depends' counts as 0.5 toward inside
    if (answer === 'depends') insideScore += 0.5
  }

  const determination: 'inside' | 'outside' | 'undetermined' =
    insideScore >= 8  ? 'inside'
    : insideScore <= 4 ? 'outside'
    : 'undetermined'

  const db = createAdminClient()

  // Generate HTML for storage
  const htmlContent = generateIr35Html({
    answers:      input.answers,
    determination,
    insideScore,
    tenantId,
    placementId:  input.placementId,
    generatedAt:  new Date().toISOString(),
  })

  // Upload to Supabase Storage
  const storagePath = `${tenantId}/placements/${input.placementId}/ir35-sds.html`
  const { error: uploadError } = await db.storage
    .from('gdpr')  // reuse existing private bucket
    .upload(storagePath, new Blob([htmlContent], { type: 'text/html' }), { upsert: true })

  if (uploadError) console.error('[ir35] storage upload error:', uploadError.message)

  // Upsert x_ffn_ir35_sds
  const { error: sdsError } = await db
    .from('x_ffn_ir35_sds')
    .upsert({
      tenant_id:          tenantId,
      placement_id:       input.placementId,
      candidate_id:       input.candidateId,
      jd_id:              input.jdId,
      answers:            input.answers,
      determination,
      determination_score: Math.round(insideScore * 10) / 10,
      pdf_storage_path:   uploadError ? null : storagePath,
      submitted_by:       user.id,
    }, { onConflict: 'placement_id' })

  if (sdsError) return { error: sdsError.message, determination: null }

  // Mark IR35 onboarding task complete
  await db
    .from('x_ffn_onboarding_task')
    .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: user.id })
    .eq('placement_id', input.placementId)
    .eq('task_type', 'ir35')

  revalidatePath(`/partner/placements/${input.placementId}/ir35`)
  return { error: null, determination }
}

function generateIr35Html(params: {
  answers:      Record<string, 'yes' | 'no' | 'depends'>
  determination: string
  insideScore:   number
  tenantId:      string
  placementId:   string
  generatedAt:   string
}): string {
  const BAND_COLOR = params.determination === 'inside'
    ? '#DC2626'
    : params.determination === 'outside'
      ? '#16A34A'
      : '#D97706'

  const questionsHtml = IR35_QUESTIONS.map(q => {
    const ans = params.answers[q.id] ?? '—'
    const insideAns = INSIDE_INDICATOR[q.id]
    const isInsideIndicator = ans === insideAns
    return `<tr>
      <td style="padding:8px;border:1px solid #E5E7EB;font-size:13px">${q.id.toUpperCase()}</td>
      <td style="padding:8px;border:1px solid #E5E7EB;font-size:13px">${q.text}</td>
      <td style="padding:8px;border:1px solid #E5E7EB;font-size:13px;font-weight:bold;color:${isInsideIndicator ? '#DC2626' : '#374151'};text-transform:uppercase">
        ${ans}
      </td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><title>IR35 Status Determination</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111827; }
    h1 { color: #0F2147; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    @media print { button { display: none !important; } }
  </style>
  </head><body>
  <h1>IR35 Status Determination (SDS)</h1>
  <p><strong>Placement ID:</strong> ${params.placementId}</p>
  <p><strong>Generated:</strong> ${new Date(params.generatedAt).toLocaleString('en-GB')}</p>
  <p><strong>Inside Score:</strong> ${params.insideScore} / 12</p>
  <div style="padding:16px;background:${BAND_COLOR};color:white;border-radius:8px;margin:20px 0;font-size:18px;font-weight:bold;text-align:center">
    DETERMINATION: ${params.determination.toUpperCase()}
  </div>
  <table>
    <thead><tr style="background:#F9FAFB">
      <th style="padding:8px;border:1px solid #E5E7EB;text-align:left">Q</th>
      <th style="padding:8px;border:1px solid #E5E7EB;text-align:left">Question</th>
      <th style="padding:8px;border:1px solid #E5E7EB;text-align:left">Answer</th>
    </tr></thead>
    <tbody>${questionsHtml}</tbody>
  </table>
  <p style="color:#6B7280;font-size:11px">Generated by FlexForceNow · DivIHN Integration Inc. · This SDS is for reference only and does not constitute legal advice.</p>
  </body></html>`
}
