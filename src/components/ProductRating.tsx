import { Star } from 'lucide-react';

export default function ProductRating({
  averageRating,
  ratingCount = 0,
  className = '',
}: {
  averageRating?: number | null;
  ratingCount?: number;
  className?: string;
}) {
  const normalizedAverage = Math.min(5, Math.max(0, Number(averageRating) || 0));
  const normalizedCount = Math.max(0, Number(ratingCount) || 0);
  const roundedRating = Math.round(normalizedAverage);
  const label = normalizedCount > 0
    ? `${normalizedAverage.toFixed(1)} dari 5 berdasarkan ${normalizedCount} ulasan`
    : 'Belum ada rating';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label={label}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            className={`h-4 w-4 ${value <= roundedRating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300 dark:text-slate-600'}`}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-text-primary">
        {normalizedCount > 0 ? normalizedAverage.toFixed(1) : 'Baru'}
      </span>
      <span className="text-xs text-text-secondary">
        {normalizedCount > 0 ? `(${normalizedCount} ulasan)` : 'Belum ada rating'}
      </span>
    </div>
  );
}
