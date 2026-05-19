'use client'

import { useActionState, useState } from 'react'
import { provisionTenant, type ProvisionTenantState } from '@/lib/actions/admin/provision-tenant'
import Link from 'next/link'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Dublin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'INR', 'AED', 'NZD']

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Ireland',
  'Germany',
  'Netherlands',
  'France',
  'Singapore',
  'UAE',
  'New Zealand',
  'Other',
]

const inputClassName =
  'w-full h-10 px-3 text-sm border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent'

const labelClassName = 'block text-sm font-medium text-[#374151] mb-1.5'

const sectionHeadingClassName = 'text-xs font-semibold text-[#6B7280] uppercase tracking-wide'

const initialState: ProvisionTenantState = {}

export default function CreateTenantPage() {
  const [state, formAction, isPending] = useActionState(provisionTenant, initialState)
  const [orgType, setOrgType] = useState<'partner' | 'agency'>('partner')
  const [primaryDomain, setPrimaryDomain] = useState('')

  if (state.success) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-[#0F2147] mb-6">Create New Tenant</h1>
        <div className="bg-[#DCFCE7] border border-[#16A34A] text-[#166534] rounded-md p-6 space-y-4">
          <p className="font-semibold text-lg">✓ Tenant Provisioned</p>
          <p className="text-sm">
            Tenant <span className="font-medium">{state.tenantName}</span> has been created and
            invitation sent to the Super Admin.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href={`/flexadmin/tenants/${state.tenantId}`}
              className="text-sm font-medium underline hover:no-underline"
            >
              View Tenant →
            </Link>
            <Link
              href="/flexadmin/tenants"
              className="text-sm font-medium underline hover:no-underline"
            >
              ← Back to Tenant List
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <form action={formAction}>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0F2147] mb-1">Create New Tenant</h1>
            <p className="text-sm text-[#6B7280] mb-8">
              Provision a new Partner or Agency organisation.
            </p>
          </div>

          {/* Section 1 — Organisation Details */}
          <div className="space-y-5">
            <span className={sectionHeadingClassName}>Organisation Details</span>

            <div>
              <label htmlFor="orgName" className={labelClassName}>
                Organisation Name
              </label>
              <input
                id="orgName"
                name="orgName"
                required
                minLength={3}
                maxLength={100}
                placeholder="DivIHN Integration Inc."
                className={inputClassName}
              />
            </div>

            <div>
              <label className={labelClassName}>Organisation Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['partner', 'Partner Organisation', 'Companies that need ServiceNow talent'],
                    ['agency', 'Agency Organisation', 'Staffing firms that supply talent'],
                  ] as const
                ).map(([value, title, desc]) => (
                  <label
                    key={value}
                    className={
                      'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ' +
                      (orgType === value
                        ? 'border-[#3B82F6] bg-[#EFF6FF]'
                        : 'border-[#E5E7EB] hover:border-[#9CA3AF]')
                    }
                  >
                    <input
                      type="radio"
                      name="orgType"
                      value={value}
                      checked={orgType === value}
                      onChange={(e) => setOrgType(e.target.value as 'partner' | 'agency')}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#374151]">{title}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2 — Domain and Region */}
          <div className="space-y-5">
            <span className={sectionHeadingClassName}>Domain and Region</span>

            <div>
              <label htmlFor="primaryDomain" className={labelClassName}>
                Primary Domain
              </label>
              <input
                id="primaryDomain"
                name="primaryDomain"
                required
                placeholder="company.com"
                value={primaryDomain}
                onChange={(e) => setPrimaryDomain(e.target.value.toLowerCase())}
                className={inputClassName}
              />
              <p className="text-xs text-[#6B7280] mt-1">
                All users in this organisation must have email addresses on this domain.
              </p>
            </div>

            <div>
              <label htmlFor="country" className={labelClassName}>
                Country
              </label>
              <select id="country" name="country" required className={inputClassName}>
                <option value="">Select a country…</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="timezone" className={labelClassName}>
                Timezone
              </label>
              <select id="timezone" name="timezone" required defaultValue="UTC" className={inputClassName}>
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="currency" className={labelClassName}>
                Currency
              </label>
              <select id="currency" name="currency" required className={inputClassName}>
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3 — Super Admin */}
          <div className="space-y-5">
            <span className={sectionHeadingClassName}>Super Admin Account</span>

            <div>
              <label htmlFor="superAdminEmail" className={labelClassName}>
                Super Admin Email
              </label>
              <input
                id="superAdminEmail"
                name="superAdminEmail"
                type="email"
                required
                placeholder={`admin@${primaryDomain || 'company.com'}`}
                className={inputClassName}
              />
              <p className="text-xs text-[#6B7280] mt-1">
                An invitation will be sent to this address. Email must be on the primary domain.
              </p>
            </div>
          </div>

          {/* Section 4 — Optional */}
          <details className="border border-[#E5E7EB] rounded-lg">
            <summary className="px-4 py-3 text-sm font-medium text-[#374151] cursor-pointer">
              Optional Details
            </summary>
            <div className="px-4 pb-4 space-y-4 border-t border-[#E5E7EB] pt-4">
              <div>
                <label htmlFor="secondaryDomains" className={labelClassName}>
                  Secondary Domains
                </label>
                <input
                  id="secondaryDomains"
                  name="secondaryDomains"
                  placeholder="domain2.com, domain3.com"
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="logoUrl" className={labelClassName}>
                  Logo URL
                </label>
                <input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  placeholder="https://..."
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="phone" className={labelClassName}>
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  className={inputClassName}
                />
              </div>
            </div>
          </details>

          {state.error && (
            <div
              role="alert"
              aria-live="polite"
              aria-atomic="true"
              className="text-sm text-[#DC2626] flex items-center gap-1.5"
            >
              {`⚠ ${state.error}`}
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-[#E5E7EB]">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-[#0F2147] text-white text-sm font-medium rounded-md hover:bg-[#1a3366] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2"
            >
              {isPending ? 'Provisioning…' : 'Provision Tenant'}
            </button>
            <Link href="/flexadmin/tenants" className="text-sm text-[#6B7280] hover:text-[#374151]">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
