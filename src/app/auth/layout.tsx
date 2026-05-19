export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <div className="bg-[#0F2147] h-16 px-6 flex items-center">
        <span className="text-white font-semibold text-xl tracking-tight">FlexForceNow</span>
      </div>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm px-8 py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
