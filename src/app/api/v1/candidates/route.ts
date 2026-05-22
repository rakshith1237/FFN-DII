import { NextRequest, NextResponse }        from 'next/server'
import { verifyApiKey, hasScope }           from '@/lib/api/verify-api-key'
import { checkRateLimit }                   from '@/lib/api/rate-limit'
import { createAdminClient }               from '@/lib/supabase/admin'

const PAGE_SIZE_MAX = 100

function rateLimitHeaders(remaining: number, reset: number) {
  return {
    'X-RateLimit-Limit':     '100',
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(reset),
  }
}

export async function GET(req: NextRequest) {
  // 1. Auth
  const rawKey = req.headers.get('X-API-Key')
  const ctx    = await verifyApiKey(rawKey)
  if (!ctx) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  // 2. Rate limit
  const rl = await checkRateLimit(ctx.keyId)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 100 requests per minute.' },
      { status: 429, headers: rateLimitHeaders(0, rl.reset) }
    )
  }

  // 3. Scope
  if (!hasScope(ctx, 'read')) {
    return NextResponse.json({ error: 'Insufficient scope. Required: read' }, { status: 403 })
  }

  // 4. Parse pagination
  const sp    = req.nextUrl.searchParams
  const page  = Math.max(1, parseInt(sp.get('page') ?? '1') || 1)
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get('limit') ?? '20') || 20))
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  const db = createAdminClient()

  // 5. Query — tenant-scoped (not cross-tenant)
  const { data, count, error } = await db
    .from('x_ffn_candidate')
    .select(
      'id, first_name, last_name, email, current_title, availability_status, location_city, location_country, created_at',
      { count: 'exact' }
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  return NextResponse.json(
    {
      data,
      pagination: {
        page,
        limit,
        total:      count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    },
    { headers: rateLimitHeaders(rl.remaining, rl.reset) }
  )
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const rawKey = req.headers.get('X-API-Key')
  const ctx    = await verifyApiKey(rawKey)
  if (!ctx) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  // 2. Rate limit
  const rl = await checkRateLimit(ctx.keyId)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers: rateLimitHeaders(0, rl.reset) }
    )
  }

  // 3. Scope
  if (!hasScope(ctx, 'write')) {
    return NextResponse.json({ error: 'Insufficient scope. Required: write' }, { status: 403 })
  }

  // 4. Parse body
  const body = await req.json() as {
    first_name?: string
    last_name?:  string
    email?:      string
    current_title?: string
    location_city?:    string
    location_country?: string
  }

  if (!body.first_name || !body.last_name || !body.email) {
    return NextResponse.json(
      { error: 'Required fields: first_name, last_name, email' },
      { status: 400 }
    )
  }

  if (!body.email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: candidate, error } = await db
    .from('x_ffn_candidate')
    .insert({
      tenant_id:        ctx.tenantId,
      first_name:       body.first_name.trim(),
      last_name:        body.last_name.trim(),
      email:            body.email.trim().toLowerCase(),
      current_title:    body.current_title?.trim() ?? null,
      location_city:    body.location_city?.trim() ?? null,
      location_country: body.location_country?.trim() ?? null,
      availability_status: 'available',
      source:           'api',
    })
    .select('id, first_name, last_name, email, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A candidate with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
  }

  return NextResponse.json(
    { data: candidate },
    { status: 201, headers: rateLimitHeaders(rl.remaining, rl.reset) }
  )
}
