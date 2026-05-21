import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const RETRY_DELAYS_MS = [0, 5000, 15000, 45000] as const

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type CwsRequisition = {
  id: string
  title: string
  department?: string
  location?: string
  start_date?: string
  end_date?: string
  bill_rate?: number
  currency?: string
  skills?: string[]
  description?: string
}

async function fetchCwsRequisition(requisitionId: string): Promise<CwsRequisition> {
  const baseUrl = process.env.CWS_API_BASE_URL
  const apiKey  = process.env.CWS_API_KEY
  if (!baseUrl) throw new Error('CWS_API_BASE_URL is not configured')

  const res = await fetch(`${baseUrl}/api/requisitions/${requisitionId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey ?? ''}`,
      'Content-Type':  'application/json',
    },
  })
  if (!res.ok) throw new Error(`CWS API returned ${res.status}: ${await res.text()}`)
  return res.json() as Promise<CwsRequisition>
}

export async function cwsFetch(inboxId: string, requisitionId: string): Promise<boolean> {
  const supabase = db()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delayMs = RETRY_DELAYS_MS[attempt]!
    if (delayMs > 0) {
      await sleep(delayMs)
    }
    try {
      const requisition = await fetchCwsRequisition(requisitionId)

      const extractedData = {
        title:       requisition.title,
        department:  requisition.department  ?? null,
        location:    requisition.location    ?? null,
        start_date:  requisition.start_date  ?? null,
        end_date:    requisition.end_date    ?? null,
        bill_rate:   requisition.bill_rate   ?? null,
        currency:    requisition.currency    ?? 'GBP',
        skills:      requisition.skills      ?? [],
        description: requisition.description ?? null,
      }

      await supabase
        .from('x_ffn_vms_inbox')
        .update({
          extracted_data:    extractedData,
          parse_status:      'parsed',
          parsed_at:         new Date().toISOString(),
          vms_mode:          'B',
        })
        .eq('id', inboxId)

      console.log(`[cwsFetch] inbox=${inboxId} requisition=${requisitionId} attempt=${attempt + 1} SUCCESS`)
      return true
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[cwsFetch] attempt ${attempt + 1} failed: ${lastError.message}`)
    }
  }

  // All 4 attempts failed
  console.error(`[cwsFetch] all attempts failed for inbox=${inboxId}: ${lastError?.message}`)
  await supabase
    .from('x_ffn_vms_inbox')
    .update({
      vms_mode:     'B_Failed',
      parse_status: 'failed',
      parse_error:  lastError?.message ?? 'CWS API unreachable after 4 attempts',
    })
    .eq('id', inboxId)

  return false
}
