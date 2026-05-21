import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/billing/stripe-client'

const PRICE_MAP: Record<'partner' | 'agency', string> = {
  partner: process.env.STRIPE_PARTNER_PRICE_ID ?? '',
  agency:  process.env.STRIPE_AGENCY_PRICE_ID  ?? '',
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { planType?: string; orgName?: string; email?: string }
  const planType = body.planType as 'partner' | 'agency' | undefined

  if (!planType || !['partner', 'agency'].includes(planType)) {
    return NextResponse.json({ error: 'Invalid planType' }, { status: 400 })
  }
  if (!body.email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const priceId = PRICE_MAP[planType]
  if (!priceId) {
    return NextResponse.json({ error: `Price ID not configured for ${planType}` }, { status: 500 })
  }

  const stripe   = getStripe()
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hirenowwithflex.us'

  // Reuse existing customer if email already has one
  const existing = await stripe.customers.list({ email: body.email, limit: 1 })
  const customer = existing.data[0]
    ? existing.data[0]
    : await stripe.customers.create({ email: body.email, name: body.orgName ?? body.email })

  const session = await stripe.checkout.sessions.create({
    customer:             customer.id,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    metadata: {
      orgName:  body.orgName ?? '',
      planType,
      email:    body.email,
    },
    success_url: `${appUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/pricing`,
    subscription_data: {
      metadata: { orgName: body.orgName ?? '', planType },
    },
  })

  return NextResponse.json({ url: session.url })
}
