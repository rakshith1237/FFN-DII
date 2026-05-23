import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type BenchRow = {
  id: string
  x_ffn_candidate: { id: string; first_name: string; last_name: string; current_role: string | null; years_experience: number | null; email: string | null }
}

export default async function AgencyBenchPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['a_super_admin','a_recruiting_manager','a_recruiter'].includes(persona)) redirect('/agency/dashboard')

  const db = createAdminClient()
  const { data: bench } = await db
    .from('x_ffn_bench_index')
    .select('id, x_ffn_candidate!inner(id, first_name, last_name, current_role, years_experience, email)')
    .eq('tenant_id', tenantId)
    .eq('is_current', true)
    .order('id', { ascending: false })
    .limit(100)

  const rows = (bench ?? []) as unknown as BenchRow[]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F2147]">Bench Index</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{rows.length} candidates available</p>
        </div>
        <Link href="/agency/candidates/new" className="px-4 py-2 bg-[#E8531E] text-white text-sm font-semibold rounded-lg hover:bg-[#c94418] transition-colors">+ Add Candidate</Link>
      </div>
      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No candidates on bench yet.</p>
          <Link href="/agency/candidates/new" className="mt-3 inline-block text-sm text-[#3B82F6] hover:underline">Add your first candidate</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Name','Current Role','Experience','Email','Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(b => (
                <tr key={b.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-medium text-[#111827]">{b.x_ffn_candidate.first_name} {b.x_ffn_candidate.last_name}</td>
                  <td className="py-3 px-4 text-[#374151]">{b.x_ffn_candidate.current_role ?? '—'}</td>
                  <td className="py-3 px-4 text-[#374151]">{b.x_ffn_candidate.years_experience != null ? `${b.x_ffn_candidate.years_experience} yrs` : '—'}</td>
                  <td className="py-3 px-4 text-[#6B7280] text-xs">{b.x_ffn_candidate.email ?? '—'}</td>
                  <td className="py-3 px-4"><Link href={`/agency/candidates/${b.x_ffn_candidate.id}`} className="text-xs text-[#3B82F6] hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}