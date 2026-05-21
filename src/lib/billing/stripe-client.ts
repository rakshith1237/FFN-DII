import Stripe from 'stripe'

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('[FFN] STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
    typescript:  true,
  })
}
