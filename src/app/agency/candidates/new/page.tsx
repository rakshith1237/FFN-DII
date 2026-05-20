import { redirect }                          from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function NewCandidatePage() {
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: candidate, error } = await supabaseAdmin
    .from('x_ffn_candidate')
    .insert({
      tenant_id:    tenantId,
      first_name:   'New',
      last_name:    'Candidate',
      email:        `draft-${Date.now()}@placeholder.internal`,
      bench_status: 'on_bench',
      status:       'active',
    })
    .select('id')
    .single()

  if (error || !candidate) redirect('/agency/requirements')
  redirect(`/agency/candidates/${candidate.id}`)
}
