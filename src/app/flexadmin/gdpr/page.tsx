import { getPersonaCode } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { GdprManagement } from '@/components/flexadmin/gdpr-management'

export default async function GdprPage() {
  const persona = await getPersonaCode()
  if (persona !== 'flex_admin') redirect('/auth/login')

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0F2147] mb-1">GDPR Management</h1>
      <p className="text-sm text-[#6B7280] mb-6">
        Process data subject rights requests under GDPR Art. 17 (Erasure) and Art. 20 (Portability).
        All actions are audit-logged and irreversible.
      </p>
      <GdprManagement />
    </div>
  )
}
