import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode } from '@/lib/auth/session'

export async function GET(req: NextRequest) {
  const persona = await getPersonaCode()
  if (!persona) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role     = searchParams.get('role')?.trim()
  const location = searchParams.get('location')?.trim()

  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 })

  const db = createAdminClient()

  // Exact match first (role + location)
  let query = db.from('x_ffn_market_rate')
    .select('role, location, rate_min, rate_p50, rate_p75, rate_max, rate_model, currency, sample_size, effective_date')
    .ilike('role', `%${role}%`)
    .order('effective_date', { ascending: false })
    .limit(1)

  if (location) query = query.ilike('location', `%${location}%`)

  const { data, error } = await query.maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ data: null, message: 'No market rate data found for this role/location' })

  return NextResponse.json({ data })
}
