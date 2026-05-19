import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-[400px]">
        {/* FFN Wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            {/* FFN Monogram */}
            <div className="w-10 h-10 rounded-[8px] bg-[#0F2147] flex items-center justify-center">
              <span className="text-white font-black text-sm tracking-tighter">FFN</span>
            </div>
            <span className="text-xl font-bold text-[#0F2147] tracking-tight">FlexForceNow</span>
          </div>
        </div>
        {/* Card */}
        <div className="bg-white rounded-[8px] shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] border border-[#E5E7EB] p-8">
          {children}
        </div>
        {/* Footer */}
        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          © {new Date().getFullYear()} DivIHN Integration Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}
