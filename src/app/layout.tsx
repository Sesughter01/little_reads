import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
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
