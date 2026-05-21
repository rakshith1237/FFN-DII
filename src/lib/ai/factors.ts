export type FactorGroup = 'technical_fit' | 'auxiliary_fit'

export type Factor = {
  code:    string
  label:   string
  group:   FactorGroup
  weight:  number  // default weight — each group sums to 100
  enabled: boolean
}

export const TECHNICAL_FIT_FACTORS: Factor[] = [
  { code: 'skill_match',       label: 'Skills Alignment',        group: 'technical_fit', weight: 20, enabled: true  },
  { code: 'experience_years',  label: 'Years of Experience',     group: 'technical_fit', weight: 15, enabled: true  },
  { code: 'cert_match',        label: 'Certifications Match',    group: 'technical_fit', weight: 10, enabled: true  },
  { code: 'tool_proficiency',  label: 'Tool Proficiency',        group: 'technical_fit', weight: 10, enabled: true  },
  { code: 'domain_knowledge',  label: 'Domain Knowledge',        group: 'technical_fit', weight: 10, enabled: true  },
  { code: 'tech_complexity',   label: 'Technical Complexity',    group: 'technical_fit', weight: 8,  enabled: true  },
  { code: 'architecture_exp',  label: 'Architecture Experience', group: 'technical_fit', weight: 8,  enabled: true  },
  { code: 'integration_exp',   label: 'Integration Experience',  group: 'technical_fit', weight: 7,  enabled: true  },
  { code: 'cloud_exp',         label: 'Cloud Platform Exp',      group: 'technical_fit', weight: 5,  enabled: true  },
  { code: 'methodology',       label: 'Methodology Adherence',   group: 'technical_fit', weight: 4,  enabled: true  },
  { code: 'technical_comm',    label: 'Technical Communication', group: 'technical_fit', weight: 3,  enabled: true  },
]

export const AUXILIARY_FIT_FACTORS: Factor[] = [
  { code: 'location_match',    label: 'Location Alignment',      group: 'auxiliary_fit', weight: 20, enabled: true  },
  { code: 'rate_alignment',    label: 'Rate / Budget Alignment', group: 'auxiliary_fit', weight: 18, enabled: true  },
  { code: 'availability',      label: 'Availability Alignment',  group: 'auxiliary_fit', weight: 15, enabled: true  },
  { code: 'cultural_fit',      label: 'Cultural Fit',            group: 'auxiliary_fit', weight: 12, enabled: true  },
  { code: 'ir35_compliance',   label: 'IR35 Compliance',         group: 'auxiliary_fit', weight: 10, enabled: true  },
  { code: 'work_auth',         label: 'Work Authorization',      group: 'auxiliary_fit', weight: 8,  enabled: true  },
  { code: 'comm_style',        label: 'Communication Style',     group: 'auxiliary_fit', weight: 7,  enabled: true  },
  { code: 'stakeholder_exp',   label: 'Stakeholder Management',  group: 'auxiliary_fit', weight: 5,  enabled: true  },
  { code: 'project_scale',     label: 'Project Scale Exp',       group: 'auxiliary_fit', weight: 3,  enabled: true  },
  { code: 'team_collab',       label: 'Team Collaboration',      group: 'auxiliary_fit', weight: 1,  enabled: true  },
  { code: 'adaptability',      label: 'Adaptability',            group: 'auxiliary_fit', weight: 1,  enabled: true  },
]

export const ALL_FACTORS: Factor[] = [...TECHNICAL_FIT_FACTORS, ...AUXILIARY_FIT_FACTORS]

export function getDefaultFactorMap(): Record<string, Factor> {
  return Object.fromEntries(ALL_FACTORS.map(f => [f.code, f]))
}

export function validateGroupWeights(factors: Factor[], group: FactorGroup): boolean {
  const total = factors
    .filter(f => f.group === group && f.enabled)
    .reduce((sum, f) => sum + f.weight, 0)
  return Math.round(total) === 100
}
