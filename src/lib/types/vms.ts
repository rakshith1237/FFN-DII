export type ExtractedField = {
  value:      string | null
  confidence: number
}

export type ExtractedData = {
  requisition_id:   ExtractedField
  job_title:        ExtractedField
  description:      ExtractedField
  business_unit:    ExtractedField
  location_city:    ExtractedField
  location_state:   ExtractedField
  location_country: ExtractedField
  work_type:        ExtractedField
  start_date:       ExtractedField
  end_date:         ExtractedField
  bill_rate:        ExtractedField
  skills:           ExtractedField
  headcount:        ExtractedField
  priority:         ExtractedField
}

export type VmsInboxRecord = {
  id:               string
  tenant_id:        string | null
  sender_email:     string
  sender_domain:    string
  subject:          string
  parse_status:     string
  vms_mode:         string
  parse_confidence: number | null
  extracted_data:   ExtractedData | null
  confidence_map:   Record<string, number> | null
  parsed_jd_id:     string | null
  received_at:      string
  created_at:       string
}

export type FieldMeta = {
  key:       keyof ExtractedData
  label:     string
  mandatory: boolean
}

export const FIELD_META: FieldMeta[] = [
  { key: 'requisition_id',   label: 'Requisition ID',   mandatory: false },
  { key: 'job_title',        label: 'Job Title',         mandatory: true  },
  { key: 'description',      label: 'Description',       mandatory: false },
  { key: 'business_unit',    label: 'Business Unit',     mandatory: false },
  { key: 'location_city',    label: 'City',              mandatory: true  },
  { key: 'location_state',   label: 'State / Province',  mandatory: false },
  { key: 'location_country', label: 'Country',           mandatory: false },
  { key: 'work_type',        label: 'Work Type',         mandatory: true  },
  { key: 'start_date',       label: 'Start Date',        mandatory: true  },
  { key: 'end_date',         label: 'End Date',          mandatory: false },
  { key: 'bill_rate',        label: 'Bill Rate',         mandatory: false },
  { key: 'skills',           label: 'Skills Required',   mandatory: true  },
  { key: 'headcount',        label: 'Headcount',         mandatory: false },
  { key: 'priority',         label: 'Priority',          mandatory: false },
]

export const REJECT_REASONS = [
  'Duplicate',
  'Out of Scope',
  'Rate Mismatch',
  'Other',
] as const

export type RejectReason = (typeof REJECT_REASONS)[number]
