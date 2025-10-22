import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
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
            <FileText className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">
              Terms of Service
            </h1>
          </div>
          <p className="text-slate-600 mb-8">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                Welcome to our movie and TV show watchlist application ("App," "Service," "we," "us," or "our"). By accessing or using the App, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you and our company. We may modify these Terms at any time, and your continued use of the App after such modifications constitutes your acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Eligibility and Account Registration</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.1 Age Requirements</h3>
              <p>
                You must be at least 13 years old (or 16 in the EU) to use the App. If you are under 18, you represent that you have your parent's or legal guardian's permission to use the App.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.2 Account Creation</h3>
              <p>To access certain features, you must create an account. You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.3 Account Restrictions</h3>
              <p>You may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create multiple accounts to evade bans or restrictions</li>
                <li>Share your account credentials with others</li>
                <li>Transfer your account to another person</li>
                <li>Use another person's account without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Use of the Service</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.1 License to Use</h3>
              <p>
                Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the App for your personal, non-commercial use.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.2 Acceptable Use</h3>
              <p>You agree to use the App only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe the intellectual property rights of others</li>
                <li>Upload or transmit viruses, malware, or other malicious code</li>
                <li>Attempt to gain unauthorized access to the App or its systems</li>
                <li>Use automated systems (bots, scrapers) without permission</li>
                <li>Interfere with or disrupt the App's operation</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Impersonate any person or entity</li>
                <li>Collect or store personal data of other users</li>
                <li>Use the App for any commercial purpose without authorization</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.3 Prohibited Content</h3>
              <p>When using the App, you may not submit content that:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Is illegal, fraudulent, or deceptive</li>
                <li>Infringes intellectual property rights</li>
                <li>Contains hate speech, discrimination, or promotes violence</li>
                <li>Is sexually explicit or pornographic</li>
                <li>Contains personal information of others without consent</li>
                <li>Is spam or unsolicited advertising</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. User Content and Data</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.1 Your Content</h3>
              <p>
                You retain ownership of all content you create in the App, including watchlists, reviews, ratings, and notes ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Store, process, and display your User Content</li>
                <li>Provide the Service to you</li>
                <li>Improve and develop the App</li>
                <li>Create aggregated, anonymized statistics</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.2 Responsibility for User Content</h3>
              <p>
                You are solely responsible for your User Content and the consequences of posting it. We do not endorse or guarantee the accuracy of any User Content.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.3 Content Removal</h3>
              <p>
                We reserve the right to remove any User Content that violates these Terms, is reported by other users, or that we determine is inappropriate, at our sole discretion.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.4 Backup and Export</h3>
              <p>
                While we make reasonable efforts to backup data, you are responsible for maintaining your own backups. We provide export functionality to download your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.1 Our Intellectual Property</h3>
              <p>
                The App, including its design, features, functionality, code, and original content, is owned by us and protected by copyright, trademark, and other intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copy, modify, or create derivative works of the App</li>
                <li>Reverse engineer or decompile the App</li>
                <li>Remove or alter any proprietary notices</li>
                <li>Use our trademarks without permission</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.2 Third-Party Content</h3>
              <p>
                Movie and TV show information, images, and data are provided by third-party sources (including TMDB, IMDb, and others). This content remains the property of its respective owners and is subject to their terms of use.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.3 Copyright Infringement</h3>
              <p>
                We respect intellectual property rights. If you believe content in the App infringes your copyright, please contact us at copyright@yourapp.com with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Description of the copyrighted work</li>
                <li>Location of the infringing content</li>
                <li>Your contact information</li>
                <li>A statement of good faith belief</li>
                <li>A statement of accuracy under penalty of perjury</li>
                <li>Your physical or electronic signature</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Subscriptions and Payments</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.1 Free and Paid Services</h3>
              <p>
                The App offers both free and premium subscription tiers. Premium features require a paid subscription.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.2 Billing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Subscriptions automatically renew at the end of each billing period</li>
                <li>You authorize us to charge your payment method for subscription fees</li>
                <li>Prices are displayed before purchase and may change with 30 days notice</li>
                <li>All fees are non-refundable except as required by law</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.3 Free Trials</h3>
              <p>
                Free trials may be offered for premium subscriptions. You will be charged when the trial ends unless you cancel before the trial period expires.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.4 Cancellation and Refunds</h3>
              <p>
                You may cancel your subscription at any time. Upon cancellation:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You retain access to premium features until the end of the current billing period</li>
                <li>Automatic renewal will be disabled</li>
                <li>No refunds are provided for partial billing periods</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.5 Payment Information</h3>
              <p>
                We use third-party payment processors (such as Stripe) to handle payments. We do not store your full credit card information. Payment information is subject to the processor's terms and privacy policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Third-Party Services and Links</h2>
              <p>
                The App may contain links to third-party websites, services, or advertisements. We are not responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The content or accuracy of third-party sites</li>
                <li>The privacy practices of third parties</li>
                <li>Any transactions between you and third parties</li>
                <li>The availability or functionality of third-party services</li>
              </ul>
              <p className="mt-4">
                Your use of third-party services is at your own risk and subject to their terms and policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Privacy and Data Protection</h2>
              <p>
                Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you consent to our data practices as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Disclaimers and Warranties</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">9.1 "As Is" Service</h3>
              <p className="uppercase font-semibold">
                THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, OR QUIET ENJOYMENT.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">9.2 No Guarantees</h3>
              <p>We do not warrant that:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The App will be uninterrupted, secure, or error-free</li>
                <li>Defects will be corrected</li>
                <li>The App is free from viruses or harmful components</li>
                <li>Results from using the App will be accurate or reliable</li>
                <li>Third-party content is accurate, complete, or up-to-date</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">9.3 Content Accuracy</h3>
              <p>
                Movie and TV show information is provided by third-party sources. We do not guarantee its accuracy, completeness, or timeliness. Use this information at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Limitation of Liability</h2>
              <p className="uppercase font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Your use or inability to use the App</li>
                <li>Any unauthorized access to or use of our servers</li>
                <li>Any interruption or cessation of transmission to or from the App</li>
                <li>Any bugs, viruses, or malicious code transmitted through the App</li>
                <li>Any errors or omissions in content</li>
                <li>Loss or damage of any kind incurred from use of content posted or transmitted through the App</li>
              </ul>
              <p className="mt-4">
                <strong>OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS SHALL NOT EXCEED THE GREATER OF $100 OR THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.</strong>
              </p>
              <p className="mt-4">
                Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so some of the above limitations may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless the Company, its affiliates, officers, directors, employees, agents, and licensors from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use or misuse of the App</li>
                <li>Your violation of these Terms</li>
                <li>Your User Content</li>
                <li>Your violation of any rights of another party</li>
                <li>Your violation of any applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Termination</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">12.1 By You</h3>
              <p>
                You may terminate your account at any time by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Using the account deletion feature in the App settings</li>
                <li>Contacting our support team</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">12.2 By Us</h3>
              <p>
                We may terminate or suspend your access to the App immediately, without prior notice or liability, for any reason, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violation of these Terms</li>
                <li>Fraudulent, abusive, or illegal activity</li>
                <li>Extended periods of inactivity</li>
                <li>At our sole discretion</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">12.3 Effect of Termination</h3>
              <p>Upon termination:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your right to access the App immediately ceases</li>
                <li>We may delete your account and User Content</li>
                <li>All provisions that should survive termination remain in effect</li>
                <li>Outstanding fees remain due and payable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">13. Dispute Resolution</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.1 Informal Resolution</h3>
              <p>
                Before filing a claim, you agree to contact us at legal@yourapp.com to attempt to resolve the dispute informally. We will attempt to resolve the dispute within 60 days.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.2 Arbitration Agreement</h3>
              <p>
                Any disputes that cannot be resolved informally shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration will take place in [Your Jurisdiction].
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.3 Class Action Waiver</h3>
              <p>
                You agree to resolve disputes on an individual basis only and waive the right to participate in class actions or class-wide arbitration.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.4 Exceptions</h3>
              <p>
                Either party may seek injunctive relief in court for intellectual property infringement or violations of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">14. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions. Any legal action must be brought in the courts located in [Your Jurisdiction].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">15. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Notify you of material changes via email or in-app notification</li>
                <li>Post the updated Terms with a new "Last Updated" date</li>
                <li>Provide at least 30 days notice for material changes</li>
              </ul>
              <p className="mt-4">
                Your continued use of the App after the effective date constitutes acceptance of the modified Terms. If you do not agree to the changes, you must stop using the App and delete your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">16. General Provisions</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">16.1 Entire Agreement</h3>
              <p>
                These Terms, together with the Privacy Policy and EULA, constitute the entire agreement between you and us regarding the App.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">16.2 Severability</h3>
              <p>
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">16.3 Waiver</h3>
              <p>
                Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">16.4 Assignment</h3>
              <p>
                You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">16.5 Force Majeure</h3>
              <p>
                We are not liable for any delay or failure to perform due to causes beyond our reasonable control, including natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, network infrastructure failures, or strikes.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">16.6 Survival</h3>
              <p>
                Sections relating to intellectual property, disclaimers, limitations of liability, indemnification, and dispute resolution survive termination of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">17. Contact Information</h2>
              <p>
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-slate-50 rounded-lg p-6 mt-4 space-y-2">
                <p><strong>Email:</strong> legal@yourapp.com</p>
                <p><strong>Support:</strong> support@yourapp.com</p>
                <p><strong>Address:</strong> [Your Company Address]</p>
                <p><strong>Phone:</strong> [Your Phone Number]</p>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-6 mt-8">
              <p className="text-sm text-slate-600 italic">
                By using the App, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}