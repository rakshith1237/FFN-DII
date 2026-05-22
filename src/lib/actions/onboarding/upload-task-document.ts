'use server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { getPersonaCode, getTenantId, getUser } from '@/lib/auth/session'
import { revalidatePath }       from 'next/cache'

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function uploadTaskDocument(
  formData: FormData
): Promise<{ error: string | null; docId: string | null }> {
  const [persona, tenantId, user] = await Promise.all([
    getPersonaCode(), getTenantId(), getUser(),
  ])
  if (!persona || !tenantId || !user) return { error: 'Unauthorized', docId: null }
  if (!['p_hiring_manager','p_super_admin','p_recruiter'].includes(persona)) {
    return { error: 'Forbidden', docId: null }
  }

  const file         = formData.get('file')         as File | null
  const taskId       = formData.get('taskId')        as string | null
  const placementId  = formData.get('placementId')   as string | null
  const documentType = formData.get('documentType')  as string | null
  const expiryDate   = formData.get('expiryDate')    as string | null

  if (!file || !taskId || !placementId || !documentType) {
    return { error: 'Missing required fields', docId: null }
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: 'Only PDF, JPEG, PNG, or WebP files are allowed', docId: null }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'File size must be under 10 MB', docId: null }
  }

  const db = createAdminClient()

  // Verify task belongs to tenant
  const { data: task } = await db
    .from('x_ffn_onboarding_task')
    .select('id, task_type')
    .eq('id', taskId).eq('tenant_id', tenantId).maybeSingle()
  if (!task) return { error: 'Task not found', docId: null }

  const ext         = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${tenantId}/placements/${placementId}/onboarding/${taskId}/${Date.now()}.${ext}`
  const bytes       = await file.arrayBuffer()

  const { error: uploadError } = await db.storage
    .from('gdpr')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message, docId: null }

  const { data: doc, error: docError } = await db
    .from('x_ffn_onboarding_document')
    .insert({
      tenant_id:     tenantId,
      placement_id:  placementId,
      task_id:       taskId,
      document_type: documentType,
      storage_path:  storagePath,
      original_name: file.name,
      expiry_date:   expiryDate || null,
    })
    .select('id')
    .single()

  if (docError) return { error: docError.message, docId: null }

  revalidatePath(`/partner/placements/${placementId}/onboarding`)
  return { error: null, docId: doc.id }
}
