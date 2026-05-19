'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type GeoRule = {
  country:          string
  state:            string
  city:             string
  zipRadius:        string
  enforcementLevel: 'Hard Block' | 'Soft Warning'
}

export type ScoringCriterion = {
  name:   string
  weight: number
}

export type JdDraftInput = {
  jdId:                  string
  title:                 string
  deptCode:              string
  engagementType:        string
  startDate:             string
  endDate:               string
  currency:              string
  rateModel:             string
  billRate:              string
  skills:                string
  workType:              string
  locationCity:          string
  locationState:         string
  locationCountry:       string
  intellimatchThreshold: number
  screeningRequired:     boolean
  geoRules:              GeoRule[]
  assignedRecruiterId:   string
  descriptionHtml:       string
  scoringCriteria:       ScoringCriterion[]
}

export type SaveDraftState = { error?: string; success?: boolean }

export async function saveDraftJD(input: JdDraftInput): Promise<SaveDraftState> {
  await requirePersona(['p_hiring_manager', 'p_super_admin'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }
  if (!input.title.trim()) return { error: 'Job title is required.' }

  const billRateNum   = input.billRate ? parseFloat(input.billRate) : null
  const billRateFinal = isNaN(billRateNum ?? NaN) ? null : billRateNum

  const { error } = await supabaseAdmin
    .from('x_ffn_job_description')
    .update({
      title:                  input.title.trim(),
      dept_code:              input.deptCode              || null,
      engagement_type:        input.engagementType        || null,
      start_date:             input.startDate             || null,
      end_date:               input.endDate               || null,
      currency:               input.currency              || null,
      rate_model:             input.rateModel             || null,
      bill_rate:              billRateFinal,
      skills:                 input.skills                || null,
      work_type:              input.workType              || null,
      location_city:          input.locationCity          || null,
      location_state:         input.locationState         || null,
      location_country:       input.locationCountry       || null,
      intellimatch_threshold: input.intellimatchThreshold,
      screening_required:     input.screeningRequired,
      geo_rules:              input.geoRules.length > 0      ? input.geoRules      : null,
      assigned_recruiter_id:  input.assignedRecruiterId       || null,
      description_html:       input.descriptionHtml           || null,
      scoring_criteria:       input.scoringCriteria.length > 0 ? input.scoringCriteria : null,
      updated_at:             new Date().toISOString(),
    })
    .eq('id', input.jdId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }
  return { success: true }
}
