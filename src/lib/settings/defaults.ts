export type SettingDefault = {
  key: string
  value: string
  data_type: 'string' | 'integer' | 'boolean' | 'decimal'
  description: string
}

export const CANONICAL_SETTINGS: readonly SettingDefault[] = [
  // Authentication and Session
  { key: 'session_timeout_minutes', value: '480', data_type: 'integer', description: 'Session inactivity timeout in minutes' },
  { key: 'max_concurrent_sessions', value: '1', data_type: 'integer', description: 'Max concurrent sessions per user (V1.5)' },
  { key: 'invite_link_expiry_hours', value: '72', data_type: 'integer', description: 'Sign-up invite link expiry in hours (V1.5)' },
  { key: 'audit_retention_days', value: '2555', data_type: 'integer', description: 'Audit log retention period in days' },

  // VMS Ingest
  { key: 'mode_d_threshold', value: '3', data_type: 'integer', description: 'Missing fields count that triggers Mode D fallback' },

  // JD and Distribution
  { key: 'agency_sla_hours', value: '48', data_type: 'integer', description: 'Default SLA hours for agency submission' },
  { key: 'tier_hold_window_hours_default', value: '24', data_type: 'integer', description: 'Default tier hold window in hours' },

  // Headcount Approval
  { key: 'ha_approval_required', value: 'true', data_type: 'boolean', description: 'Whether headcount approval is required before JD creation' },
  { key: 'ha_approver_role', value: 'p_super_admin', data_type: 'string', description: 'Persona code of headcount approval role' },

  // AI Scoring and Override
  { key: 'override_allowed', value: 'true', data_type: 'boolean', description: 'Whether hiring managers can override AI scores' },
  { key: 'technical_fit_dimension_weight_default', value: '60', data_type: 'integer', description: 'Default weight for Technical Fit dimension (0-100)' },
  { key: 'auxiliary_fit_dimension_weight_default', value: '40', data_type: 'integer', description: 'Default weight for Auxiliary Fit dimension (0-100)' },
  { key: 'offer_rec_strong_threshold_default', value: '80', data_type: 'integer', description: 'Score threshold for Strong Recommend' },
  { key: 'offer_rec_recommend_threshold_default', value: '60', data_type: 'integer', description: 'Score threshold for Recommend' },
  { key: 'offer_rec_borderline_threshold_default', value: '40', data_type: 'integer', description: 'Score threshold for Borderline' },
  { key: 'anonymous_panel_mode_default', value: 'false', data_type: 'boolean', description: 'Whether interview panel mode hides recruiter identity by default' },
  { key: 'scorecard_deadline_hours', value: '48', data_type: 'integer', description: 'Hours after interview for scorecard submission deadline' },

  // Bench-first and Sourcing
  { key: 'bench_first_enforcement', value: 'required', data_type: 'string', description: 'Whether bench-first check is required or optional' },
  { key: 'market_rate_enabled', value: 'true', data_type: 'boolean', description: 'Whether Market Rate Intelligence is enabled' },
  { key: 'market_rate_min_records', value: '10', data_type: 'integer', description: 'Minimum placement records needed to display market rate (V1.5)' },

  // Submission and Assignment
  { key: 'max_submission_quota_per_recruiter', value: '10', data_type: 'integer', description: 'Max total submissions a recruiter can make per JD' },
  { key: 'default_submission_quota', value: '3', data_type: 'integer', description: 'Default submission quota per recruiter per JD' },
  { key: 'default_rtr_expiry_days', value: '7', data_type: 'integer', description: 'Default days before RTR link expires' },

  // Interview and Offer
  { key: 'payment_terms_default', value: 'net_30', data_type: 'string', description: 'Default payment terms for engagements' },
  { key: 'ttf_benchmark_days_stage_1', value: '2', data_type: 'integer', description: 'Time-to-fill benchmark days for stage 1' },
  { key: 'ttf_benchmark_days_stage_2', value: '5', data_type: 'integer', description: 'Time-to-fill benchmark days for stage 2' },
  { key: 'ttf_benchmark_days_stage_3', value: '7', data_type: 'integer', description: 'Time-to-fill benchmark days for stage 3' },
  { key: 'ttf_benchmark_days_stage_4', value: '5', data_type: 'integer', description: 'Time-to-fill benchmark days for stage 4' },
  { key: 'ttf_benchmark_days_stage_5', value: '3', data_type: 'integer', description: 'Time-to-fill benchmark days for stage 5' },

  // Engagement and Compliance
  { key: 'co_employment_alert_threshold_days', value: '730', data_type: 'integer', description: 'Days of continuous engagement before co-employment alert' },
  { key: 'auto_rebench_on_conclusion', value: 'false', data_type: 'boolean', description: 'Auto re-bench candidate on engagement conclusion (V1.5)' },
  { key: 'timesheet_overdue_reminder_days', value: '5', data_type: 'integer', description: 'Days overdue before timesheet reminder fires' },
  { key: 'calendar_gap_threshold_days', value: '14', data_type: 'integer', description: 'Days gap in calendar before alert fires (V1.5)' },

  // Analytics
  { key: 'analytics_export_anonymize_agencies', value: 'false', data_type: 'boolean', description: 'Whether agency names are anonymized in exports' },

  // Onboarding and Offboarding
  { key: 'onboarding_task_template_version', value: '1', data_type: 'integer', description: 'Current onboarding task template version' },
  { key: 'offboarding_task_template_version', value: '1', data_type: 'integer', description: 'Current offboarding task template version' },
] as const

export const CANONICAL_SETTINGS_COUNT = CANONICAL_SETTINGS.length // must be 37
