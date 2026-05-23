import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-500',
  open:      'bg-blue-100 text-blue-700',
  filled:    'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  closed:    'bg-gray-100 text-gray-600',
}

export default async function PartnerRequirementsPage() {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')
  if (!['p_super_admin', 'p_hiring_manager', 'p_recruiter'].includes(persona)) redirect('/partner/dashboard')

  const db = createAdminClient()
  const { data: jds } = await db
    .from('x_ffn_jd')
    .select('id, number, title, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = jds ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#0F2147]">Requirements</h1>
        <Link href="/partner/jd/new" className="px-4 py-2 bg-[#E8531E] text-white text-sm font-semibold rounded-lg hover:bg-[#c94418] transition-colors">
          + New JD
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
          <p className="text-sm text-[#6B7280]">No requirements yet.</p>
          <Link href="/partner/jd/new" className="mt-3 inline-block text-sm text-[#3B82F6] hover:underline">Create your first job description</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['JD Number','Title','Status','Created'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(jd => (
                <tr key={jd.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-3 px-4 font-mono text-xs text-[#374151]">{jd.number ?? '—'}</td>
                  <td className="py-3 px-4 font-medium text-[#111827]">
                    <Link href={`/partner/jd/${jd.id}/edit`} className="hover:text-[#E8531E] transition-colors">{jd.title ?? 'Untitled'}</Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[jd.status] ?? 'bg-gray-100 text-gray-500'}`}>{jd.status}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#6B7280]">{new Date(jd.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}