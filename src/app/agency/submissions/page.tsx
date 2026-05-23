import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

type SubmissionRow = {
  id: string; status: string; intellimatch_score: number | null; created_at: string
  x_ffn_candidate: { first_name: string; last_name: string }
  x_ffn_jd: { title: string; number: string | null }
}

const STATUS_STYLE: Record<string, string> = {
  received:'bg-gray-100 text-gray-600', under_review:'bg-yellow-100 text-yellow-700',
  shortlisted:'bg-blue-100 text-blue-700', interview_scheduled:'bg-purple-100 text-purple-700',
  rejected:'bg-red-100 text-red-600', offer_made:'bg-orange-100 text-orange-700', filled:'bg-green-100 text-green-700',
}

export default async function AgencySubmissionsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['a_super_admin','a_recruiting_manager','a_recruiter'].includes(persona)) redirect('/agency/dashboard')

  const db = createAdminClient()
  const { data: submissions } = await db
    .from('x_ffn_submission')
    .select('id, status, intellimatch_score, created_at, x_ffn_candidate!inner(first_name, last_name), x_ffn_jd!inner(title, number)')
    .eq('agency_tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (submissions ?? []) as unknown as SubmissionRow[]
  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-xl font-bold text-[#0F2147]">Submissions</h1><p className="text-sm text-[#6B7280] mt-0.5">{rows.length} total</p></div>
      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center"><p className="text-sm text-[#6B7280]">No submissions yet.</p></div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Candidate','Job Description','Score','Status','Submitted'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-medium text-[#111827]">{s.x_ffn_candidate.first_name} {s.x_ffn_candidate.last_name}</td>
                  <td className="py-3 px-4 text-[#374151]">{s.x_ffn_jd.title}</td>
                  <td className="py-3 px-4">{s.intellimatch_score != null ? <span className="font-semibold text-[#E8531E]">{s.intellimatch_score}</span> : <span className="text-[#9CA3AF] text-xs">Pending</span>}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[s.status] ?? 'bg-gray-100 text-gray-500'}`}>{s.status.replace(/_/g,' ')}</span></td>
                  <td className="py-3 px-4 text-xs text-[#6B7280]">{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}