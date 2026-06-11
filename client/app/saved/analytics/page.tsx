// client/app/saved/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface AnalyticsData {
  totalSaved: number;
  averageRating: number;
  priceDistribution: { [key: string]: number };
  categoryDistribution: { [key: string]: number };
  savedOverTime: { date: string; count: number }[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/saved');
      const data = await response.json();
      const savedPlaces = data.savedPlaces || [];

      // Calculate analytics
      const priceDist: { [key: string]: number } = {};
      const categoryDist: { [key: string]: number } = {};
      let totalRating = 0;
      let ratingCount = 0;

      savedPlaces.forEach((place: any) => {
        // Price distribution
        const price = place.priceLevel || 'unknown';
        priceDist[price] = (priceDist[price] || 0) + 1;

        // Category distribution
        const category = place.cuisine || 'other';
        categoryDist[category] = (categoryDist[category] || 0) + 1;

        // Rating average
        if (place.rating) {
          totalRating += place.rating;
          ratingCount++;
        }
      });

      setAnalytics({
        totalSaved: savedPlaces.length,
        averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        priceDistribution: priceDist,
        categoryDistribution: categoryDist,
        savedOverTime: [], // Would need timestamps from saved places
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Loading state - Hodari style
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
        <p className="mt-4 text-text2 text-sm font-mono tracking-wide">Loading analytics...</p>
      </div>
    );
  }

  // Error state - Hodari style
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-danger text-lg mb-2 font-mono tracking-wide">⚠️ {error}</div>
        <Button variant="secondary" onClick={fetchAnalytics}>
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state - Hodari style
  if (!analytics || analytics.totalSaved === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="text-6xl mb-4 opacity-60">📊</div>
        <h2 className="text-xl font-display font-semibold text-text mb-2">No analytics yet</h2>
        <p className="text-text2 text-sm mb-6 font-mono tracking-wide">Save some places to see your preferences</p>
        <Link href="/">
          <Button variant="primary">Explore Places</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header with back link */}
      <div className="mb-6">
        <Link href="/saved" className="text-gold hover:text-gold-light text-sm font-mono tracking-wide transition-colors">
          ← Back to Saved Places
        </Link>
      </div>

      <h1 className="text-2xl font-display font-semibold text-text mb-8 tracking-tight">Your Analytics</h1>

      {/* Summary Cards - Hodari style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="text-center p-5">
          <CardLabel className="mb-1">Total Saved</CardLabel>
          <div className="text-3xl font-display font-semibold text-gold">{analytics.totalSaved}</div>
        </Card>
        <Card className="text-center p-5">
          <CardLabel className="mb-1">Average Rating</CardLabel>
          <div className="text-3xl font-display font-semibold text-gold">
            {analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : 'N/A'} ★
          </div>
        </Card>
        <Card className="text-center p-5">
          <CardLabel className="mb-1">Categories</CardLabel>
          <div className="text-3xl font-display font-semibold text-gold">
            {Object.keys(analytics.categoryDistribution).length}
          </div>
        </Card>
      </div>

      {/* Price Distribution - Hodari style */}
      <Card className="p-6 mb-6">
        <h2 className="font-display font-semibold text-text text-lg mb-4">Price Level Distribution</h2>
        <div className="space-y-3">
          {Object.entries(analytics.priceDistribution).map(([price, count]) => {
            const percentage = (count / analytics.totalSaved) * 100;
            const priceLabel = price === 'unknown' ? 'Not specified' : '$'.repeat(Number(price));
            return (
              <div key={price}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-mono text-text2 tracking-wide">{priceLabel}</span>
                  <span className="text-text2 text-xs font-mono">{count} place{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-full bg-surface2 rounded-full h-1.5">
                  <div
                    className="bg-gold h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Category Distribution - Hodari style */}
      <Card className="p-6">
        <h2 className="font-display font-semibold text-text text-lg mb-4">Top Categories</h2>
        <div className="space-y-3">
          {Object.entries(analytics.categoryDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, count]) => {
              const percentage = (count / analytics.totalSaved) * 100;
              return (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-mono text-text2 tracking-wide capitalize">{category}</span>
                    <span className="text-text2 text-xs font-mono">{count} place{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-surface2 rounded-full h-1.5">
                    <div
                      className="bg-gold/70 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Tip Card - Hodari style */}
      {analytics.totalSaved > 0 && (
        <Card glass className="mt-6 p-4 text-center">
          <p className="text-text2 text-xs font-mono tracking-wide">
            💡 The more you save, the better Hodari knows your taste
          </p>
        </Card>
      )}
    </div>
  );
}