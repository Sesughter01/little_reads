'use client';

import { useState } from 'react';
import { Star, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface ReviewFormProps {
  productId: string;
  productTitle: string;
  isLoggedIn: boolean;
  hasPurchased: boolean;
  hasReviewed: boolean;
}

export function ReviewForm({
  productId,
  productTitle,
  isLoggedIn,
  hasPurchased,
  hasReviewed,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isLoggedIn) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <p className="text-gray-600 mb-3">
          Sign in to leave a review for this book.
        </p>
        <a
          href={`/login?redirect=/books/${encodeURIComponent(productTitle)}`}
          className="btn-primary inline-flex items-center gap-2"
        >
          Sign In to Review
        </a>
      </div>
    );
  }

  if (!hasPurchased) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <p className="text-gray-600">
          Only verified purchasers can leave a review.
        </p>
      </div>
    );
  }

  if (hasReviewed) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 text-center">
        <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
        <p className="text-green-800 font-medium">
          You&apos;ve already reviewed this book. Thank you!
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 text-center">
        <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
        <p className="text-green-800 font-medium">
          Review submitted! It will appear after moderation.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || content.length < 10) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit review');
        return;
      }

      setSuccess(true);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Star Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating *
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-0.5 transition-colors"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200'
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        )}
      </div>

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-2">
          Title (optional)
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={200}
          className="input"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 mb-2">
          Your Review *
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts about this book..."
          rows={4}
          minLength={10}
          maxLength={2000}
          className="input resize-none"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          {content.length}/2000 characters (minimum 10)
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={rating === 0 || content.length < 10 || submitting}
        className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Review
          </>
        )}
      </button>
    </form>
  );
}
