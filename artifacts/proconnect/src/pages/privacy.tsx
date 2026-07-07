import { Link } from "wouter";
import logo from "@assets/hmr_logo.png";
import { ManageCookiesLink } from "@/components/cookie-consent";
import { PageSEO } from "@/components/page-seo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PageSEO
        title="Privacy Policy"
        description="Read the Privacy Policy for Hire Me Remotely. Learn how we collect, use, and protect your personal data."
        canonicalPath="/privacy"
      />
      <header className="w-full border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <img src={logo} alt="Hire Me Remotely" className="h-8 w-auto cursor-pointer" />
          </Link>
          <Link href="/terms" className="text-sm text-primary hover:underline font-medium">
            Terms of Service
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-black text-gray-900 mb-1">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Who We Are</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Hire Me Remotely ("we", "us", "our") operates the professional networking platform at hiremeremotely.com (the "Platform"), connecting remote workers with employers worldwide. We are the data controller for personal information collected through the Platform.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-3">
              For privacy enquiries or data requests, contact us at:{" "}
              <a href="mailto:privacy@hiremeremotely.com" className="text-primary hover:underline">
                privacy@hiremeremotely.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. What Personal Data We Collect</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Account data</strong> — when you register, we collect your email address, full name, account type (individual or company), and a securely hashed version of your password. We never store passwords in plain text.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Profile data</strong> — information you voluntarily add to your public profile: headline, bio, location, work experience, education history, skills, portfolio links, social media profile URLs, and a profile photo if you upload one.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Company data</strong> — if you register as a company, we collect your company name, industry, size, website, and any job listings you post.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Job application data</strong> — when you apply for a role through the Platform, we record which jobs you applied to, any cover letter or note you submit, and your application status.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Usage data</strong> — we collect information about how you use the Platform: pages visited, features used, timestamps of activity, and your IP address. This is used solely to operate and improve the service.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>Communications</strong> — messages exchanged between users via the Platform's direct messaging feature are stored on our servers to deliver the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Legal Basis (GDPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["Create and manage your account", "Performance of contract"],
                    ["Deliver the networking and job-matching service", "Performance of contract"],
                    ["Enable messaging between users", "Performance of contract"],
                    ["Send transactional emails (verification, password reset)", "Performance of contract"],
                    ["Detect and prevent fraud or abuse", "Legitimate interests"],
                    ["Improve and debug the Platform", "Legitimate interests"],
                    ["Comply with legal obligations", "Legal obligation"],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose}>
                      <td className="px-4 py-3">{purpose}</td>
                      <td className="px-4 py-3 text-gray-500">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mt-3">
              We do <strong>not</strong> use your data for automated decision-making or profiling that produces legal or similarly significant effects.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Who We Share Your Data With</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Other users</strong> — information you add to your public profile (name, headline, experience, skills, photo) is visible to other registered users of the Platform. You control what you put on your profile.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Service providers</strong> — we use third-party providers to operate the Platform (cloud hosting, email delivery, file storage). These providers process data only on our behalf under data processing agreements and are not permitted to use your data for their own purposes.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Legal authorities</strong> — we may disclose data when required by law, court order, or to protect the rights and safety of our users or the public.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Business transfers</strong> — if we merge with or are acquired by another company, your data may be transferred as part of that transaction. We will notify you via email before any transfer occurs.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              We never sell your personal data to third parties. We do not share your data with advertisers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. International Data Transfers</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Platform is operated from servers that may be located outside your country. If you are in the European Economic Area (EEA), United Kingdom, or Canada, your data may be transferred to and processed in countries that have different data protection laws. Where we transfer data outside the EEA or UK, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission or equivalent measures recognised under UK law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Data Retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Data type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Retention period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["Account and profile data", "Until you delete your account, plus 30 days"],
                    ["Job application records", "Until you delete your account, plus 30 days"],
                    ["Messages", "Until you delete your account, plus 30 days"],
                    ["Server and access logs", "90 days"],
                    ["Email verification tokens", "24 hours"],
                    ["Password reset tokens", "1 hour"],
                  ].map(([type, retention]) => (
                    <tr key={type}>
                      <td className="px-4 py-3">{type}</td>
                      <td className="px-4 py-3 text-gray-500">{retention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mt-3">
              After account deletion, anonymised aggregate statistics may be retained indefinitely.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3"><strong>For all users:</strong></p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-5">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Rectification</strong> — ask us to correct inaccurate data</li>
              <li><strong>Erasure</strong> — ask us to delete your account and associated data</li>
              <li><strong>Data portability</strong> — receive your data in a structured, machine-readable format</li>
            </ul>

            <p className="text-sm text-gray-600 leading-relaxed mb-3"><strong>If you are in the EU or UK (GDPR / UK GDPR):</strong></p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-5">
              <li><strong>Objection</strong> — object to processing based on legitimate interests</li>
              <li><strong>Restriction</strong> — ask us to restrict processing in certain circumstances</li>
              <li><strong>Withdraw consent</strong> — where processing is based on consent, withdraw it at any time</li>
              <li>You have the right to lodge a complaint with your local supervisory authority (e.g. the ICO in the UK, or the relevant EU data protection authority in your country)</li>
            </ul>

            <p className="text-sm text-gray-600 leading-relaxed mb-3"><strong>If you are in California (CCPA):</strong></p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-5">
              <li><strong>Right to know</strong> — what categories of personal information are collected and how they are used</li>
              <li><strong>Right to delete</strong> — request deletion of your personal information</li>
              <li><strong>Right to non-discrimination</strong> — you will not receive different service for exercising your privacy rights</li>
              <li>We do not sell personal information, so the right to opt-out of sale does not currently apply</li>
            </ul>

            <p className="text-sm text-gray-600 leading-relaxed mb-3"><strong>If you are in Canada (PIPEDA):</strong></p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-5">
              <li><strong>Access and correction</strong> — request access to and correction of your personal information</li>
              <li>We will respond to verified access requests within 30 days</li>
            </ul>

            <p className="text-sm text-gray-600 leading-relaxed">
              To exercise any of these rights, email{" "}
              <a href="mailto:privacy@hiremeremotely.com" className="text-primary hover:underline">
                privacy@hiremeremotely.com
              </a>{" "}
              with your request. We may need to verify your identity before processing it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Security</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use industry-standard security measures including encrypted passwords (bcrypt), HTTPS for all data in transit, and access controls limiting who can access production data. No method of transmission over the internet is 100% secure. If you believe your account has been compromised, contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Children</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Platform is not directed at children under 16 (or under 13 in the United States). We do not knowingly collect personal data from anyone under these ages. If we learn we have done so, we will delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email at the address associated with your account, at least 14 days before the change takes effect. Continued use of the Platform after the effective date constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Contact Us</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              For any privacy-related question, concern, or data request:
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-3">
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@hiremeremotely.com" className="text-primary hover:underline">
                privacy@hiremeremotely.com
              </a>
              <br />
              <strong>Response time:</strong> within 30 days for routine requests, 72 hours for urgent security concerns
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 Hire Me Remotely</p>
          <div className="flex items-center gap-4">
            <ManageCookiesLink />
            <Link href="/terms" className="hover:text-gray-700">Terms of Service</Link>
            <Link href="/" className="hover:text-gray-700">Back to home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
