'use client'

import Link from 'next/link'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { ArrowLeft } from 'lucide-react'
import { OVERRIDE_REASON_LABELS } from '@/lib/actions/override/create-override-request'

interface OverrideAnalyticsClientProps {
  jdTitle:   string
  jdId:      string
  overrides: Record<string, unknown>[]
}

const PIE_COLORS = ['#0F2147', '#E8531E', '#3B82F6', '#16A34A', '#D97706', '#9CA3AF']

export default function OverrideAnalyticsClient({
  jdTitle, jdId, overrides,
}: OverrideAnalyticsClientProps) {

  const total        = overrides.length
  const approved     = overrides.filter(o => o['status'] === 'approved').length
  const rejected     = overrides.filter(o => o['status'] === 'rejected').length
  const pending      = overrides.filter(o => o['status'] === 'requested').length
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

  // By reason_code for PieChart
  const byReason = Object.entries(
    overrides.reduce<Record<string, number>>((acc, o) => {
      const code = String(o['reason_code'] ?? 'other')
      acc[code]  = (acc[code] ?? 0) + 1
      return acc
    }, {})
  ).map(([code, count]) => ({
    name:  OVERRIDE_REASON_LABELS[code as keyof typeof OVERRIDE_REASON_LABELS] ?? code,
    value: count,
  }))

  // By week for BarChart
  const byWeek = Object.entries(
    overrides.reduce<Record<string, { total: number; approved: number }>>((acc, o) => {
      const date   = new Date(String(o['created_at']))
      const monday = new Date(date)
      monday.setDate(date.getDate() - date.getDay() + 1)
      const key = monday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      if (!acc[key]) acc[key] = { total: 0, approved: 0 }
      const entry = acc[key]!
      entry.total++
      if (o['status'] === 'approved') entry.approved++
      return acc
    }, {})
  ).map(([week, data]) => ({ week, ...data }))

  const kpis = [
    { label: 'Total Requests',  value: total,              color: '#0F2147' },
    { label: 'Approved',        value: approved,           color: '#16A34A' },
    { label: 'Rejected',        value: rejected,           color: '#DC2626' },
    { label: 'Pending Review',  value: pending,            color: '#D97706' },
    { label: 'Approval Rate',   value: `${approvalRate}%`, color: approvalRate >= 50 ? '#16A34A' : '#DC2626' },
  ]

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-6">
        <Link href={`/partner/jd/${jdId}/decision-vault`}
          className="flex items-center gap-1 hover:text-[#374151]">
          <ArrowLeft size={14} /> Decision Vault
        </Link>
        <span>/</span>
        <span className="text-[#374151] font-medium">Override Analytics</span>
      </div>

      <div className="border-l-4 border-l-[#0F2147] pl-4 py-1 mb-6">
        <h1 className="text-[22px] font-bold text-[#0F2147]">Override Analytics</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">{jdTitle}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-4 text-center">
            <p className="text-[26px] font-black" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <p className="text-[14px]">No override requests for this JD yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Pie: overrides by reason */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-5">
            <p className="text-[13px] font-bold text-[#374151] mb-4">By Reason</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byReason} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`
                  }
                  labelLine={false}>
                  {byReason.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar: overrides per week */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-5">
            <p className="text-[13px] font-bold text-[#374151] mb-4">Weekly Volume</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byWeek} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total"    name="Total"    fill="#0F2147" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" name="Approved" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
