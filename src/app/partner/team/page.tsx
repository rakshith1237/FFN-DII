import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

const PERSONA_LABEL: Record<string, string> = {
  p_super_admin: 'Super Admin', p_hiring_manager: 'Hiring Manager', p_recruiter: 'Recruiter',
}

export default async function PartnerTeamPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (persona !== 'p_super_admin') redirect('/partner/dashboard')

  const db = createAdminClient()
  const { data: members } = await db
    .from('x_ffn_user_profile')
    .select('user_id, full_name, email, persona_code, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  const rows = members ?? []
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Team Management</h1>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              {['Name','Email','Role','Status'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.user_id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-3 px-4 font-medium text-[#111827]">{m.full_name ?? '—'}</td>
                <td className="py-3 px-4 text-[#374151]">{m.email}</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">{PERSONA_LABEL[m.persona_code] ?? m.persona_code}</span></td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.is_active ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-[#6B7280] p-6 text-center">No team members found.</p>}
      </div>
    </div>
  )
}