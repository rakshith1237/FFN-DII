import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#374151]">← Back</Link>
        </div>
        <h1 className="text-3xl font-bold text-[#0F2147] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#6B7280] mb-10">
          Last updated: 22 May 2026 · DivIHN Integration Inc.
        </p>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 space-y-8 text-[#374151]">

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">1. Acceptance</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              By accessing or using FlexForceNow (&quot;the Platform&quot;), you agree to these Terms of Service.
              If you are using the Platform on behalf of an organisation, you represent that you have authority
              to bind that organisation. If you do not agree, do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">2. The service</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              FlexForceNow provides a B2B SaaS platform for contingent workforce management, including
              job description management, candidate submission workflows, AI-assisted scoring (IntelliMatch),
              Right-to-Represent (RTR) e-signature, and placement lifecycle management. The Platform is
              provided on a subscription basis. Features may change with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">3. Subscriptions and payment</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Subscriptions are billed monthly via Stripe. You may cancel at any time from your billing portal.
              Cancellation takes effect at the end of the current billing period. No refunds are provided for
              partial months. Failure to pay will result in account suspension after a 7-day grace period.
              All prices are exclusive of VAT where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">4. Acceptable use</h2>
            <p className="text-sm text-[#6B7280] mb-2">You must not:</p>
            <ul className="text-sm space-y-1.5 list-disc list-inside text-[#6B7280]">
              <li>Use the Platform for any unlawful purpose or in violation of applicable employment law</li>
              <li>Attempt to access another tenant&apos;s data or circumvent Row-Level Security controls</li>
              <li>Upload malicious code, viruses, or content that infringes third-party rights</li>
              <li>Use the AI features to make discriminatory hiring decisions based on protected characteristics</li>
              <li>Resell, sublicense, or white-label the Platform without written consent</li>
              <li>Reverse-engineer, decompile, or attempt to extract source code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">5. AI features and IntelliMatch</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              The IntelliMatch scoring system provides AI-assisted candidate assessment based on skills and
              experience data. IntelliMatch scores are advisory only and must not be the sole basis for
              hiring or rejection decisions. You remain responsible for all hiring decisions made using
              the Platform. No candidate PII is transmitted to AI API providers; only skill descriptions
              and job requirement text are processed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">6. IR35 compliance</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              The IR35 Status Determination Statement (SDS) tool provides guidance based on HMRC criteria.
              The determination is indicative only and does not constitute legal or tax advice.
              You are solely responsible for ensuring compliance with IR35 legislation and HMRC requirements.
              We recommend consulting a qualified tax adviser for complex or borderline cases.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">7. Data and privacy</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Your use of the Platform is governed by our{' '}
              <Link href="/privacy" className="text-[#0F2147] underline">Privacy Policy</Link>.
              You are the Data Controller for candidate and user data you upload to the Platform.
              DivIHN Integration Inc. acts as Data Processor. You must have a lawful basis for processing
              any personal data you input and must comply with applicable data protection legislation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">8. Intellectual property</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              The Platform, including its design, algorithms, and documentation, is owned by DivIHN
              Integration Inc. Your data remains your property. You grant us a limited licence to process
              your data solely to provide the Platform services. You may export your data at any time
              via the FlexAdmin data export feature.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">9. Limitation of liability</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              To the maximum extent permitted by law, DivIHN Integration Inc. shall not be liable for
              indirect, incidental, or consequential damages arising from your use of the Platform.
              Our total aggregate liability shall not exceed the fees paid in the 12 months preceding
              the claim. Nothing in these terms excludes liability for death or personal injury caused
              by negligence, or for fraud.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">10. Termination</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              We may suspend or terminate your account for material breach of these Terms, non-payment,
              or if required by law. On termination, you may export your data within 30 days after which
              it will be deleted in accordance with our data retention policy. You may terminate by
              cancelling your subscription and requesting data deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">11. Governing law</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              These Terms are governed by the laws of Scotland, United Kingdom.
              Any disputes shall be subject to the exclusive jurisdiction of the Scottish courts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0F2147] mb-3">12. Contact</h2>
            <p className="text-sm text-[#6B7280]">
              DivIHN Integration Inc. · Aberdeen, UK<br />
              <a href="mailto:legal@hirenowwithflex.us" className="text-[#0F2147] underline">legal@hirenowwithflex.us</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
