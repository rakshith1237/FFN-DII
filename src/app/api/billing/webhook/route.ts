import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/billing/stripe-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { provisionTenantFromCheckout } from '@/lib/billing/provision-tenant'
import { fireNotification } from '@/lib/notifications/fire-notification'
import type Stripe from 'stripe'

// CRITICAL: disable body parser so we can read raw bytes for HMAC verification
export const dynamic = 'force-dynamic'

async function suspendTenant(stripeSubscriptionId: string): Promise<void> {
  const db = createAdminClient()
  await db
    .from('x_ffn_tenant')
    .update({ status: 'suspended', subscription_status: 'canceled', suspended_at: new Date().toISOString() })
    .eq('stripe_subscription_id', stripeSubscriptionId)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const sig     = req.headers.get('stripe-signature') ?? ''
  const secret  = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', String(err))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.payment_status === 'paid') {
          await provisionTenantFromCheckout(session.id)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await db
          .from('x_ffn_tenant')
          .update({
            subscription_status:   sub.status === 'active' ? 'active' : sub.status as string,
            stripe_subscription_id: sub.id,
          })
          .eq('stripe_customer_id', sub.customer as string)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await suspendTenant(sub.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.parent?.subscription_details?.subscription as string | undefined
        if (subId) {
          await db
            .from('x_ffn_tenant')
            .update({ subscription_status: 'active' })
            .eq('stripe_subscription_id', subId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.parent?.subscription_details?.subscription as string | undefined
        if (!subId) break

        await db
          .from('x_ffn_tenant')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', subId)

        // Fire PAYMENT_FAILED notification to P-SA / A-SA
        const { data: tenant } = await db
          .from('x_ffn_tenant')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()
        if (tenant) {
          await fireNotification('PAYMENT_FAILED', tenant.id, {
            invoiceNumber: invoice.number ?? '',
            amount:        `${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
          })
        }
        break
      }

      default:
        // Unhandled event type — log and return 200 to prevent Stripe retries
        console.log(`[stripe-webhook] unhandled event: ${event.type}`)
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', String(err))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
