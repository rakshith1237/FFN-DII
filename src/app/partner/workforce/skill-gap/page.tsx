'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type GapRow = { skill: string; required: number; available: number; gap: number }

export default function SkillGapPage() {
  const [data, setData] = useState<GapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workforce/skill-gap')
      .then(r => r.json())
      .then(j => { setData(j.data ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load skill gap data'); setLoading(false) })
  }, [])

  if (loading) return <div className="p-6 text-sm text-[#6B7280]">Loading skill gap analysis...</div>
  if (error)   return <div className="p-6 text-sm text-red-600">{error}</div>

  const withGap    = data.filter(d => d.gap > 0).length
  const fullyMet   = data.filter(d => d.gap === 0 && d.required > 0).length

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#0F2147] mb-2">Skill Gap Analysis</h1>
      <p className="text-sm text-[#6B7280] mb-6">Required skills from approved headcount vs available bench candidates.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs text-red-600 font-semibold uppercase">Skills with Gap</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{withGap}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-600 font-semibold uppercase">Skills Fully Met</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{fullyMet}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-[#6B7280]">No headcount or bench data found.</p>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="skill" tick={{ fontSize: 11, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip />
              <Legend verticalAlign="top" />
              <Bar dataKey="available" name="Available (Bench)" fill="#10B981" radius={[3,3,0,0]} />
              <Bar dataKey="gap"       name="Gap (Unfilled)"    fill="#EF4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
