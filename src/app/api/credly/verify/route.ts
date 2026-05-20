import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ status: 'self_attested' })

  let body: { badgeUrl?: string }
  try {
    body = await request.json() as { badgeUrl?: string }
  } catch {
    return NextResponse.json({ status: 'self_attested' })
  }

  const { badgeUrl } = body
  if (!badgeUrl?.trim()) return NextResponse.json({ status: 'self_attested' })

  const credlyKey = process.env['CREDLY_API_KEY']
  if (!credlyKey) {
    // B-005: API key not yet available — self-attested fallback (D-005)
    return NextResponse.json({ status: 'self_attested' })
  }

  try {
    const encoded = encodeURIComponent(badgeUrl)
    const res     = await fetch(
      `https://api.credly.com/v1/badges?assertion_url=${encoded}`,
      {
        headers: {
          Authorization: `Bearer ${credlyKey}`,
          Accept:        'application/json',
        },
      }
    )

    if (!res.ok) return NextResponse.json({ status: 'self_attested' })

    const json = await res.json() as {
      data?: Array<{ badge_template?: { name?: string }; issuer?: { summary?: string } }>
    }
    const badge = json.data?.[0]

    if (!badge) return NextResponse.json({ status: 'self_attested' })

    return NextResponse.json({
      status:    'credly_verified',
      badgeName: badge.badge_template?.name ?? null,
      issuer:    badge.issuer?.summary ?? null,
    })
  } catch {
    return NextResponse.json({ status: 'self_attested' })
  }
}
