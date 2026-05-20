'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requirePersona, getTenantId } from '@/lib/auth/session'

const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const MAX_BYTES     = 10 * 1024 * 1024   // 10 MB
const ALLOWED_TYPES = ['application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export type UploadResumeState = {
  error?:       string
  success?:     boolean
  storagePath?: string
  fileName?:    string
}

export async function uploadResume(
  candidateId: string,
  fileName:    string,
  mimeType:    string,
  base64Data:  string
): Promise<UploadResumeState> {
  await requirePersona(['a_recruiter', 'a_recruiting_manager'])
  const tenantId = await getTenantId()
  if (!tenantId) return { error: 'Tenant context missing.' }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { error: 'Only PDF and DOCX files are accepted.' }
  }

  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.byteLength > MAX_BYTES) {
    return { error: 'File size must not exceed 10 MB.' }
  }

  const ext         = mimeType === 'application/pdf' ? 'pdf' : 'docx'
  const storagePath = `resumes/${tenantId}/${candidateId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('tenant-assets')
    .upload(storagePath, buffer, {
      contentType:  mimeType,
      upsert:       true,
    })

  if (uploadError) return { error: uploadError.message }

  await supabaseAdmin
    .from('x_ffn_candidate')
    .update({
      resume_storage_path: storagePath,
      resume_parsed_at:    null,   // reset — will be set after parsing
      updated_at:          new Date().toISOString(),
    })
    .eq('id', candidateId)
    .eq('tenant_id', tenantId)

  return { success: true, storagePath, fileName }
}
