import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EULAPage() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            End User License Agreement (EULA)
          </h1>
          <p className="text-slate-600 mb-8">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Agreement to Terms</h2>
              <p>
                This End User License Agreement ("Agreement") is a binding legal agreement between you (either an individual or a single entity) and our company ("Company," "we," "us," or "our") concerning your use of the movie and TV show watchlist application ("App" or "Service").
              </p>
              <p>
                By downloading, installing, or using the App, you agree to be bound by the terms of this Agreement. If you do not agree to the terms of this Agreement, do not download, install, or use the App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. License Grant</h2>
              <p>
                Subject to your compliance with this Agreement, we grant you a limited, non-exclusive, non-transferable, revocable license to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Download, install, and use the App on devices you own or control</li>
                <li>Access and use the App's features and services</li>
                <li>Create, manage, and organize your personal movie and TV show watchlists</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. License Restrictions</h2>
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copy, modify, or create derivative works of the App</li>
                <li>Reverse engineer, decompile, or disassemble the App</li>
                <li>Remove, alter, or obscure any proprietary notices on the App</li>
                <li>Use the App for any illegal or unauthorized purpose</li>
                <li>Attempt to gain unauthorized access to the App or its related systems</li>
                <li>Use automated means (bots, scrapers) to access the App without permission</li>
                <li>Interfere with or disrupt the App's functionality or servers</li>
                <li>Upload or transmit viruses or malicious code</li>
                <li>Sell, rent, lease, or sublicense the App to third parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. User Account and Data</h2>
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.1 Account Creation</h3>
              <p>
                To use certain features of the App, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.2 User Content</h3>
              <p>
                You retain ownership of the content you create in the App (watchlists, reviews, ratings, notes). By using the App, you grant us a license to store, process, and display your content solely for the purpose of providing the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Intellectual Property Rights</h2>
              <p>
                The App, including its original content, features, and functionality, is owned by the Company and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p>
                Movie and TV show data, images, and information are provided by third-party sources and remain the property of their respective owners. We do not claim ownership of this content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Third-Party Services and Content</h2>
              <p>
                The App may display content from third-party sources (including but not limited to The Movie Database (TMDB), IMDb, and other movie databases). These services:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Are not under our control</li>
                <li>Are subject to their own terms and conditions</li>
                <li>May change or be discontinued without notice</li>
                <li>We are not responsible for their availability or accuracy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Subscription and Payment Terms</h2>
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">7.1 Free and Premium Features</h3>
              <p>
                The App offers both free and premium subscription tiers. Premium features are available through paid subscriptions.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">7.2 Subscription Payments</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>You will be charged at the beginning of each billing period</li>
                <li>Prices are subject to change with 30 days notice</li>
                <li>Refunds are handled according to our refund policy</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">7.3 Cancellation</h3>
              <p>
                You may cancel your subscription at any time. Upon cancellation, you will retain access to premium features until the end of your current billing period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Privacy and Data Protection</h2>
              <p>
                Your use of the App is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using the App, you consent to our data practices as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Disclaimers and Limitation of Liability</h2>
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">9.1 Warranty Disclaimer</h3>
              <p className="uppercase font-semibold">
                THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p>
                We do not warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The App will be uninterrupted, timely, secure, or error-free</li>
                <li>The results obtained from using the App will be accurate or reliable</li>
                <li>The quality of the App will meet your expectations</li>
                <li>Any errors in the App will be corrected</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">9.2 Limitation of Liability</h3>
              <p className="uppercase font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
              <p>
                Our total liability to you for all claims arising from or relating to this Agreement or the App shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless the Company and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use or misuse of the App</li>
                <li>Your violation of this Agreement</li>
                <li>Your violation of any rights of another party</li>
                <li>Your content or data submitted to the App</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. Termination</h2>
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">11.1 By You</h3>
              <p>
                You may terminate this Agreement at any time by discontinuing use of the App and deleting your account.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">11.2 By Us</h3>
              <p>
                We may terminate or suspend your access immediately, without notice, for any reason, including if you breach this Agreement. Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your right to use the App will immediately cease</li>
                <li>You must delete all copies of the App from your devices</li>
                <li>We may delete your account and data</li>
                <li>Any outstanding fees remain due and payable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Updates and Modifications</h2>
              <p>
                We reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify or discontinue the App at any time</li>
                <li>Update this Agreement at any time</li>
                <li>Add, remove, or modify features</li>
              </ul>
              <p>
                We will notify you of material changes to this Agreement. Your continued use of the App after changes constitutes acceptance of the modified Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">13. Governing Law and Dispute Resolution</h2>
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.1 Governing Law</h3>
              <p>
                This Agreement shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.2 Dispute Resolution</h3>
              <p>
                Any disputes arising from this Agreement shall be resolved through:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Good faith negotiations between the parties</li>
                <li>Mediation if negotiations fail</li>
                <li>Binding arbitration if mediation is unsuccessful</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">14. General Provisions</h2>
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">14.1 Entire Agreement</h3>
              <p>
                This Agreement, together with our Privacy Policy and Terms of Service, constitutes the entire agreement between you and us regarding the App.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">14.2 Severability</h3>
              <p>
                If any provision of this Agreement is found to be unenforceable, the remaining provisions will continue in full force and effect.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">14.3 Waiver</h3>
              <p>
                Our failure to enforce any right or provision of this Agreement will not constitute a waiver of that right or provision.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">14.4 Assignment</h3>
              <p>
                You may not assign this Agreement without our prior written consent. We may assign this Agreement without restriction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">15. Contact Information</h2>
              <p>
                If you have questions about this EULA, please contact us at:
              </p>
              <div className="bg-slate-50 rounded-lg p-6 mt-4">
                <p className="font-semibold">Email: legal@yourapp.com</p>
                <p className="font-semibold">Address: [Your Company Address]</p>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-6 mt-8">
              <p className="text-sm text-slate-600 italic">
                By using the App, you acknowledge that you have read, understood, and agree to be bound by this End User License Agreement.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}