import { createAdminClient }          from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }                   from 'next/navigation'
import AlertActionButton              from '@/components/partner/alert-action-button'

type AlertRow = {
  id: string
  alert_type: string
  sent_at: string
  actioned: boolean
  action_type: string | null
  actioned_at: string | null
  x_ffn_placement: {
    id: string
    start_date: string
    end_date: string | null
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd: { title: string; number: string }
  }
}

function getAlertStyle(alertType: string): {
  border: string
  bg: string
  titleColor: string
  label: string
  urgent: boolean
} {
  switch (alertType) {
    case '30_day':
      return {
        border:     'border-l-4 border-l-[#DC2626] border border-[#E5E7EB]',
        bg:         'bg-white',
        titleColor: 'text-[#991B1B]',
        label:      '30-Day Warning',
        urgent:     true,
      }
    case 'threshold_reached':
      return {
        border:     'border-l-4 border-l-[#DC2626] border border-[#E5E7EB]',
        bg:         'bg-[#FFF5F5]',
        titleColor: 'text-[#991B1B]',
        label:      'Threshold Reached',
        urgent:     true,
      }
    case '90_day':
    case '60_day':
    default:
      return {
        border:     'border-l-4 border-l-[#D97706] border border-[#E5E7EB]',
        bg:         'bg-white',
        titleColor: 'text-[#0F2147]',
        label:      alertType === '60_day' ? '60-Day Advisory' : '90-Day Advisory',
        urgent:     false,
      }
  }
}

export default async function PartnerAlertsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_super_admin', 'p_hiring_manager'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()

  const { data: alerts } = await db
    .from('x_ffn_engagement_alert')
    .select(`
      id, alert_type, sent_at, actioned, action_type, actioned_at,
      x_ffn_placement!inner(
        id, start_date, end_date,
        x_ffn_candidate!inner(first_name, last_name),
        x_ffn_jd!inner(title, number)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .limit(100)

  const rows        = (alerts ?? []) as unknown as AlertRow[]
  const unactioned  = rows.filter((r) => !r.actioned)
  const actioned    = rows.filter((r) => r.actioned)

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#0F2147]">Engagement Alerts</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {unactioned.length} requiring action
        </p>
      </div>

      {unactioned.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
            Action Required ({unactioned.length})
          </h2>
          <div className="space-y-4">
            {unactioned.map((alert) => {
              const style   = getAlertStyle(alert.alert_type)
              const p       = alert.x_ffn_placement
              const daysActive = p.start_date
                ? Math.floor((Date.now() - new Date(p.start_date).getTime()) / 86400000)
                : null

              return (
                <div key={alert.id} className={`${style.border} ${style.bg} rounded-lg p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {style.urgent && (
                          <svg className="w-4 h-4 text-[#DC2626] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                        )}
                        <p className={`text-sm font-bold ${style.titleColor}`}>
                          {style.label} — {p.x_ffn_jd.title}
                        </p>
                      </div>
                      <p className="text-sm text-[#374151]">
                        <span className="font-medium">
                          {p.x_ffn_candidate.first_name} {p.x_ffn_candidate.last_name}
                        </span>
                        {daysActive !== null && (
                          <span className="text-[#6B7280]"> · {daysActive} days active</span>
                        )}
                        {p.end_date && (
                          <span className="text-[#6B7280]">
                            {' '}· ends {new Date(p.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        Sent {new Date(alert.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}PLC-{p.x_ffn_jd.number}
                      </p>
                    </div>
                    <AlertActionButton alertId={alert.id} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {actioned.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
            Actioned ({actioned.length})
          </h2>
          <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {['Contractor', 'Role', 'Alert Type', 'Action Taken', 'Actioned At'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actioned.map((alert) => (
                  <tr key={alert.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-4 font-medium text-[#111827]">
                      {alert.x_ffn_placement.x_ffn_candidate.first_name}{' '}
                      {alert.x_ffn_placement.x_ffn_candidate.last_name}
                    </td>
                    <td className="py-3 px-4 text-[#374151]">{alert.x_ffn_placement.x_ffn_jd.title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        {alert.alert_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#374151]">{alert.action_type ?? '-'}</td>
                    <td className="py-3 px-4 text-xs text-[#6B7280]">
                      {alert.actioned_at
                        ? new Date(alert.actioned_at).toLocaleDateString('en-GB')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No engagement alerts.</p>
        </div>
      )}
    </div>
  )
}