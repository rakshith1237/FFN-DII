'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function DashboardCharts({ data }: { data: { month: string; placements: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="placementGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0F2147" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0F2147" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="placements"
          name="Placements"
          stroke="#0F2147"
          strokeWidth={2}
          fill="url(#placementGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
