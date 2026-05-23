import { createAdminClient }   from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'
import { redirect }            from 'next/navigation'
import { IR35_QUESTIONS } from '@/lib/constants/ir35-questions'

const BAND_STYLE = {
  inside:       { bg: '#FEE2E2', color: '#991B1B', label: 'INSIDE IR35' },
  outside:      { bg: '#DCFCE7', color: '#14532D', label: 'OUTSIDE IR35' },
  undetermined: { bg: '#FEF3C7', color: '#78350F', label: 'UNDETERMINED' },
}

export default async function Ir35PrintPage({
  params,
}: {
  params: Promise<{ placementId: string }>
}) {
  const { placementId } = await params
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) redirect('/auth/login')

  const db = createAdminClient()

  const { data: sds } = await db
    .from('x_ffn_ir35_sds')
    .select('answers, determination, determination_score, created_at, x_ffn_placement!inner(x_ffn_candidate!inner(first_name,last_name),x_ffn_jd!inner(title,number))')
    .eq('placement_id', placementId)
    .maybeSingle()

  if (!sds) redirect(`/partner/placements/${placementId}/ir35`)

  const answers = (sds.answers ?? {}) as Record<string, string>
  const band = BAND_STYLE[sds.determination as keyof typeof BAND_STYLE] ?? BAND_STYLE.undetermined
  const placement = sds.x_ffn_placement as unknown as {
    x_ffn_candidate: { first_name: string; last_name: string }
    x_ffn_jd:        { title: string; number: string }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '40px auto', padding: '0 20px', color: '#111827' }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print" style={{ marginBottom: '20px', textAlign: 'right' }}>
        <button onClick={() => window.print()}
          style={{ padding: '8px 20px', background: '#0F2147', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      <h1 style={{ color: '#0F2147', borderBottom: '2px solid #0F2147', paddingBottom: '10px' }}>
        IR35 Status Determination (SDS)
      </h1>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '6px 12px 6px 0', fontWeight: 'bold', color: '#6B7280', width: '160px' }}>Candidate</td>
            <td style={{ padding: '6px 0' }}>{placement.x_ffn_candidate.first_name} {placement.x_ffn_candidate.last_name}</td>
          </tr>
          <tr>
            <td style={{ padding: '6px 12px 6px 0', fontWeight: 'bold', color: '#6B7280' }}>Role</td>
            <td style={{ padding: '6px 0' }}>{placement.x_ffn_jd.title} ({placement.x_ffn_jd.number})</td>
          </tr>
          <tr>
            <td style={{ padding: '6px 12px 6px 0', fontWeight: 'bold', color: '#6B7280' }}>Generated</td>
            <td style={{ padding: '6px 0' }}>{new Date(sds.created_at).toLocaleString('en-GB')}</td>
          </tr>
          <tr>
            <td style={{ padding: '6px 12px 6px 0', fontWeight: 'bold', color: '#6B7280' }}>Inside Score</td>
            <td style={{ padding: '6px 0' }}>{sds.determination_score} / 12</td>
          </tr>
        </tbody>
      </table>

      <div style={{ padding: '16px 24px', background: band.bg, borderRadius: '8px', marginBottom: '24px' }}>
        <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: band.color }}>{band.label}</p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: band.color, opacity: 0.8 }}>
          {sds.determination === 'inside'
            ? 'The engagement falls inside IR35. PAYE/NI contributions may apply.'
            : sds.determination === 'outside'
              ? 'The engagement falls outside IR35. The worker may operate via their PSC.'
              : 'The IR35 status is unclear. Seek specialist tax advice before proceeding.'}
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            <th style={{ padding: '10px 12px', border: '1px solid #E5E7EB', textAlign: 'left', fontSize: '12px', color: '#6B7280', width: '40px' }}>#</th>
            <th style={{ padding: '10px 12px', border: '1px solid #E5E7EB', textAlign: 'left', fontSize: '12px', color: '#6B7280' }}>Question</th>
            <th style={{ padding: '10px 12px', border: '1px solid #E5E7EB', textAlign: 'left', fontSize: '12px', color: '#6B7280', width: '80px' }}>Answer</th>
          </tr>
        </thead>
        <tbody>
          {IR35_QUESTIONS.map((q, i) => (
            <tr key={q.id} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#6B7280' }}>{i + 1}</td>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#374151' }}>{q.text}</td>
              <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: '#374151' }}>
                {answers[q.id] ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: '11px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>
        Generated by FlexForceNow · DivIHN Integration Inc. · Placement ID: {placementId}<br />
        This SDS is for reference only and does not constitute legal or tax advice. Consult a qualified adviser for complex arrangements.
      </p>
    </div>
  )
}
