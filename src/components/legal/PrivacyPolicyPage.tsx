import React from 'react';
import { ArrowLeft, Shield, Eye, Database, Lock, UserCheck, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">
              Privacy Policy
            </h1>
          </div>
          <p className="text-slate-600 mb-8">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Quick Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Privacy at a Glance</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <Eye className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">What We Collect</p>
                  <p className="text-sm text-slate-600">Account info, watchlist data, usage analytics</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Lock className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">How We Protect</p>
                  <p className="text-sm text-slate-600">Encryption, secure servers, limited access</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <UserCheck className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">Your Rights</p>
                  <p className="text-sm text-slate-600">Access, delete, export your data anytime</p>
                </div>
              </div>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
              <p>
                Welcome to our Privacy Policy. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our movie and TV show watchlist application ("App" or "Service").
              </p>
              <p>
                Please read this Privacy Policy carefully. By using the App, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use the App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4 flex items-center">
                <Database className="h-6 w-6 mr-2 text-blue-600" />
                2. Information We Collect
              </h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.1 Information You Provide Directly</h3>
              <p><strong>Account Information:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email address (required for account creation)</li>
                <li>Username and display name</li>
                <li>Password (encrypted and never stored in plain text)</li>
                <li>Profile picture (optional)</li>
              </ul>

              <p className="mt-4"><strong>Watchlist and Preference Data:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Movies and TV shows you add to your watchlists</li>
                <li>Ratings and reviews you provide</li>
                <li>Personal notes and comments</li>
                <li>Viewing status (watched, watching, plan to watch)</li>
                <li>Genre preferences and favorites</li>
                <li>Custom lists and collections</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.2 Information Collected Automatically</h3>
              <p><strong>Usage Data:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>App features you use and interactions</li>
                <li>Search queries within the App</li>
                <li>Time and date of your visits</li>
                <li>Time spent on different features</li>
                <li>Pages or screens viewed</li>
              </ul>

              <p className="mt-4"><strong>Device Information:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Device type, model, and operating system</li>
                <li>Browser type and version (for web app)</li>
                <li>IP address (anonymized after 30 days)</li>
                <li>Mobile device identifiers</li>
                <li>Screen resolution and device settings</li>
              </ul>

              <p className="mt-4"><strong>Location Data:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Approximate location based on IP address (country/region level)</li>
                <li>Precise location only if you explicitly grant permission (for features like finding local theaters)</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.3 Information from Third-Party Sources</h3>
              <p><strong>Movie and TV Show Data:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Content from The Movie Database (TMDB), IMDb, and other movie databases</li>
                <li>This data is publicly available and subject to third-party terms</li>
              </ul>

              <p className="mt-4"><strong>Authentication Services:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>If you sign in with Google, Apple, or other OAuth providers, we receive basic profile information</li>
                <li>We only request necessary information (name, email, profile picture)</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.4 Cookies and Tracking Technologies</h3>
              <p>We use cookies and similar tracking technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for the App to function (authentication, preferences)</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use the App</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and choices</li>
              </ul>
              <p className="mt-4">You can control cookies through your browser settings, but disabling essential cookies may limit App functionality.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. How We Use Your Information</h2>
              <p>We use the collected information for the following purposes:</p>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.1 To Provide and Improve the Service</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create and manage your account</li>
                <li>Store and sync your watchlists across devices</li>
                <li>Provide personalized recommendations based on your preferences</li>
                <li>Display movie and TV show information</li>
                <li>Enable search and filtering of content</li>
                <li>Track your viewing progress and statistics</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.2 To Communicate with You</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send account-related notifications (password resets, account changes)</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Send service updates and announcements (with option to opt-out)</li>
                <li>Request feedback and conduct surveys (optional)</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.3 To Improve and Develop the App</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analyze usage patterns and trends</li>
                <li>Conduct research and testing</li>
                <li>Develop new features based on user behavior</li>
                <li>Fix bugs and technical issues</li>
                <li>Improve recommendation algorithms</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.4 For Security and Fraud Prevention</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Protect against unauthorized access</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Ensure the security of our systems</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.5 For Marketing (with your consent)</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send promotional emails about new features (opt-in only)</li>
                <li>Share relevant content and recommendations</li>
                <li>You can opt-out of marketing communications at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. How We Share Your Information</h2>
              <p>
                <strong>We do not sell your personal information to third parties.</strong> We only share your information in the following limited circumstances:
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.1 Service Providers</h3>
              <p>We share data with trusted third-party service providers who help us operate the App:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase:</strong> Database hosting and authentication (data encrypted in transit and at rest)</li>
                <li><strong>Cloud hosting providers:</strong> Infrastructure and storage</li>
                <li><strong>Analytics services:</strong> Usage analytics (anonymized data)</li>
                <li><strong>Payment processors:</strong> Subscription billing (we never store payment card details)</li>
                <li><strong>Email services:</strong> Transactional and notification emails</li>
              </ul>
              <p className="mt-4">All service providers are bound by confidentiality obligations and data protection agreements.</p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.2 Legal Requirements</h3>
              <p>We may disclose your information if required by law or in response to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Court orders or legal processes</li>
                <li>Government or regulatory requests</li>
                <li>Protection of our rights or property</li>
                <li>Investigation of fraud or security issues</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.3 Business Transfers</h3>
              <p>
                If we are involved in a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your information becomes subject to a different privacy policy.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.4 Aggregated and Anonymized Data</h3>
              <p>
                We may share aggregated, anonymized data that cannot identify you individually (e.g., "90% of users prefer action movies").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4 flex items-center">
                <Lock className="h-6 w-6 mr-2 text-blue-600" />
                5. How We Protect Your Information
              </h2>
              <p>We implement industry-standard security measures to protect your data:</p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.1 Technical Safeguards</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using TLS/SSL</li>
                <li><strong>Password Security:</strong> Passwords are hashed and salted using bcrypt</li>
                <li><strong>Database Security:</strong> Data at rest is encrypted</li>
                <li><strong>Access Controls:</strong> Limited employee access with role-based permissions</li>
                <li><strong>Regular Security Audits:</strong> Ongoing monitoring and testing</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.2 Organizational Safeguards</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Employee training on data protection</li>
                <li>Confidentiality agreements with staff and contractors</li>
                <li>Incident response procedures</li>
                <li>Regular backup and recovery processes</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.3 Data Breach Notification</h3>
              <p>
                In the event of a data breach affecting your personal information, we will notify you and relevant authorities as required by law within 72 hours of discovery.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4 flex items-center">
                <UserCheck className="h-6 w-6 mr-2 text-blue-600" />
                6. Your Privacy Rights
              </h2>
              <p>You have the following rights regarding your personal information:</p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.1 Access and Portability</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
                <li><strong>Export:</strong> Download your watchlist data in CSV or JSON format</li>
                <li><strong>Portability:</strong> Transfer your data to another service</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.2 Correction and Update</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Update your account information at any time through the App settings</li>
                <li>Request correction of inaccurate or incomplete data</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.3 Deletion</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to be Forgotten:</strong> Request deletion of your account and all associated data</li>
                <li>Delete specific items from your watchlist at any time</li>
                <li>Some data may be retained for legal or legitimate business purposes (e.g., transaction records)</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.4 Opt-Out Rights</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Marketing Emails:</strong> Unsubscribe link in every email</li>
                <li><strong>Analytics:</strong> Disable tracking in App settings</li>
                <li><strong>Cookies:</strong> Manage through browser settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.5 Object to Processing</h3>
              <p>
                Object to processing of your data for direct marketing or based on legitimate interests.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">How to Exercise Your Rights</h3>
              <p>
                To exercise any of these rights, contact us at <strong>privacy@yourapp.com</strong>. We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Data Retention</h2>
              <p>We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Data:</strong> Retained while your account is active</li>
                <li><strong>Watchlist Data:</strong> Retained until you delete items or your account</li>
                <li><strong>Usage Logs:</strong> Retained for 90 days for security and analytics</li>
                <li><strong>IP Addresses:</strong> Anonymized after 30 days</li>
                <li><strong>Deleted Accounts:</strong> Data permanently deleted within 30 days (some data may be retained for legal compliance)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Children's Privacy</h2>
              <p>
                The App is not intended for children under 13 years of age (or 16 in the EU). We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately, and we will delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4 flex items-center">
                <Globe className="h-6 w-6 mr-2 text-blue-600" />
                9. International Data Transfers
              </h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Adequacy decisions for certain countries</li>
                <li>Compliance with Privacy Shield principles (where applicable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. California Privacy Rights (CCPA)</h2>
              <p>
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or disclosed</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to deletion of personal information</li>
                <li>Right to non-discrimination for exercising your rights</li>
              </ul>
              <p className="mt-4">
                <strong>Note:</strong> We do not sell personal information as defined by the CCPA.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. European Privacy Rights (GDPR)</h2>
              <p>
                If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to access, rectify, and erase your data</li>
                <li>Right to restrict or object to processing</li>
                <li>Right to data portability</li>
                <li>Right to withdraw consent</li>
                <li>Right to lodge a complaint with a supervisory authority</li>
              </ul>
              <p className="mt-4">
                Our legal basis for processing your data includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Consent:</strong> When you agree to processing</li>
                <li><strong>Contract:</strong> To provide the Service you've requested</li>
                <li><strong>Legitimate Interests:</strong> To improve and secure the App</li>
                <li><strong>Legal Obligation:</strong> To comply with laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Third-Party Links and Services</h2>
              <p>
                The App may contain links to third-party websites or services (e.g., streaming platforms, movie databases). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">13. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Notify you of material changes via email or in-app notification</li>
                <li>Post the updated policy with a new "Last Updated" date</li>
                <li>Request your consent if required by law</li>
              </ul>
              <p className="mt-4">
                Your continued use of the App after changes indicates acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">14. Contact Us</h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-slate-50 rounded-lg p-6 mt-4 space-y-2">
                <p><strong>Email:</strong> privacy@yourapp.com</p>
                <p><strong>Data Protection Officer:</strong> dpo@yourapp.com</p>
                <p><strong>Address:</strong> [Your Company Address]</p>
                <p><strong>Phone:</strong> [Your Phone Number]</p>
              </div>
              <p className="mt-4">
                We will respond to your inquiry within 30 days.
              </p>
            </section>

            <section className="border-t border-slate-200 pt-6 mt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-2">Your Privacy Matters</h3>
                <p className="text-slate-700">
                  We are committed to protecting your privacy and being transparent about our data practices. 
                  If you have any questions or concerns, we're here to help. Your trust is important to us.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}