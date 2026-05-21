'use client'
import { useState, useTransition } from 'react'
import { exportAuditLogCsv } from '@/lib/actions/admin/export-audit-log'

type AuditRow = {
  id:          string
  tenant_id:   string | null
  persona_code: string
  action:      string
  entity_type: string
  entity_id:   string | null
  ip_address:  string | null
  created_at:  string
}

type Tenant = { id: string; name: string; type: string }

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AuditLogClient({
  tenants,
  initialRows,
}: {
  tenants:     Tenant[]
  initialRows: AuditRow[]
}) {
  const [filters, setFilters] = useState({ tenantId: '', startDate: '', endDate: '', actionType: '' })
  const [rows, setRows]       = useState<AuditRow[]>(initialRows)
  const [exporting, startExport] = useTransition()

  function handleExport() {
    startExport(async () => {
      const { csv, error } = await exportAuditLogCsv(filters)
      if (error || !csv) { alert(error ?? 'Export failed'); return }
      downloadCsv(csv, `audit-log-${new Date().toISOString().split('T')[0]}.csv`)
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 grid grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">Tenant</label>
          <select value={filters.tenantId}
            onChange={e => setFilters(p => ({ ...p, tenantId: e.target.value }))}
            className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded bg-white focus:ring-2 focus:ring-[#3B82F6] focus:outline-none">
            <option value="">All Tenants</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">From</label>
          <input type="date" value={filters.startDate}
            onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
            className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">To</label>
          <input type="date" value={filters.endDate}
            onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
            className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">Action contains</label>
          <input placeholder="e.g. submission" value={filters.actionType}
            onChange={e => setFilters(p => ({ ...p, actionType: e.target.value }))}
            className="w-full h-9 px-2 text-sm border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
        </div>
        <div className="col-span-4 flex justify-end">
          <button onClick={handleExport} disabled={exporting}
            className="px-4 py-2 text-sm bg-[#0F2147] text-white font-semibold rounded hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Virtual scroll table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#F9FAFB] z-10">
              <tr className="border-b border-[#E5E7EB]">
                {['Time','Persona','Action','Entity','IP'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <td className="py-1.5 px-3 text-[#6B7280] whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-1.5 px-3 font-mono text-[#374151]">{row.persona_code}</td>
                  <td className="py-1.5 px-3 text-[#111827]">{row.action}</td>
                  <td className="py-1.5 px-3 text-[#6B7280]">{row.entity_type}</td>
                  <td className="py-1.5 px-3 text-[#9CA3AF] font-mono">{row.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-8 text-center text-sm text-[#6B7280]">No audit log entries found.</div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-[#E5E7EB] bg-[#F9FAFB] text-xs text-[#9CA3AF]">
          Showing {rows.length} rows (most recent 200). Use Export CSV for full filtered data.
        </div>
      </div>
    </div>
  )
}
