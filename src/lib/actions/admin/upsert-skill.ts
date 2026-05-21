'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonaCode } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

const VALID_CATEGORIES = ['technical','certification','soft_skill','tool','language','domain','other'] as const
type SkillCategory = (typeof VALID_CATEGORIES)[number]

export async function upsertSkill(input: {
  id?:       string
  code:      string
  name:      string
  category:  string
  parentId?: string | null
  isActive?: boolean
}): Promise<{ error: string | null }> {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') return { error: 'Forbidden' }

  if (!VALID_CATEGORIES.includes(input.category as SkillCategory)) {
    return { error: `Invalid category: ${input.category}` }
  }
  if (!input.code.trim() || !input.name.trim()) return { error: 'Code and name are required' }

  const db = createAdminClient()
  const payload = {
    code:      input.code.trim().toUpperCase(),
    name:      input.name.trim(),
    category:  input.category as SkillCategory,
    parent_id: input.parentId ?? null,
    is_active: input.isActive ?? true,
  }

  const { error } = input.id
    ? await db.from('x_ffn_skill_taxonomy').update(payload).eq('id', input.id)
    : await db.from('x_ffn_skill_taxonomy').insert(payload)

  if (error) return { error: error.message }
  revalidatePath('/flexadmin/master-data')
  return { error: null }
}

export async function toggleSkillActive(id: string, isActive: boolean): Promise<{ error: string | null }> {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') return { error: 'Forbidden' }
  const db = createAdminClient()
  const { error } = await db.from('x_ffn_skill_taxonomy').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/flexadmin/master-data')
  return { error: null }
}
