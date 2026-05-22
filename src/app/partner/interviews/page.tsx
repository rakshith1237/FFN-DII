import { createAdminClient }  from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }           from 'next/navigation'
import Link                   from 'next/link'

type InterviewRow = {
  id:              string
  scheduled_at:    string
  duration_minutes: number | null
  interview_format: string
  meeting_platform: string | null
  meeting_url:     string | null
  status:          string
  submission_id:   string
  jd_id:           string
}

const STATUS_STYLE: Record<string, string> = {
  scheduled:  'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-gray-100 text-gray-500',
  scored:     'bg-purple-100 text-purple-700',
}

const FORMAT_LABEL: Record<string, string> = {
  video:     'Video',
  in_person: 'In Person',
  phone:     'Phone',
}

export default async function InterviewsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()

  const { data: interviews } = await db
    .from('x_ffn_interview')
    .select(`
      id,
      scheduled_at,
      duration_minutes,
      interview_format,
      meeting_platform,
      meeting_url,
      status,
      submission_id,
      jd_id,
      x_ffn_jd!inner ( number, title, tenant_id ),
      x_ffn_candidate!inner ( first_name, last_name, email )
    `)
    .eq('x_ffn_jd.tenant_id', tenantId)
    .order('scheduled_at', { ascending: false })
    .limit(100)

  const rows = (interviews ?? []) as unknown as Array<
    InterviewRow & {
      x_ffn_jd:       { number: string; title: string }
      x_ffn_candidate: { first_name: string; last_name: string; email: string }
    }
  >

  const upcoming = rows.filter(r => r.status === 'scheduled' && new Date(r.scheduled_at) >= new Date())
  const past     = rows.filter(r => r.status !== 'scheduled' || new Date(r.scheduled_at) < new Date())

  void past

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F2147]">Interviews</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">All scheduled and completed interviews</p>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">
            {upcoming.length} upcoming
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No interviews scheduled yet.</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Shortlist a candidate in the{' '}
            <Link href="/partner/dashboard" className="text-[#0F2147] underline">Decision Vault</Link>{' '}
            to schedule an interview.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Candidate','JD','Date & Time','Format','Duration','Status',''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const candidateName = `${row.x_ffn_candidate.first_name} ${row.x_ffn_candidate.last_name}`
                const isPast = new Date(row.scheduled_at) < new Date() && row.status === 'scheduled'
                return (
                  <tr key={row.id} className={`border-b border-[#F3F4F6] hover:bg-[#F9FAFB] ${isPast ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#111827]">{candidateName}</p>
                      <p className="text-xs text-[#9CA3AF]">{row.x_ffn_candidate.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[#374151]">{row.x_ffn_jd.title}</p>
                      <p className="text-xs text-[#9CA3AF]">{row.x_ffn_jd.number}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#374151]">
                      {new Date(row.scheduled_at).toLocaleString('en-GB', {
                        dateStyle: 'medium', timeStyle: 'short'
                      })}
                    </td>
                    <td className="py-3 px-4 text-[#374151]">
                      {FORMAT_LABEL[row.interview_format] ?? row.interview_format}
                      {row.meeting_platform && (
                        <span className="text-xs text-[#9CA3AF] ml-1">({row.meeting_platform})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#374151]">
                      {row.duration_minutes ? `${row.duration_minutes}m` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        isPast ? 'bg-amber-100 text-amber-700' : (STATUS_STYLE[row.status] ?? 'bg-gray-100 text-gray-500')
                      }`}>
                        {isPast ? 'Overdue' : row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {row.meeting_url && (
                        <a href={row.meeting_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#0F2147] underline hover:no-underline">
                          Join
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
