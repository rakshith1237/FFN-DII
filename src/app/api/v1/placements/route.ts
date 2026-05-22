import { NextRequest, NextResponse }  from 'next/server'
import { verifyApiKey, hasScope }     from '@/lib/api/verify-api-key'
import { checkRateLimit }             from '@/lib/api/rate-limit'
import { createAdminClient }         from '@/lib/supabase/admin'

const PAGE_SIZE_MAX = 100

export async function GET(req: NextRequest) {
  const rawKey = req.headers.get('X-API-Key')
  const ctx    = await verifyApiKey(rawKey)
  if (!ctx) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const rl = await checkRateLimit(ctx.keyId)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(rl.reset) } }
    )
  }

  if (!hasScope(ctx, 'read')) {
    return NextResponse.json({ error: 'Insufficient scope. Required: read' }, { status: 403 })
  }

  const sp     = req.nextUrl.searchParams
  const page   = Math.max(1, parseInt(sp.get('page') ?? '1') || 1)
  const limit  = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get('limit') ?? '20') || 20))
  const status = sp.get('status') ?? 'active'
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  const db = createAdminClient()

  const { data, count, error } = await db
    .from('x_ffn_placement')
    .select(
      `id, status, start_date, end_date, bill_rate, currency, rate_model,
       x_ffn_candidate!inner ( first_name, last_name, email ),
       x_ffn_jd!inner ( title, number )`,
      { count: 'exact' }
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('status', status)
    .order('start_date', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total:      count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}
