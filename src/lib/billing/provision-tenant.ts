import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from './stripe-client'
import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY!) }

export async function provisionTenantFromCheckout(
  sessionId: string
): Promise<{ tenantId: string; alreadyProvisioned: boolean }> {
  const stripe  = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  })

  const email    = session.customer_details?.email ?? (session.metadata?.email ?? '')
  const orgName  = session.metadata?.orgName ?? email
  const planType = session.metadata?.planType as 'partner' | 'agency' | undefined
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : (session.customer as { id: string }).id

  if (!email) throw new Error('No email in Stripe session')

  const db = createAdminClient()

  // Idempotency: check if tenant already provisioned for this customer
  const { data: existing } = await db
    .from('x_ffn_tenant')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (existing) {
    return { tenantId: existing.id, alreadyProvisioned: true }
  }

  const tenantType: 'partner' | 'agency' = planType === 'agency' ? 'agency' : 'partner'
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as { id: string } | null)?.id ?? null

  // Create Supabase auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: orgName },
  })
  if (authError) throw new Error(`Auth user creation failed: ${authError.message}`)

  const userId = authData.user.id

  // Create tenant
  const { data: tenant, error: tenantError } = await db
    .from('x_ffn_tenant')
    .insert({
      name:                  orgName,
      type:                  tenantType,
      status:                'active',
      subscription_status:   'active',
      subscription_plan:     planType ?? 'partner',
      stripe_customer_id:    customerId,
      stripe_subscription_id: subscriptionId,
      primary_contact_email: email,
      timezone:              'Europe/London',
    })
    .select('id')
    .single()

  if (tenantError) throw new Error(`Tenant creation failed: ${tenantError.message}`)
  const tenantId = tenant.id

  // Seed tenant settings
  await db.rpc('seed_tenant_settings', { p_tenant_id: tenantId })

  // Create P-SA user profile
  await db.from('x_ffn_user_profile').insert({
    user_id:      userId,
    tenant_id:    tenantId,
    persona_code: tenantType === 'partner' ? 'p_super_admin' : 'a_super_admin',
    full_name:    orgName,
    email,
    is_active:    true,
  })

  // Send welcome email with magic link
  const { data: magicLink } = await db.auth.admin.generateLink({
    type:  'magiclink',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://hirenowwithflex.us'}/onboarding/wizard` },
  })

  const signInUrl = magicLink?.properties?.action_link ?? `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`

  const resend = getResend()
  await resend.emails.send({
    from:    'FFN Platform <noreply@hirenowwithflex.us>',
    to:      email,
    subject: `Welcome to FlexForceNow — ${orgName}`,
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0F2147">Welcome to FlexForceNow</h2>
      <p>Hi${orgName ? ` ${orgName}` : ''},</p>
      <p>Your <strong>${tenantType === 'partner' ? 'Partner' : 'Agency'}</strong> account has been created. Click below to sign in and complete your setup.</p>
      <p style="margin:32px 0">
        <a href="${signInUrl}" style="background:#0F2147;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
          Sign In to FlexForceNow
        </a>
      </p>
      <p style="color:#6B7280;font-size:13px">This link expires in 1 hour. If you did not create this account, you can ignore this email.</p>
      <hr style="margin:32px 0;border-color:#E5E7EB" />
      <p style="color:#9CA3AF;font-size:12px">FlexForceNow &middot; DivIHN Integration Inc. &middot; hirenowwithflex.us</p>
    </body></html>`,
  }).catch(err => console.error('[provision] email error:', String(err)))

  console.log(`[provision] tenant=${tenantId} type=${tenantType} email=${email}`)
  return { tenantId, alreadyProvisioned: false }
}
