import { createAdminClient } from '@/lib/supabase/admin'

export async function generateInvoice(params: {
  timesheetId:  string
  placementId:  string
  tenantId:     string
  periodStart:  string
  periodEnd:    string
  hoursRegular: number
  hoursOvertime: number
}): Promise<{ invoiceId: string | null; error: string | null }> {
  const db = createAdminClient()

  const { data: placement } = await db
    .from('x_ffn_placement')
    .select('bill_rate, currency, agency_tenant_id, x_ffn_jd!inner(title)')
    .eq('id', params.placementId)
    .maybeSingle()

  if (!placement) return { invoiceId: null, error: 'Placement not found for invoice generation' }

  const hoursTotal = params.hoursRegular + (params.hoursOvertime ?? 0)
  const amount     = Math.round(hoursTotal * Number(placement.bill_rate) * 100) / 100
  const taxRate    = 0   // VAT applied externally — stored as 0 for now
  const taxAmount  = 0
  const totalAmount = amount + taxAmount

  // Generate sequential invoice number: INV-YYYY-NNNN
  const year = new Date().getFullYear()
  const { count } = await db
    .from('x_ffn_invoice')
    .select('*', { count: 'exact', head: true })
    .like('number', `INV-${year}-%`)

  const seq    = String((count ?? 0) + 1).padStart(4, '0')
  const number = `INV-${year}-${seq}`

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  const { data: invoice, error } = await db
    .from('x_ffn_invoice')
    .insert({
      tenant_id:        params.tenantId,
      agency_tenant_id: placement.agency_tenant_id,
      placement_id:     params.placementId,
      number,
      period_start:     params.periodStart,
      period_end:       params.periodEnd,
      amount,
      currency:         placement.currency ?? 'GBP',
      tax_amount:       taxAmount,
      total_amount:     totalAmount,
      due_date:         dueDate.toISOString().split('T')[0],
      status:           'draft',
      notes:            `Auto-generated for timesheet ${params.timesheetId}`,
    })
    .select('id')
    .single()

  if (error) return { invoiceId: null, error: error.message }
  return { invoiceId: invoice.id, error: null }
}
