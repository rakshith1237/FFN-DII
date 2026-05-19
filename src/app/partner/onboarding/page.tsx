'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, Building2, Loader2, AlertCircle } from 'lucide-react'
import { useActionState } from 'react'
import { completePartnerSetup, type PartnerSetupState } from '@/lib/actions/org/complete-partner-setup'

const INDUSTRIES = [
  'Technology', 'Financial Services', 'Healthcare', 'Government',
  'Retail', 'Manufacturing', 'Energy', 'Education', 'Consulting', 'Other',
]
const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'INR', 'AED']
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Dublin', 'Europe/Amsterdam',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
]
const FISCAL_MONTHS = [
  { value: '1', label: 'January' },  { value: '2', label: 'February' },
  { value: '3', label: 'March' },    { value: '4', label: 'April' },
  { value: '5', label: 'May' },      { value: '6', label: 'June' },
  { value: '7', label: 'July' },     { value: '8', label: 'August' },
  { value: '9', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' },{ value: '12', label: 'December' },
]

const inputCls = 'w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors'
const labelCls = 'block text-[13px] font-bold text-[#374151] mb-1.5'
const selectCls = inputCls + ' cursor-pointer'

const initialState: PartnerSetupState = {}

export default function PartnerOnboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  const [step1State, step1Action, step1Pending] = useActionState(completePartnerSetup, initialState)
  const [step3State, step3Action, step3Pending] = useActionState(completePartnerSetup, initialState)

  useEffect(() => {
    if (step1State.step === 1 && step1State.success) {
      setCurrentStep(2)
    }
  }, [step1State])

  useEffect(() => {
    if (step3State.step === 3 && step3State.success) {
      router.push('/partner/dashboard')
    }
  }, [step3State, router])

  const STEP_LABELS = ['Organisation', 'Branding', 'Settings']

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-[600px]">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-[8px] bg-[#0F2147] flex items-center justify-center">
              <span className="text-white font-black text-xs">FFN</span>
            </div>
            <span className="text-xl font-bold text-[#0F2147]">FlexForceNow</span>
          </div>
          <h1 className="text-[24px] font-bold text-[#0F2147]">Set Up Your Organisation</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">Complete your Partner profile to get started</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                currentStep > step
                  ? 'bg-[#16A34A] text-white'
                  : currentStep === step
                    ? 'bg-[#0F2147] text-white'
                    : 'bg-[#E5E7EB] text-[#9CA3AF]'
              }`}>
                {currentStep > step ? <CheckCircle2 size={16} /> : step}
              </div>
              <span className={`text-[12px] font-medium ${currentStep === step ? 'text-[#0F2147]' : 'text-[#9CA3AF]'}`}>
                {STEP_LABELS[step - 1]}
              </span>
              {step < 3 && <div className="flex-1 h-px bg-[#E5E7EB]" />}
            </div>
          ))}
        </div>

        {/* Step 1: Organisation Details */}
        {currentStep === 1 && (
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6">
            <h2 className="text-[16px] font-bold text-[#0F2147] mb-5">Organisation Details</h2>
            <form action={step1Action} className="space-y-4">
              <input type="hidden" name="step" value="1" />
              <div>
                <label htmlFor="orgDisplayName" className={labelCls}>
                  Organisation Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="orgDisplayName" name="orgDisplayName" required
                  minLength={3} maxLength={100}
                  placeholder="e.g. Accenture Federal"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="industry" className={labelCls}>
                    Industry <span className="text-[#DC2626]">*</span>
                  </label>
                  <select id="industry" name="industry" required className={selectCls} defaultValue="">
                    <option value="" disabled>Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="currency" className={labelCls}>
                    Currency <span className="text-[#DC2626]">*</span>
                  </label>
                  <select id="currency" name="currency" required className={selectCls} defaultValue="USD">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {step1State.error && (
                <div role="alert" className="flex items-start gap-2 p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
                  <AlertCircle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
                  <p className="text-[12px] text-[#991B1B]">{step1State.error}</p>
                </div>
              )}
              <button
                type="submit" disabled={step1Pending}
                className="w-full h-11 bg-[#0F2147] text-white text-[14px] font-bold rounded-[6px] hover:bg-[#1a3460] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {step1Pending && <Loader2 size={16} className="animate-spin" />}
                {step1Pending ? 'Saving…' : 'Continue'}
                {!step1Pending && <ChevronRight size={16} />}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Branding */}
        {currentStep === 2 && (
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6 text-center">
            <Building2 size={40} className="text-[#D1D5DB] mx-auto mb-3" />
            <h2 className="text-[16px] font-bold text-[#0F2147] mb-2">Organisation Logo</h2>
            <p className="text-[14px] text-[#6B7280] mb-6">
              Logo upload is available in a future update. You can add it later in Company Settings.
            </p>
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0F2147] text-white text-[14px] font-bold rounded-[6px] hover:bg-[#1a3460]"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6">
            <h2 className="text-[16px] font-bold text-[#0F2147] mb-5">Regional Settings</h2>
            <form action={step3Action} className="space-y-4">
              <input type="hidden" name="step" value="3" />
              <div>
                <label htmlFor="timezone" className={labelCls}>
                  Timezone <span className="text-[#DC2626]">*</span>
                </label>
                <select id="timezone" name="timezone" required className={selectCls} defaultValue="UTC">
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="fiscalYearStart" className={labelCls}>Fiscal Year Start</label>
                <select id="fiscalYearStart" name="fiscalYearStart" className={selectCls} defaultValue="1">
                  {FISCAL_MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {step3State.error && (
                <div role="alert" className="flex items-start gap-2 p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
                  <AlertCircle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
                  <p className="text-[12px] text-[#991B1B]">{step3State.error}</p>
                </div>
              )}
              <button
                type="submit" disabled={step3Pending}
                className="w-full h-11 bg-[#E8531E] text-white text-[14px] font-bold rounded-[6px] hover:bg-[#d44718] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {step3Pending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <CheckCircle2 size={16} />}
                {step3Pending ? 'Finishing…' : 'Complete Setup'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
