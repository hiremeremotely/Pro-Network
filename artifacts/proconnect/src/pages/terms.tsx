import { Link } from "wouter";
import logo from "@assets/hmr_logo.png";
import { ManageCookiesLink } from "@/components/cookie-consent";
import { PageSEO } from "@/components/page-seo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PageSEO
        title="Terms of Service"
        description="Read the Terms of Service for Hire Me Remotely — the professional networking platform for remote workers and companies."
        canonicalPath="/terms"
      />
      <header className="w-full border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <img src={logo} alt="Hire Me Remotely" className="h-8 w-auto cursor-pointer" />
          </Link>
          <Link href="/privacy" className="text-sm text-primary hover:underline font-medium">
            Privacy Policy
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-3xl font-black text-gray-900 mb-1">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              By creating an account on Hire Me Remotely ("Platform", "Service"), you agree to these Terms of Service ("Terms"). If you are using the Platform on behalf of a company or other organisation, you represent that you have authority to bind that organisation to these Terms. If you do not agree, do not create an account or use the Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Eligibility</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You must be at least 18 years old to use the Platform. By creating an account, you represent that you are 18 or older and that the information you provide is accurate and up to date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Accounts</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Registration</strong> — You must provide a valid email address and create a secure password. You are responsible for keeping your login credentials confidential and for all activity under your account.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>One account per person</strong> — Individual users may maintain one personal account. Operating multiple accounts to circumvent restrictions is prohibited.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Company accounts</strong> — Company profiles represent real organisations. You must have authority to act on behalf of the company whose name you register.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>Notify us of unauthorised access</strong> — Report any suspected unauthorised use of your account to support@hiremeremotely.com immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. What the Platform Provides</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Hire Me Remotely is a professional networking platform that helps individuals find remote work opportunities and helps companies find remote talent. We facilitate introductions and applications — we are <strong>not</strong> an employment agency and we do not guarantee that any user will find employment or fill a vacancy. Any employment relationship is solely between the employer and employee.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Acceptable Use</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              You agree to use the Platform only for lawful purposes and in a way that does not infringe the rights of others. You must not:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li>Post false, misleading, or fraudulent information about yourself or your company</li>
              <li>Impersonate any person or organisation</li>
              <li>Post content that is discriminatory, harassing, defamatory, obscene, or threatening</li>
              <li>Scrape, harvest, or extract data from the Platform by automated means</li>
              <li>Send spam, unsolicited commercial messages, or chain messages to other users</li>
              <li>Use the Platform to distribute malware, phishing content, or any harmful code</li>
              <li>Attempt to gain unauthorised access to any part of the Platform or another user's account</li>
              <li>Post job listings that are misleading, non-existent, or used to collect personal data under false pretences</li>
              <li>Violate any applicable laws or regulations, including employment discrimination laws</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Content You Post</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Ownership</strong> — You retain ownership of content you submit to the Platform (your profile, posts, messages, job listings).
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>Licence to us</strong> — By posting content, you grant Hire Me Remotely a worldwide, non-exclusive, royalty-free licence to display, store, and transmit that content as necessary to provide the Service. This licence ends when you delete the content or close your account.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>Your responsibility</strong> — You are solely responsible for content you post. We do not pre-screen user content but reserve the right to remove content that violates these Terms or applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Job Listings (Company Accounts)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">Companies posting jobs represent that:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li>The job opportunity is real and currently available</li>
              <li>The compensation information provided is accurate</li>
              <li>They comply with all applicable employment laws in the relevant jurisdiction, including equal opportunity and anti-discrimination requirements</li>
              <li>They will not use applications received to contact candidates for unrelated purposes</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed mt-3">
              We reserve the right to remove any job listing that we believe is fraudulent, misleading, or in violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Suspension and Termination</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>By you</strong> — You may close your account at any time through the Platform settings or by emailing support@hiremeremotely.com. Account deletion is processed within 30 days.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              <strong>By us</strong> — We may suspend or terminate your account, with or without notice, if we believe you have violated these Terms, if your account has been used fraudulently, or if required by law. We will give reasonable notice where practicable.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>Effect of termination</strong> — Upon termination, your right to use the Platform ceases. We will retain and delete your data in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Intellectual Property</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Hire Me Remotely name, logo, and Platform design are our intellectual property. You may not use them without our prior written permission. Nothing in these Terms transfers any intellectual property rights to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Third-Party Links</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Platform may contain links to third-party websites (company websites, social profiles, portfolio links). We are not responsible for the content or practices of those third parties and their links do not constitute endorsement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Disclaimer of Warranties</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Platform is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">12. Limitation of Liability</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              To the maximum extent permitted by applicable law, Hire Me Remotely and its owners, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, loss of data, loss of goodwill, or any employment outcome, arising from your use of or inability to use the Platform.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Our total liability to you for any claim arising under these Terms shall not exceed the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) £100 / $100 USD.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Nothing in these Terms limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded under applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">13. Indemnification</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You agree to indemnify and hold harmless Hire Me Remotely from any claims, losses, damages, liabilities, and expenses (including reasonable legal fees) arising from your violation of these Terms, your use of the Platform, or content you post.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">14. Governing Law and Disputes</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles. Any disputes not resolved informally shall be subject to the exclusive jurisdiction of the state and federal courts located in Delaware.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              For users in the <strong>European Union</strong>, nothing in these Terms limits your rights under applicable EU consumer protection laws or GDPR. You may bring claims before the courts of your country of residence, regardless of this governing law clause.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              For users in the <strong>United Kingdom</strong>, your statutory rights under UK consumer law are not affected by these Terms.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              For users in <strong>Canada</strong>, these Terms are subject to applicable provincial and federal consumer protection laws.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              We encourage you to contact us first at support@hiremeremotely.com to resolve any dispute informally before initiating legal proceedings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">15. Changes to These Terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by email at least 14 days before they take effect. Continued use of the Platform after the effective date constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">16. Contact</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              For questions about these Terms, email us at{" "}
              <a href="mailto:support@hiremeremotely.com" className="text-primary hover:underline">
                support@hiremeremotely.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 Hire Me Remotely</p>
          <div className="flex items-center gap-4">
            <ManageCookiesLink />
            <Link href="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
            <Link href="/" className="hover:text-gray-700">Back to home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
