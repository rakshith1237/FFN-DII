import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/billing/stripe-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId } from '@/lib/auth/session'

export async function POST(_req: NextRequest) {
  const [persona, tenantId] = await Promise.all([getPersonaCode(), getTenantId()])
  if (!persona || !tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!['p_super_admin','a_super_admin'].includes(persona)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createAdminClient()
  const { data: tenant } = await db
    .from('x_ffn_tenant')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const stripe  = getStripe()
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hirenowwithflex.us'
  const session = await stripe.billingPortal.sessions.create({
    customer:   tenant.stripe_customer_id,
    return_url: `${appUrl}/partner/settings`,
  })

  return NextResponse.json({ url: session.url })
}
