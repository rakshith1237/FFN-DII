'use client'
import { useState, useTransition } from 'react'
import { generateApiKey, revokeApiKey } from '@/lib/actions/api-keys/generate-api-key'
import { Copy, Eye, EyeOff, Plus, Trash2, CheckCircle, Key } from 'lucide-react'

type ApiKey = {
  id:             string
  name:           string
  scopes:         string[]
  is_active:      boolean
  last_used_at:   string | null
  created_at:     string
  rate_limit_rpm: number
}

const SCOPE_LABELS: Record<string, string> = {
  read:  'Read — GET /v1/candidates, GET /v1/placements',
  write: 'Write — POST /v1/candidates',
  admin: 'Admin — all endpoints',
}

export function ApiKeysManager({ existingKeys }: { existingKeys: ApiKey[] }) {
  const [keys,      setKeys]      = useState<ApiKey[]>(existingKeys)
  const [showForm,  setShowForm]  = useState(false)
  const [name,      setName]      = useState('')
  const [scopes,    setScopes]    = useState<string[]>(['read'])
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [copied,    setCopied]    = useState(false)
  const [showKey,   setShowKey]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleScope(scope: string) {
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])
  }

  function handleGenerate() {
    setError(null)
    if (!name.trim()) { setError('Key name is required'); return }
    if (!scopes.length) { setError('Select at least one scope'); return }

    startTransition(async () => {
      const result = await generateApiKey({ name: name.trim(), scopes })
      if (result.error) { setError(result.error); return }
      setNewRawKey(result.rawKey)
      setShowForm(false)
      setName('')
      setScopes(['read'])
      // Refresh — reload keys list by adding a placeholder (page will revalidate)
      window.location.reload()
    })
  }

  function handleRevoke(keyId: string, keyName: string) {
    if (!confirm(`Revoke API key "${keyName}"? This cannot be undone — all integrations using this key will stop working.`)) return
    startTransition(async () => {
      const result = await revokeApiKey(keyId)
      if (result.error) { setError(result.error); return }
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, is_active: false } : k))
    })
  }

  function handleCopy() {
    if (!newRawKey) return
    navigator.clipboard.writeText(newRawKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {/* New key reveal */}
      {newRawKey && (
        <div className="p-4 bg-green-50 border-2 border-green-400 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm font-bold text-green-800">API key generated — copy it now. It will not be shown again.</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 font-mono text-xs bg-white border border-green-200 rounded px-3 py-2 overflow-hidden">
              {showKey ? newRawKey : '•'.repeat(Math.min(newRawKey.length, 60))}
            </div>
            <button onClick={() => setShowKey(p => !p)} className="p-2 text-green-700 hover:text-green-900">
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700">
              {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="mt-3 text-xs text-green-700 underline">
            I have saved the key — dismiss this
          </button>
        </div>
      )}

      {/* Existing keys */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#374151]">
            API Keys <span className="text-[#9CA3AF] font-normal">({keys.filter(k => k.is_active).length} active)</span>
          </h2>
          <button onClick={() => setShowForm(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F2147] text-white text-xs font-semibold rounded-lg hover:bg-[#1a3460] transition-colors">
            <Plus size={13} /> New Key
          </button>
        </div>

        {/* New key form */}
        {showForm && (
          <div className="p-5 border-b border-[#E5E7EB] bg-[#F0F4FF]">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Key Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Production ATS Integration"
                  className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-2">Scopes *</label>
                <div className="space-y-2">
                  {Object.entries(SCOPE_LABELS).map(([scope, label]) => (
                    <label key={scope} className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={scopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-[#374151] capitalize">{scope}</span>
                        <span className="text-xs text-[#6B7280] ml-1">— {label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button onClick={handleGenerate} disabled={isPending}
                  className="px-4 py-2 bg-[#0F2147] text-white text-xs font-semibold rounded-lg hover:bg-[#1a3460] disabled:opacity-60 transition-colors">
                  {isPending ? 'Generating...' : 'Generate Key'}
                </button>
                <button onClick={() => { setShowForm(false); setError(null) }}
                  className="px-4 py-2 border border-[#D1D5DB] text-xs rounded-lg hover:bg-white">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Key list */}
        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key size={32} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">No API keys yet. Generate your first key to start integrating.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {keys.map(key => (
              <div key={key.id} className={`flex items-center gap-4 px-5 py-4 ${!key.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#374151]">{key.name}</p>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      key.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[#9CA3AF]">
                    <span>Scopes: {key.scopes.join(', ')}</span>
                    <span>·</span>
                    <span>{key.rate_limit_rpm} req/min</span>
                    <span>·</span>
                    <span>Created {new Date(key.created_at).toLocaleDateString('en-GB')}</span>
                    {key.last_used_at && (
                      <>
                        <span>·</span>
                        <span>Last used {new Date(key.last_used_at).toLocaleDateString('en-GB')}</span>
                      </>
                    )}
                  </div>
                </div>
                {key.is_active && (
                  <button
                    onClick={() => handleRevoke(key.id, key.name)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={12} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
        <p className="text-xs font-semibold text-[#374151] mb-2">Usage</p>
        <pre className="text-xs font-mono text-[#374151] whitespace-pre-wrap">{`# List candidates
curl https://hirenowwithflex.us/api/v1/candidates \\
  -H "X-API-Key: ffnk_your_key_here"

# Create a candidate
curl -X POST https://hirenowwithflex.us/api/v1/candidates \\
  -H "X-API-Key: ffnk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"first_name":"Jane","last_name":"Doe","email":"jane@example.com"}'

# List placements
curl https://hirenowwithflex.us/api/v1/placements \\
  -H "X-API-Key: ffnk_your_key_here"`}
        </pre>
      </div>
    </div>
  )
}
