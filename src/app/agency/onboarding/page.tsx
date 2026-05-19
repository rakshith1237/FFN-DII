'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { useActionState } from 'react'
import { completeAgencySetup, type AgencySetupState } from '@/lib/actions/org/complete-agency-setup'

const SPECIALISATIONS = [
  'ServiceNow', 'SAP', 'Salesforce', 'AWS',
  'Microsoft', 'Oracle', 'Workday', 'General IT',
]
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Dublin', 'Europe/Amsterdam',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
]

const inputCls = 'w-full h-10 px-3 text-[14px] border border-[#D1D5DB] rounded-[6px] bg-white text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors'
const labelCls = 'block text-[13px] font-bold text-[#374151] mb-1.5'
const selectCls = inputCls + ' cursor-pointer'

const initialState: AgencySetupState = {}

export default function AgencyOnboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([])

  const [step1State, step1Action, step1Pending] = useActionState(completeAgencySetup, initialState)
  const [step2State, step2Action, step2Pending] = useActionState(completeAgencySetup, initialState)

  useEffect(() => {
    if (step1State.step === 1 && step1State.success) {
      setCurrentStep(2)
    }
  }, [step1State])

  useEffect(() => {
    if (step2State.step === 2 && step2State.success) {
      router.push('/agency/dashboard')
    }
  }, [step2State, router])

  const STEP_LABELS = ['Agency Details', 'Settings']

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
          <h1 className="text-[24px] font-bold text-[#0F2147]">Set Up Your Agency</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">Complete your Agency profile to get started</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((step) => (
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
              {step < 2 && <div className="flex-1 h-px bg-[#E5E7EB]" />}
            </div>
          ))}
        </div>

        {/* Step 1: Agency Details */}
        {currentStep === 1 && (
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6">
            <h2 className="text-[16px] font-bold text-[#0F2147] mb-5">Agency Details</h2>
            <form action={step1Action} className="space-y-4">
              <input type="hidden" name="step" value="1" />
              <input type="hidden" name="specialisations" value={selectedSpecs.join(',')} />
              <div>
                <label htmlFor="orgDisplayName" className={labelCls}>
                  Agency Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="orgDisplayName" name="orgDisplayName" required
                  minLength={3} maxLength={100}
                  placeholder="e.g. TechBridge Staffing"
                  className={inputCls}
                />
              </div>
              <div>
                <p className={labelCls}>
                  Specialisations <span className="text-[#DC2626]">*</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALISATIONS.map((spec) => (
                    <label
                      key={spec}
                      className="flex items-center gap-2.5 px-3 py-2.5 border border-[#E5E7EB] rounded-[6px] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSpecs.includes(spec)}
                        onChange={(e) => {
                          setSelectedSpecs(prev =>
                            e.target.checked
                              ? [...prev, spec]
                              : prev.filter(s => s !== spec)
                          )
                        }}
                        className="w-4 h-4 rounded border-[#D1D5DB] text-[#0F2147] focus:ring-[#3B82F6]"
                      />
                      <span className="text-[13px] text-[#374151]">{spec}</span>
                    </label>
                  ))}
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

        {/* Step 2: Regional Settings */}
        {currentStep === 2 && (
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6">
            <h2 className="text-[16px] font-bold text-[#0F2147] mb-5">Regional Settings</h2>
            <form action={step2Action} className="space-y-4">
              <input type="hidden" name="step" value="2" />
              <div>
                <label htmlFor="timezone" className={labelCls}>
                  Timezone <span className="text-[#DC2626]">*</span>
                </label>
                <select id="timezone" name="timezone" required className={selectCls} defaultValue="UTC">
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {step2State.error && (
                <div role="alert" className="flex items-start gap-2 p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded-[6px]">
                  <AlertCircle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
                  <p className="text-[12px] text-[#991B1B]">{step2State.error}</p>
                </div>
              )}
              <button
                type="submit" disabled={step2Pending}
                className="w-full h-11 bg-[#E8531E] text-white text-[14px] font-bold rounded-[6px] hover:bg-[#d44718] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {step2Pending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <CheckCircle2 size={16} />}
                {step2Pending ? 'Finishing…' : 'Complete Setup'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
