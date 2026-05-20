'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FFN] Route error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
      <AlertCircle size={40} className="text-[#DC2626] mb-4" />
      <h2 className="text-[18px] font-bold text-[#0F2147] mb-2">
        Something went wrong
      </h2>
      <p className="text-[13px] text-[#6B7280] mb-6 max-w-[360px]">
        {error.digest ? `Error reference: ${error.digest}` : 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0F2147] rounded-[6px] hover:bg-[#1a3460] transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
