import Link from 'next/link'

export default async function FlexAdminDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#0F2147]">FlexAdmin Dashboard</h1>
      <p className="text-sm text-[#6B7280]">
        Welcome to the FlexAdmin Console. Use the sidebar to manage tenants.
      </p>
      <Link
        href="/flexadmin/tenants"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2147] text-white text-sm font-medium rounded-md hover:bg-[#1a3366] transition-colors"
      >
        Go to Tenant Management →
      </Link>
    </div>
  )
}
