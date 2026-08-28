import { BookOpen, Heart, Star, Users } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about LittleReads - Big Adventures for Little Readers',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About LittleReads</h1>
        <p className="text-xl text-gray-500">Big Adventures for Little Readers</p>
      </div>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h2>
        <p className="text-gray-600 leading-relaxed text-lg mb-4">
          LittleReads exists to help children build curiosity, confidence, and a lifelong
          love of reading through accessible digital stories.
        </p>
        <p className="text-gray-600 leading-relaxed text-lg mb-4">
          We believe every child deserves access to high-quality, educational, and culturally
          relevant books. That is why we create original children&apos;s ebooks designed specifically
          for young readers ages 5 to 10.
        </p>
        <p className="text-gray-600 leading-relaxed text-lg">
          Our stories are carefully crafted to be age-appropriate, educational, diverse, and
          — most importantly — fun. Because when children enjoy reading, they read more.
          And when they read more, they grow.
        </p>
      </section>

      {/* Values */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Our Values</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              icon: <BookOpen className="h-6 w-6 text-brand-purple" />,
              title: 'Quality Content',
              desc: 'Every story is original, reviewed for accuracy, and designed with children in mind.',
            },
            {
              icon: <Heart className="h-6 w-6 text-red-500" />,
              title: 'Child Safety',
              desc: 'All content is age-appropriate and free from harmful material.',
            },
            {
              icon: <Star className="h-6 w-6 text-brand-yellow" />,
              title: 'Education First',
              desc: 'Every book includes learning outcomes and discussion questions.',
            },
            {
              icon: <Users className="h-6 w-6 text-brand-green" />,
              title: 'Inclusive Stories',
              desc: 'Our characters reflect the diverse world children live in.',
            },
          ].map((value) => (
            <div key={value.title} className="card">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
                {value.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{value.title}</h3>
              <p className="text-gray-500 text-sm">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center bg-brand-purple/5 rounded-2xl p-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Start Reading Today</h2>
        <p className="text-gray-500 mb-6">
          Explore our collection of 20 original children&apos;s ebooks.
        </p>
        <a href="/shop" className="btn-primary">
          Browse Books
        </a>
      </section>
    </div>
  );
}
