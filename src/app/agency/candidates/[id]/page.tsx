import { redirect }                          from 'next/navigation'
import Link                                  from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTenantId }                       from '@/lib/auth/session'
import CandidateProfileClient                from '@/components/agency/candidate-profile-client'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params
  const tenantId = await getTenantId()
  if (!tenantId) redirect('/auth/login')

  const { data: candidate } = await supabaseAdmin
    .from('x_ffn_candidate')
    .select('*')
    .eq('id', candidateId)
    .eq('tenant_id', tenantId)
    .single()

  if (!candidate) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-semibold text-[#374151] mb-2">Candidate not found</p>
        <Link href="/agency/requirements" className="text-sm text-[#3B82F6] hover:underline">
          ← Back to Requirements
        </Link>
      </div>
    )
  }

  // Fetch skills with taxonomy names
  const { data: skills } = await supabaseAdmin
    .from('x_ffn_candidate_skill')
    .select('id, skill_id, proficiency, years, is_primary, source, x_ffn_skill_taxonomy(id, name, code)')
    .eq('candidate_id', candidateId)
    .eq('tenant_id', tenantId)

  // Fetch certifications
  const { data: certs } = await supabaseAdmin
    .from('x_ffn_candidate_cert')
    .select('*')
    .eq('candidate_id', candidateId)
    .eq('tenant_id', tenantId)

  // Fetch experience
  const { data: experience } = await supabaseAdmin
    .from('x_ffn_candidate_experience')
    .select('*')
    .eq('candidate_id', candidateId)
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })

  return (
    <CandidateProfileClient
      candidate={candidate as Record<string, unknown>}
      skills={(skills ?? []) as Record<string, unknown>[]}
      certs={(certs ?? []) as Record<string, unknown>[]}
      experience={(experience ?? []) as Record<string, unknown>[]}
    />
  )
}
