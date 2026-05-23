'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath }       from 'next/cache'
import { IR35_QUESTIONS }       from '@/lib/constants/ir35-questions'

const INSIDE_INDICATOR: Record<string, 'yes' | 'no'> = {
  q1:  'yes', q2:  'yes', q3:  'yes', q4:  'no',
  q5:  'no',  q6:  'yes', q7:  'yes', q8:  'yes',
  q9:  'no',  q10: 'no',  q11: 'yes', q12: 'yes',
}

export async function submitIr35Sds(input: {
  placementId: string
  candidateId: string
  jdId:        string
  answers:     Record<string, 'yes' | 'no' | 'depends'>
}): Promise<{ error: string | null; determination: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', determination: null }
  if (!['p_hiring_manager', 'p_super_admin'].includes(persona)) {
    return { error: 'Forbidden', determination: null }
  }

  const missing = IR35_QUESTIONS.filter(q => !input.answers[q.id])
  if (missing.length > 0) {
    return { error: `Please answer all questions. Missing: ${missing.map(q => q.id).join(', ')}`, determination: null }
  }

  let insideScore = 0
  for (const [qId, insideAnswer] of Object.entries(INSIDE_INDICATOR)) {
    const answer = input.answers[qId]
    if (answer === insideAnswer) insideScore++
    if (answer === 'depends') insideScore += 0.5
  }

  const determination: 'inside' | 'outside' | 'undetermined' =
    insideScore >= 8 ? 'inside' : insideScore <= 4 ? 'outside' : 'undetermined'

  const db = createAdminClient()

  const htmlContent = generateIr35Html({
    answers: input.answers, determination, insideScore,
    tenantId, placementId: input.placementId, generatedAt: new Date().toISOString(),
  })

  const storagePath = `${tenantId}/placements/${input.placementId}/ir35-sds.html`
  const { error: uploadError } = await db.storage
    .from('gdpr')
    .upload(storagePath, new Blob([htmlContent], { type: 'text/html' }), { upsert: true })

  if (uploadError) console.error('[ir35] storage upload error:', uploadError.message)

  const { error: sdsError } = await db.from('x_ffn_ir35_sds').upsert({
    tenant_id:           tenantId,
    placement_id:        input.placementId,
    candidate_id:        input.candidateId,
    jd_id:               input.jdId,
    answers:             input.answers,
    determination,
    determination_score: Math.round(insideScore * 10) / 10,
    pdf_storage_path:    uploadError ? null : storagePath,
    submitted_by:        user.id,
  }, { onConflict: 'placement_id' })

  if (sdsError) return { error: sdsError.message, determination: null }

  await db.from('x_ffn_onboarding_task')
    .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: user.id })
    .eq('placement_id', input.placementId)
    .eq('task_type', 'ir35')

  revalidatePath(`/partner/placements/${input.placementId}/ir35`)
  return { error: null, determination }
}

function generateIr35Html(params: {
  answers: Record<string, 'yes' | 'no' | 'depends'>
  determination: string; insideScore: number
  tenantId: string; placementId: string; generatedAt: string
}): string {
  const BAND_COLOR = params.determination === 'inside' ? '#DC2626'
    : params.determination === 'outside' ? '#16A34A' : '#D97706'

  const questionsHtml = IR35_QUESTIONS.map(q => {
    const ans = params.answers[q.id] ?? '-'
    const isInsideIndicator = ans === INSIDE_INDICATOR[q.id]
    return `<tr>
      <td style="padding:8px;border:1px solid #E5E7EB">${q.id.toUpperCase()}</td>
      <td style="padding:8px;border:1px solid #E5E7EB">${q.text}</td>
      <td style="padding:8px;border:1px solid #E5E7EB;font-weight:bold;color:${isInsideIndicator ? '#DC2626' : '#374151'};text-transform:uppercase">${ans}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><title>IR35 SDS</title>
  <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111827}
  h1{color:#0F2147}table{width:100%;border-collapse:collapse;margin:20px 0}
  @media print{button{display:none!important}}</style></head><body>
  <h1>IR35 Status Determination (SDS)</h1>
  <p><strong>Placement ID:</strong> ${params.placementId}</p>
  <p><strong>Generated:</strong> ${new Date(params.generatedAt).toLocaleString('en-GB')}</p>
  <p><strong>Inside Score:</strong> ${params.insideScore} / 12</p>
  <div style="padding:16px;background:${BAND_COLOR};color:white;border-radius:8px;margin:20px 0;font-size:18px;font-weight:bold;text-align:center">
    DETERMINATION: ${params.determination.toUpperCase()}</div>
  <table><thead><tr style="background:#F9FAFB">
    <th style="padding:8px;border:1px solid #E5E7EB;text-align:left">Q</th>
    <th style="padding:8px;border:1px solid #E5E7EB;text-align:left">Question</th>
    <th style="padding:8px;border:1px solid #E5E7EB;text-align:left">Answer</th>
  </tr></thead><tbody>${questionsHtml}</tbody></table>
  <p style="color:#6B7280;font-size:11px">Generated by FlexForceNow - DivIHN Integration Inc.</p>
  </body></html>`
}