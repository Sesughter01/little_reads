export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-500 text-sm">Last updated: August 2026</p>
        <p>At LittleReads, we take your privacy seriously. This policy explains how we collect, use, and protect your information.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Information We Collect</h2>
        <p>We collect information you provide directly: your name, email address, phone number, and payment information (processed securely through Paystack). We also collect usage data to improve our service.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">How We Use Your Information</h2>
        <p>We use your information to process orders, deliver purchased ebooks, provide customer support, and improve our platform. We do not sell your personal information to third parties.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Data Security</h2>
        <p>We use industry-standard security measures including encrypted data storage, secure payment processing, and regular security audits. Your payment information is never stored on our servers.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Children&apos;s Privacy</h2>
        <p>Our platform is used by parents and guardians to purchase books for children. We do not collect personal information directly from children under 13.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact</h2>
        <p>If you have questions about this policy, contact us at hello@littlereads.com.</p>
      </div>
    </div>
  );
}
