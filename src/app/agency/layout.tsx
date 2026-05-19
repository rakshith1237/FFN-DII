import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { requirePersona, getPersonaCode, getTenantId } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import TopNav from '@/components/shared/top-nav'
import AgencyNav from '@/components/agency/nav'

type TenantRow = { name: string | null; setup_complete: boolean | null }

export default async function AgencyLayout({ children }: { children: ReactNode }) {
  await requirePersona(['a_super_admin', 'a_recruiting_manager', 'a_recruiter']).catch(() => redirect('/auth/login'))

  const [personaCode, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])

  const supabaseAdmin = createAdminClient()
  const { data: tenantRaw } = await supabaseAdmin
    .from('x_ffn_tenant')
    .select('name, setup_complete')
    .eq('id', tenantId ?? '')
    .single()

  const tenant = tenantRaw as TenantRow | null

  const headersList = await headers()
  const currentPath = headersList.get('x-matched-path') ?? headersList.get('x-pathname') ?? ''
  const isOnboarding = currentPath.includes('onboarding')

  if (personaCode === 'a_super_admin' && tenant && !tenant.setup_complete && !isOnboarding) {
    redirect('/agency/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <TopNav orgName={tenant?.name ?? undefined} />
      <aside className="fixed top-[56px] left-0 bottom-0 w-[240px] bg-[#1E3A5F] flex flex-col z-[999] overflow-y-auto">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[11px] text-white/40 font-medium uppercase tracking-widest">Agency Console</p>
          <p className="text-[12px] text-white/60 mt-0.5 truncate">{tenant?.name ?? 'Agency Organisation'}</p>
        </div>
        <AgencyNav personaCode={personaCode ?? 'a_super_admin'} />
        <div className="px-4 py-3 border-t border-white/10 mt-auto">
          <p className="text-[11px] text-white/30">V0.1 Alpha</p>
        </div>
      </aside>
      <main className="ml-[240px] mt-[56px] min-h-[calc(100vh-56px)]">
        <div className="max-w-[1280px] mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
