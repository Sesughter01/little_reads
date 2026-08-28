export const metadata = { title: 'Refund Policy' };

export default function RefundPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund Policy</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-500 text-sm">Last updated: August 2026</p>
        <p>Due to the digital nature of our products, refunds are handled as follows:</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Eligible for Refund</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>If a purchased ebook file is corrupted or unreadable</li>
          <li>If you were charged but did not receive the ebook</li>
          <li>If there is a duplicate purchase for the same ebook</li>
        </ul>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Not Eligible for Refund</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>If you have already downloaded the ebook successfully</li>
          <li>If you changed your mind after purchase</li>
          <li>If the ebook was purchased accidentally</li>
        </ul>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">How to Request a Refund</h2>
        <p>Contact us at hello@littlereads.com with your order reference and reason for the refund request. We will review your case within 48 hours.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Processing</h2>
        <p>Approved refunds will be processed through Paystack within 5-10 business days to the original payment method.</p>
      </div>
    </div>
  );
}
