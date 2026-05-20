export type TierConfig = {
  id:                string
  tenant_id:         string
  tier_number:       1 | 2 | 3
  agency_tenant_id:  string
  hold_window_hours: number | null
}

export type AgencyTenant = {
  id:   string
  name: string
  type: string
}

export type JdBroadcast = {
  id:               string
  tenant_id:        string
  jd_id:            string
  agency_tenant_id: string
  tier:             number
  status:           'pending' | 'accepted' | 'declined' | 'sla_breached' | 'retracted' | 'early_stopped'
  broadcast_at:     string | null
  sla_deadline:     string | null
  responded_at:     string | null
  decline_reason:   string | null
  created_at:       string
  updated_at:       string
}

export type JdAssignment = {
  id:                     string
  tenant_id:              string
  jd_id:                  string
  agency_tenant_id:       string
  recruiter_id:           string
  assigned_by_id:         string
  submission_quota:       number
  submissions_used:       number
  target_submission_date: string
  notes:                  string | null
  status:                 'active' | 'completed' | 'cancelled'
  assigned_at:            string
}

export const DECLINE_REASONS = [
  'Capacity',
  'Skill Gap',
  'Rate Mismatch',
  'Other',
] as const

export type DeclineReason = typeof DECLINE_REASONS[number]
