'use client'
import { useState, useTransition } from 'react'
import { saveSsoConfig } from '@/lib/actions/sso/save-sso-config'

type Existing = {
  idp_metadata_xml:      string
  attribute_persona_key: string
  attribute_email_key:   string
  attribute_name_key:    string
  configured_at:         string
} | null

export function SsoConfigForm({ existing }: { existing: Existing }) {
  const [xml,       setXml]       = useState(existing?.idp_metadata_xml      ?? '')
  const [personaKey,setPersonaKey]= useState(existing?.attribute_persona_key  ?? 'groups')
  const [emailKey,  setEmailKey]  = useState(existing?.attribute_email_key    ?? 'email')
  const [nameKey,   setNameKey]   = useState(existing?.attribute_name_key     ?? 'displayName')
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveSsoConfig({
        idpMetadataXml:      xml,
        attributePersonaKey: personaKey,
        attributeEmailKey:   emailKey,
        attributeNameKey:    nameKey,
      })
      if (result.error) { setError(result.error); return }
      setSaved(true)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-[#374151] mb-1">
          IdP Metadata XML <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-[#6B7280] mb-2">
          Download the SAML metadata XML from your identity provider (Okta, Azure AD, Google Workspace, etc.) and paste it here.
        </p>
        <textarea
          rows={10}
          value={xml}
          onChange={e => setXml(e.target.value)}
          placeholder={'<?xml version="1.0" ?>\n<md:EntityDescriptor ...>'}
          className="w-full px-3 py-2 text-xs font-mono border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:outline-none resize-none"
        />
      </div>

      <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-4 space-y-3">
        <p className="text-xs font-semibold text-[#6B7280] uppercase">Attribute Mappings</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Persona/Groups attribute', value: personaKey, onChange: setPersonaKey, placeholder: 'groups' },
            { label: 'Email attribute',           value: emailKey,  onChange: setEmailKey,   placeholder: 'email' },
            { label: 'Name attribute',            value: nameKey,   onChange: setNameKey,    placeholder: 'displayName' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium text-[#374151] mb-1">{f.label}</label>
              <input
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-9 px-2 text-sm font-mono border border-[#D1D5DB] rounded focus:ring-2 focus:ring-[#3B82F6] focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEE2E2] border-l-4 border-[#DC2626] rounded text-sm text-[#991B1B]">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded text-sm text-green-700">
          SSO configuration saved. The FlexAdmin team will activate it within 24 hours.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || !xml.trim()}
          className="px-6 py-2.5 bg-[#0F2147] text-white text-sm font-semibold rounded-md hover:bg-[#1a3460] disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Saving...' : 'Save SSO Configuration'}
        </button>
        {existing?.configured_at && (
          <p className="text-xs text-[#9CA3AF]">
            Last saved: {new Date(existing.configured_at).toLocaleDateString('en-GB')}
          </p>
        )}
      </div>
    </div>
  )
}
