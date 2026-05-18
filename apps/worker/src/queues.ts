export const QUEUES = {
  TIER_ESCALATION: 'tier-escalation',
  SLA_MONITOR: 'sla-monitor',
  SCORE_COMPUTE: 'score-compute',
  RTR_DEDUP: 'rtr-dedup',
  BENCH_REFRESH: 'bench-refresh',
  NOTIFICATION: 'notification-dispatch',
  CO_EMPLOY: 'co-employ-alert',
  TENURE: 'tenure-compliance',
  CONTRACT_END: 'contract-end-alert',
  AUDIT: 'audit-retention',
  HEADCOUNT: 'headcount-alert',
  MARKET: 'market-rate-refresh',
  INVOICE: 'invoice-generate',
  OFFBOARD: 'offboarding-trigger',
  REBENCH: 're-bench',
} as const satisfies Record<string, string>;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
