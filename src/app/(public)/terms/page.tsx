export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-500 text-sm">Last updated: August 2026</p>
        <p>By using LittleReads, you agree to these terms of service.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Digital Products</h2>
        <p>All ebooks sold on LittleReads are digital products delivered as PDF files. Upon successful payment, you receive a license to download and read the purchased ebook for personal, non-commercial use.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Pricing</h2>
        <p>All prices are listed in Nigerian Naira (₦). We reserve the right to change prices at any time. Price changes do not affect previously completed purchases.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">User Accounts</h2>
        <p>You are responsible for maintaining the security of your account. Do not share your login credentials. You must be at least 18 years old to create an account.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Reviews</h2>
        <p>By submitting a review, you grant LittleReads the right to display your review on our platform. Reviews must be honest and respectful.</p>
        <h2 className="text-xl font-semibold text-gray-900 mt-8">Limitation of Liability</h2>
        <p>LittleReads is not liable for any indirect damages arising from the use of our platform or digital products.</p>
      </div>
    </div>
  );
}
