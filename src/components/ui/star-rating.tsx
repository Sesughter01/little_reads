'use client';

import { Star } from 'lucide-react';

export function StarRating({
  rating,
  count,
  size = 'sm',
}: {
  rating: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= Math.round(rating)
              ? 'fill-brand-yellow text-brand-yellow'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      {count !== undefined && (
        <span className="text-sm text-gray-500 ml-1">({count})</span>
      )}
    </div>
  );
}

export function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none focus:ring-2 focus:ring-brand-purple rounded"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= value
                ? 'fill-brand-yellow text-brand-yellow hover:fill-brand-yellow/80'
                : 'fill-gray-200 text-gray-200 hover:fill-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
