import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'LittleReads - Big Adventures for Little Readers',
    template: '%s | LittleReads',
  },
  description:
    'Discover fun, educational children\'s ebooks for young readers ages 5-10. Shop adventure, science, and storytelling ebooks designed to inspire curiosity and a love of reading.',
  keywords: [
    'children ebooks',
    'kids books',
    'educational ebooks',
    'Nigerian children books',
    'digital books for kids',
    'reading for children',
  ],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'LittleReads - Big Adventures for Little Readers',
    description:
      'Discover fun, educational children\'s ebooks for young readers ages 5-10.',
    type: 'website',
    siteName: 'LittleReads',
    images: ['/brand/littlereads-mark.svg'],
  },
};

/**
 * Root layout — global application requirements only (html/body, styles,
 * toaster). Route-group layouts own the page chrome:
 *
 * - (public), (auth), (dashboard)  → StoreShell (public Header/Footer)
 * - (admin)                        → admin top bar + sidebar only
 * - (admin-auth)                   → standalone admin login/MFA pages
 *
 * This prevents the public storefront navbar/footer from being rendered
 * inside the admin panel.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="min-h-screen overflow-x-hidden">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1f2937',
              borderRadius: '1rem',
              padding: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
