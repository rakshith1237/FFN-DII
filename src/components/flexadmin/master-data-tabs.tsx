'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { upsertSkill, toggleSkillActive } from '@/lib/actions/admin/upsert-skill'

type Skill = { id: string; code: string; name: string; category: string; parent_id: string | null; is_active: boolean }
type Domain = { id: string; code: string; name: string; is_active: boolean }

const TABS = [
  { key: 'skills',             label: 'Skills' },
  { key: 'domains-functional', label: 'Functional Domains' },
  { key: 'domains-business',   label: 'Business Domains' },
]

const CATEGORIES = ['technical','certification','soft_skill','tool','language','domain','other']

function SkillRow({ skill, onToggle }: { skill: Skill; onToggle: (id: string, active: boolean) => void }) {
  return (
    <tr className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
      <td className="py-2 px-3 text-xs font-mono text-[#374151]">{skill.code}</td>
      <td className="py-2 px-3 text-sm text-[#111827]">{skill.name}</td>
      <td className="py-2 px-3 text-xs text-[#6B7280]">{skill.category}</td>
      <td className="py-2 px-3">
        <button onClick={() => onToggle(skill.id, !skill.is_active)}
          className={`px-2 py-0.5 text-xs rounded-full font-medium ${skill.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {skill.is_active ? 'Active' : 'Inactive'}
        </button>
      </td>
    </tr>
  )
}

export function MasterDataTabs({
  activeTab,
  skills: initialSkills,
  funcDomains,
  bizDomains,
}: {
  activeTab: string
  skills: Skill[]
  funcDomains: Domain[]
  bizDomains: Domain[]
}) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [newSkill, setNewSkill] = useState({ code: '', name: '', category: 'technical', parentId: '' })
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleSkillActive(id, active)
      setSkills(prev => prev.map(s => s.id === id ? { ...s, is_active: active } : s))
    })
  }

  function handleAddSkill() {
    setError(null)
    startTransition(async () => {
      const result = await upsertSkill({
        code:     newSkill.code,
        name:     newSkill.name,
        category: newSkill.category,
        parentId: newSkill.parentId || null,
      })
      if (result.error) { setError(result.error); return }
      setNewSkill({ code: '', name: '', category: 'technical', parentId: '' })
    })
  }

  const groupedSkills = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    acc[s.category] = [...(acc[s.category] ?? []), s]
    return acc
  }, {})

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-[#E5E7EB]">
        {TABS.map(t => (
          <Link key={t.key} href={`/flexadmin/master-data?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-[#0F2147] text-[#0F2147]'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Add skill form */}
          <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-xs font-semibold text-[#6B7280] uppercase mb-3">Add Skill</p>
            <div className="grid grid-cols-4 gap-3">
              <input placeholder="CODE" value={newSkill.code}
                onChange={e => setNewSkill(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="h-9 px-2 text-sm border border-[#D1D5DB] rounded font-mono focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
              <input placeholder="Name" value={newSkill.name}
                onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))}
                className="h-9 px-2 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
              <select value={newSkill.category}
                onChange={e => setNewSkill(p => ({ ...p, category: e.target.value }))}
                className="h-9 px-2 text-sm border border-[#D1D5DB] rounded bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={handleAddSkill}
                className="h-9 px-4 bg-[#0F2147] text-white text-sm font-semibold rounded hover:bg-[#1a3460] transition-colors">
                Add Skill
              </button>
            </div>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>

          {/* Skill tree by category */}
          {Object.entries(groupedSkills).map(([category, catSkills]) => (
            <div key={category} className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
              <div className="px-4 py-2 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <span className="text-xs font-bold text-[#6B7280] uppercase">{category} ({catSkills.length})</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {['Code','Name','Category','Status'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-[#9CA3AF]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catSkills.map(s => <SkillRow key={s.id} skill={s} onToggle={handleToggle} />)}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {(activeTab === 'domains-functional' || activeTab === 'domains-business') && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Code','Name','Status'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#9CA3AF] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'domains-functional' ? funcDomains : bizDomains).map(d => (
                <tr key={d.id} className="border-b border-[#F3F4F6]">
                  <td className="py-2 px-4 font-mono text-xs text-[#374151]">{d.code}</td>
                  <td className="py-2 px-4 text-[#111827]">{d.name}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
