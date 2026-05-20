export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#0F2147] rounded-full animate-spin" />
        <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
      </div>
    </div>
  )
}
