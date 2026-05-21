import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { MasterDataTabs } from '@/components/flexadmin/master-data-tabs'

export default async function MasterDataPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') redirect('/auth/login')

  const sp  = await searchParams
  const tab = sp.tab ?? 'skills'

  const db = createAdminClient()

  const [skills, funcDomains, bizDomains] = await Promise.all([
    db.from('x_ffn_skill_taxonomy').select('id, code, name, category, parent_id, is_active, sort_order').order('category').order('name'),
    db.from('x_ffn_functional_domain').select('id, code, name, is_active').order('name'),
    db.from('x_ffn_business_domain').select('id, code, name, is_active').order('name'),
  ])

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-6">Master Data</h1>
      <MasterDataTabs
        activeTab={tab}
        skills={skills.data ?? []}
        funcDomains={funcDomains.data ?? []}
        bizDomains={bizDomains.data ?? []}
      />
    </div>
  )
}
