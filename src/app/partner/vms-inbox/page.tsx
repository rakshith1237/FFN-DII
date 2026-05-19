import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId } from '@/lib/auth/session'
import VmsInboxClient from '@/components/partner/vms-inbox-client'
import { type VmsInboxRecord } from '@/lib/types/vms'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function VmsInboxPage() {
  const tenantId = await getTenantId()

  let records: VmsInboxRecord[] = []
  if (tenantId) {
    const { data } = await supabaseAdmin
      .from('x_ffn_vms_inbox')
      .select('id, tenant_id, sender_email, sender_domain, subject, parse_status, vms_mode, parse_confidence, extracted_data, confidence_map, parsed_jd_id, received_at, created_at')
      .eq('tenant_id', tenantId)
      .order('received_at', { ascending: false })
      .limit(100)
    records = (data as VmsInboxRecord[]) ?? []
  }

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-[#6B7280]">
        Unable to load inbox — tenant context missing.
      </div>
    )
  }

  return <VmsInboxClient initialRecords={records} tenantId={tenantId} />
}
