'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Building2, Users } from 'lucide-react'
import { provisionTenant, type ProvisionTenantState } from '@/lib/actions/admin/provision-tenant'

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

const inputCls  = 'w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors'
const labelCls  = 'block text-[13px] font-bold text-[#374151] mb-1.5'
const selectCls = inputCls + ' cursor-pointer'

const initialState: ProvisionTenantState = {}

export default function CreateTenantPage() {
  const [state, formAction, isPending] = useActionState(provisionTenant, initialState)
  const [orgType, setOrgType] = useState<'partner' | 'agency'>('partner')
  const [primaryDomain, setPrimaryDomain] = useState('')

  if (state.success) {
    return (
      <div className="max-w-[540px] mx-auto">
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-[#16A34A]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#0F2147] mb-2">Tenant Provisioned</h2>
          <p className="text-[14px] text-[#6B7280] mb-6">
            <strong className="text-[#374151]">{state.tenantName}</strong> has been created.
            An invitation email has been sent to the Super Admin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/flexadmin/tenants/${state.tenantId}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0F2147] text-white text-[14px] font-semibold rounded-[6px] hover:bg-[#1a3460] transition-colors"
            >
              View Tenant →
            </Link>
            <Link
              href="/flexadmin/tenants"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#374151] text-[14px] font-semibold rounded-[6px] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
            >
              ← All Tenants
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[680px]">

      {/* Back link */}
      <Link href="/flexadmin/tenants" className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#374151] mb-6">
        <ArrowLeft size={14} /> Tenant Management
      </Link>

      <h1 className="text-[24px] font-bold text-[#0F2147] mb-1">Create New Tenant</h1>
      <p className="text-[14px] text-[#6B7280] mb-8">
        Provision a new Partner or Agency organisation on the platform.
      </p>

      <form action={formAction} className="space-y-8">

        {/* SECTION 1: Organisation Details */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6 space-y-5">
          <h2 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest">
            Organisation Details
          </h2>

          <div>
            <label htmlFor="orgName" className={labelCls}>
              Organisation Name <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <input id="orgName" name="orgName" required minLength={3} maxLength={100}
              placeholder="e.g. Accenture Federal Services" className={inputCls} />
          </div>

          {/* Org Type — radio cards */}
          <div>
            <p className={labelCls}>Organisation Type <span className="text-[#DC2626]" aria-hidden="true">*</span></p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'partner' as const, title: 'Partner Organisation', desc: 'Companies that source ServiceNow talent', Icon: Building2, selectedColor: 'border-[#3B82F6] bg-[#EFF6FF]', iconColor: 'text-[#3B82F6]' },
                { value: 'agency'  as const, title: 'Agency Organisation',  desc: 'Staffing firms that supply talent',       Icon: Users,     selectedColor: 'border-[#16A34A] bg-[#DCFCE7]', iconColor: 'text-[#16A34A]' },
              ]).map(({ value, title, desc, Icon, selectedColor, iconColor }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-4 border-2 rounded-[8px] cursor-pointer transition-colors ${orgType === value ? selectedColor : 'border-[#E5E7EB] hover:border-[#D1D5DB]'}`}
                >
                  <input
                    type="radio"
                    name="orgType"
                    value={value}
                    checked={orgType === value}
                    onChange={() => setOrgType(value)}
                    className="sr-only"
                  />
                  <Icon size={20} className={orgType === value ? iconColor : 'text-[#9CA3AF]'} />
                  <div>
                    <p className="text-[13px] font-bold text-[#374151]">{title}</p>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: Domain & Region */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6 space-y-5">
          <h2 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest">
            Domain &amp; Region
          </h2>

          <div>
            <label htmlFor="primaryDomain" className={labelCls}>
              Primary Domain <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <input
              id="primaryDomain"
              name="primaryDomain"
              required
              placeholder="company.com"
              value={primaryDomain}
              onChange={e => setPrimaryDomain(e.target.value.toLowerCase())}
              className={inputCls}
            />
            <p className="text-[12px] text-[#6B7280] mt-1.5">All users must have email addresses on this domain.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="country" className={labelCls}>Country <span className="text-[#DC2626]" aria-hidden="true">*</span></label>
              <select id="country" name="country" required className={selectCls} defaultValue="">
                <option value="" disabled>Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="timezone" className={labelCls}>Timezone <span className="text-[#DC2626]" aria-hidden="true">*</span></label>
              <select id="timezone" name="timezone" required className={selectCls} defaultValue="UTC">
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="currency" className={labelCls}>Currency <span className="text-[#DC2626]" aria-hidden="true">*</span></label>
              <select id="currency" name="currency" required className={selectCls} defaultValue="USD">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Super Admin */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6 space-y-5">
          <h2 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest">
            Super Admin Account
          </h2>
          <div>
            <label htmlFor="superAdminEmail" className={labelCls}>
              Super Admin Email <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <input
              id="superAdminEmail"
              name="superAdminEmail"
              type="email"
              required
              placeholder={`admin@${primaryDomain || 'company.com'}`}
              className={inputCls}
            />
            <p className="text-[12px] text-[#6B7280] mt-1.5">
              An invitation will be sent to this address. Must be on the primary domain.
            </p>
          </div>
        </div>

        {/* SECTION 4: Optional details */}
        <details className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <summary className="px-5 py-4 text-[13px] font-semibold text-[#374151] cursor-pointer list-none flex items-center justify-between">
            Optional Details
            <span className="text-[#9CA3AF] text-[12px] font-normal">Logo, secondary domains, phone</span>
          </summary>
          <div className="px-5 pb-5 pt-0 space-y-4 border-t border-[#E5E7EB]">
            <div className="mt-4">
              <label htmlFor="secondaryDomains" className={labelCls}>Secondary Domains</label>
              <input id="secondaryDomains" name="secondaryDomains" placeholder="domain2.com, domain3.com" className={inputCls} />
            </div>
            <div>
              <label htmlFor="logoUrl" className={labelCls}>Logo URL</label>
              <input id="logoUrl" name="logoUrl" type="url" placeholder="https://company.com/logo.png" className={inputCls} />
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>Phone</label>
              <input id="phone" name="phone" type="tel" placeholder="+1 555 000 0000" className={inputCls} />
            </div>
          </div>
        </details>

        {/* Error */}
        {state.error && (
          <div role="alert" aria-live="polite"
            className="flex items-start gap-3 p-4 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
            <AlertCircle size={16} className="text-[#DC2626] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#991B1B]">{state.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0F2147] text-white text-[14px] font-semibold rounded-[6px] hover:bg-[#1a3460] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2"
          >
            {isPending && <Loader2 size={15} className="animate-spin" />}
            {isPending ? 'Provisioning…' : 'Provision Tenant'}
          </button>
          <Link href="/flexadmin/tenants" className="text-[14px] text-[#6B7280] hover:text-[#374151] transition-colors">
            Cancel
          </Link>
        </div>

      </form>
    </div>
  )
}
