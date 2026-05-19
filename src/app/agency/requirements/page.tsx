import { Briefcase } from 'lucide-react'

export default function AgencyRequirements() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-[#0F2147]">Open Requirements</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Requirements available for your submissions</p>
      </div>
      <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase size={40} className="text-[#D1D5DB] mb-3" />
          <p className="text-[14px] font-medium text-[#374151]">No open requirements</p>
          <p className="text-[13px] text-[#6B7280] mt-1">Requirements assigned to your agency will appear here</p>
        </div>
      </div>
    </div>
  )
}
