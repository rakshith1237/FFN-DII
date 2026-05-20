'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'
import { updateBenchIndex } from '@/lib/ai/bench-query'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type SkillInput = {
  skillId:     string   // x_ffn_skill_taxonomy.id
  skillName:   string
  proficiency: string | null
  years:       number | null
  isPrimary:   boolean
}

export type CertInput = {
  certName:           string
  certIssuer:         string | null
  certId:             string | null
  issuedDate:         string | null
  expiryDate:         string | null
  credlyBadgeId:      string | null
  verificationStatus: 'self_attested' | 'credly_verified' | 'expired' | 'revoked'
}

export type ExperienceInput = {
  employer:    string
  role:        string
  startDate:   string | null
  endDate:     string | null
  isCurrent:   boolean
  description: string | null
}

export type ProfileInput = {
  firstName:         string
  lastName:          string
  email:             string
  phone:             string | null
  locationCity:      string | null
  availabilityDate:  string | null
  workAuthorization: string | null
  yearsExperience:   number | null
  currentTitle:      string | null
  currentEmployer:   string | null
  rateMin:           number | null
  rateMax:           number | null
  rateModel:         string | null
  benchStatus:       'on_bench' | 'not_on_bench' | 'engaged'
}

export type SaveCandidateState = { error?: string; success?: boolean }

export async function saveCandidate(
  candidateId: string,
  profile:     ProfileInput,
  skills:      SkillInput[],
  certs:       CertInput[],
  experience:  ExperienceInput[]
): Promise<SaveCandidateState> {
  await requirePersona(['a_recruiter', 'a_recruiting_manager'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  if (!profile.firstName.trim() || !profile.lastName.trim()) {
    return { error: 'First name and last name are required.' }
  }

  // 1. Update candidate profile
  const { error: profileError } = await supabaseAdmin
    .from('x_ffn_candidate')
    .update({
      first_name:           profile.firstName.trim(),
      last_name:            profile.lastName.trim(),
      email:                profile.email.trim(),
      phone:                profile.phone || null,
      location_city:        profile.locationCity || null,
      availability_date:    profile.availabilityDate || null,
      work_authorization:   profile.workAuthorization || null,
      years_experience:     profile.yearsExperience,
      current_title:        profile.currentTitle || null,
      current_employer:     profile.currentEmployer || null,
      rate_expectation_min: profile.rateMin,
      rate_expectation_max: profile.rateMax,
      rate_model:           profile.rateModel || null,
      bench_status:         profile.benchStatus,
      updated_at:           new Date().toISOString(),
    })
    .eq('id', candidateId)
    .eq('tenant_id', tenantId)

  if (profileError) return { error: profileError.message }

  // 2. Skills — full replace
  await supabaseAdmin
    .from('x_ffn_candidate_skill')
    .delete()
    .eq('candidate_id', candidateId)
    .eq('tenant_id', tenantId)

  if (skills.length > 0) {
    // Resolve taxonomy IDs for manually added skills (empty skillId)
    const resolvedSkills: SkillInput[] = await Promise.all(
      skills.map(async (s): Promise<SkillInput> => {
        if (s.skillId) return s
        const code = s.skillName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80)
        if (!code) return s
        const { data: taxRow } = await supabaseAdmin
          .from('x_ffn_skill_taxonomy')
          .upsert(
            { code, name: s.skillName, category: 'technical', is_active: true, sort_order: 0 },
            { onConflict: 'code' }
          )
          .select('id')
          .single()
        return { ...s, skillId: taxRow?.id ?? '' }
      })
    )

    const validSkills = resolvedSkills.filter(s => s.skillId)
    if (validSkills.length > 0) {
      const skillRows = validSkills.map(s => ({
        tenant_id:    tenantId,
        candidate_id: candidateId,
        skill_id:     s.skillId,
        proficiency:  s.proficiency,
        years:        s.years,
        is_primary:   s.isPrimary,
        source:       'manual',
      }))
      const { error: skillError } = await supabaseAdmin
        .from('x_ffn_candidate_skill')
        .insert(skillRows)
      if (skillError) return { error: skillError.message }
    }
  }

  // 3. Certifications — full replace
  await supabaseAdmin
    .from('x_ffn_candidate_cert')
    .delete()
    .eq('candidate_id', candidateId)
    .eq('tenant_id', tenantId)

  if (certs.length > 0) {
    const certRows = certs.map(c => ({
      tenant_id:               tenantId,
      candidate_id:            candidateId,
      cert_name:               c.certName,
      cert_issuer:             c.certIssuer,
      cert_id:                 c.certId,
      issued_date:             c.issuedDate,
      expiry_date:             c.expiryDate,
      credly_badge_id:         c.credlyBadgeId,
      verification_status:     c.verificationStatus,
      verification_checked_at: new Date().toISOString(),
    }))
    const { error: certError } = await supabaseAdmin
      .from('x_ffn_candidate_cert')
      .insert(certRows)
    if (certError) return { error: certError.message }
  }

  // 4. Experience — full replace
  await supabaseAdmin
    .from('x_ffn_candidate_experience')
    .delete()
    .eq('candidate_id', candidateId)
    .eq('tenant_id', tenantId)

  if (experience.length > 0) {
    const expRows = experience.map(e => ({
      tenant_id:    tenantId,
      candidate_id: candidateId,
      employer:     e.employer,
      role:         e.role,
      start_date:   e.startDate,
      end_date:     e.endDate,
      is_current:   e.isCurrent,
      description:  e.description,
    }))
    const { error: expError } = await supabaseAdmin
      .from('x_ffn_candidate_experience')
      .insert(expRows)
    if (expError) return { error: expError.message }
  }

  // 5. ADR-004: update bench index with current skill text
  const skillText = skills.map(s => s.skillName).join(', ')
  if (skillText.trim()) {
    await updateBenchIndex(candidateId, tenantId, skillText)
  }

  // 6. Audit log
  await supabaseAdmin.from('x_ffn_audit_log').insert({
    tenant_id:    tenantId,
    actor_id:     null,
    persona_code: 'a_recruiter',
    action:       'candidate.profile_updated',
    entity_type:  'x_ffn_candidate',
    entity_id:    candidateId,
    new_values:   {
      skill_count: skills.length,
      cert_count:  certs.length,
      exp_count:   experience.length,
    },
    ip_address:  null,
    user_agent:  null,
  })

  return { success: true }
}
