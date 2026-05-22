import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#374151]">← Back</Link>
        </div>
        <h1 className="text-3xl font-bold text-[#0F2147] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#6B7280] mb-10">
          Last updated: 22 May 2026 · DivIHN Integration Inc.
        </p>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 space-y-8 text-[#374151]">

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">1. Who we are</h2>
            <p className="text-sm leading-relaxed">
              FlexForceNow is operated by DivIHN Integration Inc., registered in Aberdeen, UK.
              We provide a B2B SaaS workforce management platform that connects hiring organisations
              (Partners) with recruitment agencies and contingent workers.
              Our registered email: <a href="mailto:dpo@hirenowwithflex.us" className="text-[#0F2147] underline">dpo@hirenowwithflex.us</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">2. Data we collect</h2>
            <p className="text-sm leading-relaxed mb-3">We process the following categories of personal data:</p>
            <ul className="text-sm space-y-2 list-none">
              {[
                ['Platform Users (HMs, Recruiters, Agency staff)', 'Name, work email, login timestamps, activity logs, IP address'],
                ['Candidates', 'Name, email, phone, CV/resume, location, skills, employment history, IR35 status, rate expectations'],
                ['Billing contacts', 'Name, email, company name, Stripe payment tokens (we never store raw card numbers)'],
              ].map(([who, what]) => (
                <li key={who as string} className="pl-4 border-l-2 border-[#E5E7EB]">
                  <span className="font-semibold text-[#374151]">{who}</span>
                  <span className="text-[#6B7280]"> — {what}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">3. Legal basis for processing</h2>
            <div className="text-sm space-y-2">
              {[
                ['Contract performance (Art. 6(1)(b))', 'Providing the platform service to paying customers'],
                ['Legitimate interests (Art. 6(1)(f))', 'Security monitoring, fraud prevention, product improvement'],
                ['Legal obligation (Art. 6(1)(c))', 'Audit log retention (7 years), financial records, HMRC IR35 SDS'],
              ].map(([basis, purpose]) => (
                <div key={basis as string} className="flex gap-3">
                  <span className="font-semibold text-[#374151] min-w-[280px]">{basis}</span>
                  <span className="text-[#6B7280]">{purpose}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">4. How we use your data</h2>
            <ul className="text-sm space-y-1.5 list-disc list-inside text-[#6B7280]">
              <li>Providing and improving the FlexForceNow platform</li>
              <li>Facilitating candidate submission, RTR e-signature, and placement workflows</li>
              <li>AI-assisted job description parsing and candidate scoring (skill descriptions only — no PII sent to AI APIs)</li>
              <li>Sending transactional emails (interview confirmations, offer notifications, invoice alerts)</li>
              <li>Processing subscription payments via Stripe</li>
              <li>Maintaining a tamper-evident audit trail for compliance purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">5. Who we share data with</h2>
            <p className="text-sm text-[#6B7280] mb-3">
              We share data only with sub-processors required to deliver the platform. All sub-processors
              are GDPR-compliant and operate under Data Processing Agreements:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Supabase Inc.', 'Database, Auth, Storage (EU West — London)'],
                ['Vercel Inc.', 'Frontend hosting (EU Frankfurt)'],
                ['Render Inc.', 'Background worker hosting (EU)'],
                ['Resend Inc.', 'Transactional email'],
                ['Anthropic Inc.', 'AI API (JD parsing, scoring — no PII)'],
                ['OpenAI Inc.', 'Embeddings API (skill text only)'],
                ['Stripe Inc.', 'Subscription billing and payments'],
                ['DocuSign Inc.', 'Electronic signature (RTR documents)'],
              ].map(([vendor, role]) => (
                <div key={vendor as string} className="p-2 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <p className="font-semibold text-[#374151]">{vendor}</p>
                  <p className="text-[#6B7280] mt-0.5">{role}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">6. Data retention</h2>
            <div className="text-sm space-y-1.5 text-[#6B7280]">
              <p><span className="font-semibold text-[#374151]">Candidate PII:</span> Duration of engagement + 12 months</p>
              <p><span className="font-semibold text-[#374151]">User accounts:</span> Duration of subscription + 90 days</p>
              <p><span className="font-semibold text-[#374151]">Audit logs:</span> 7 years (legal obligation — HMRC, Companies Act)</p>
              <p><span className="font-semibold text-[#374151]">IR35 SDS records:</span> 7 years (HMRC requirement)</p>
              <p><span className="font-semibold text-[#374151]">Financial records:</span> 7 years (legal obligation)</p>
              <p><span className="font-semibold text-[#374151]">IP addresses in logs:</span> 90 days, then nullified</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">7. Your rights under UK/EU GDPR</h2>
            <div className="text-sm space-y-2 text-[#6B7280]">
              <p><span className="font-semibold text-[#374151]">Right of Access (Art. 15):</span> Request a copy of your personal data. Response within 30 days.</p>
              <p><span className="font-semibold text-[#374151]">Right to Erasure (Art. 17):</span> Request deletion of your personal data. Processed within 72 hours. Note: audit logs and financial records are retained per Art. 17(3) legal obligation.</p>
              <p><span className="font-semibold text-[#374151]">Right to Rectification (Art. 16):</span> Correct inaccurate data via your account settings or by contacting us.</p>
              <p><span className="font-semibold text-[#374151]">Right to Portability (Art. 20):</span> Receive your data in machine-readable format.</p>
              <p><span className="font-semibold text-[#374151]">Right to Object (Art. 21):</span> Object to processing based on legitimate interests.</p>
              <p className="mt-3">
                To exercise any right: <a href="mailto:dpo@hirenowwithflex.us" className="text-[#0F2147] underline">dpo@hirenowwithflex.us</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">8. Security</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              All data is encrypted at rest (AES-256 via Supabase) and in transit (TLS 1.2+).
              Row-Level Security (RLS) enforces strict tenant isolation at the database layer — no cross-tenant
              data access is possible. We undergo regular security assessments including OWASP ASVS L2
              self-assessment and automated RLS testing. Our systems are hosted in EU-region data centres.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">9. Cookies</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              We use only essential, functional cookies required for authentication (Supabase session cookies).
              We do not use advertising or third-party tracking cookies. No cookie consent banner is required
              as we only place strictly necessary cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">10. Changes to this policy</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              We will notify active users of material changes via email at least 30 days before they take effect.
              Minor updates will be reflected in the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">11. Contact and complaints</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Data Protection contact: <a href="mailto:dpo@hirenowwithflex.us" className="text-[#0F2147] underline">dpo@hirenowwithflex.us</a><br />
              You have the right to lodge a complaint with the UK Information Commissioner&apos;s Office (ICO):
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-[#0F2147] underline ml-1">ico.org.uk</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
