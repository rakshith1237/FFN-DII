import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({
  getPersonaCode: vi.fn(),
  getTenantId:    vi.fn(),
  getUser:        vi.fn(),
}))
vi.mock('@/lib/notifications/fire-notification', () => ({
  fireNotification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/actions/onboarding/create-onboarding-tasks', () => ({
  createOnboardingTasks: vi.fn().mockResolvedValue({ created: 5, error: null }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { acceptOffer } from '@/lib/actions/offer/accept-or-counter-offer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { createOnboardingTasks } from '@/lib/actions/onboarding/create-onboarding-tasks'

const MOCK_OFFER = {
  id: 'offer-001', status: 'approved',
  tenant_id: 'tenant-001', agency_tenant_id: 'agency-001',
  jd_id: 'jd-001', candidate_id: 'cand-001',
  bill_rate: 500, currency: 'GBP', rate_model: 'daily',
  start_date: '2026-07-01', end_date: '2026-12-31', payment_terms: 30,
}
const MOCK_PLACEMENT_ID = 'placement-001'

function buildMockDb() {
  const offerUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  return {
    offerUpdate,
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'x_ffn_offer') return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_OFFER }) }) }) }),
        update: offerUpdate,
      }
      if (table === 'x_ffn_placement') return {
        insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: MOCK_PLACEMENT_ID }, error: null }) }) }),
      }
      if (table === 'x_ffn_submission') return {
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
      }
      if (table === 'x_ffn_audit_log') return { insert: vi.fn().mockResolvedValue({ error: null }) }
      if (table === 'x_ffn_candidate') return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { first_name: 'Jane', last_name: 'Smith', work_authorization: 'uk_citizen', location_country: 'GB' } }) }) }),
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn().mockResolvedValue({ error: null }), update: vi.fn().mockReturnThis() }
    }),
  }
}

describe('acceptOffer', () => {
  let mockDb: ReturnType<typeof buildMockDb>

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = buildMockDb()
    vi.mocked(createAdminClient).mockReturnValue(mockDb as any)
    vi.mocked(getPersonaCode).mockResolvedValue('a_recruiting_manager')
    vi.mocked(getTenantId).mockResolvedValue('agency-001')
    vi.mocked(getUser).mockResolvedValue({ id: 'user-001' } as any)
  })

  it('returns null error and a placementId on success', async () => {
    const result = await acceptOffer('offer-001')
    expect(result.error).toBeNull()
    expect(result.placementId).toBe(MOCK_PLACEMENT_ID)
  })

  it('sets offer status to accepted', async () => {
    await acceptOffer('offer-001')
    expect(mockDb.offerUpdate).toHaveBeenCalledWith({ status: 'accepted' })
  })

  it('calls createOnboardingTasks with the new placement id', async () => {
    await acceptOffer('offer-001')
    expect(createOnboardingTasks).toHaveBeenCalledWith(
      expect.objectContaining({ placementId: MOCK_PLACEMENT_ID })
    )
  })
})
