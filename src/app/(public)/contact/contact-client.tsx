'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function ContactClient() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          subject: formData.get('subject'),
          message: formData.get('message'),
        }),
      });

      if (!response.ok) throw new Error('Failed to send');

      toast.success('Message sent! We will get back to you soon.');
      setIsSubmitted(true);
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-gray-500">
          Have a question or suggestion? We would love to hear from you.
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_1.5fr] gap-12">
        {/* Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Get in Touch</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-brand-purple" />
              <span className="text-gray-600">hello@littlereads.com</span>
            </div>
          </div>
          <div className="mt-8 card bg-brand-purple/5 border border-brand-purple/10">
            <h3 className="font-semibold text-gray-900 mb-2">For Schools & Teachers</h3>
            <p className="text-sm text-gray-500">
              We offer special pricing for schools and educational institutions.
              Contact us to learn about our school packages.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="card">
          {isSubmitted ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-brand-green mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-gray-500">
                Thank you for reaching out. We will get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input type="text" name="name" required className="input" placeholder="Your name" minLength={1} maxLength={200} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" name="email" required className="input" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="label">Subject *</label>
                <input type="text" name="subject" required className="input" placeholder="How can we help?" minLength={1} maxLength={200} />
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  className="input resize-none"
                  placeholder="Write your message here..."
                  minLength={10}
                  maxLength={5000}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
