// client/app/saved/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ReminderModal } from './components/ReminderModal';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface SavedPlace {
  id: string;
  placeId: string;
  name: string;
  rating: number | null;
  priceLevel: number | null;
  cuisine: string | null;
  photoRef: string | null;
  comment: string | null;
  reminderDate: string | null;
  reminderNotes: string | null;
  createdAt: string;
}

type ViewMode = 'grid' | 'list';

export default function SavedPage() {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlace, setSelectedPlace] = useState<SavedPlace | null>(null);
  const [reminderPlace, setReminderPlace] = useState<SavedPlace | null>(null);

  useEffect(() => {
    fetchSavedPlaces();
  }, []);

  const fetchSavedPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/saved');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please login to view saved places');
        }
        throw new Error('Failed to fetch saved places');
      }
      const data = await response.json();
      setSavedPlaces(data.savedPlaces || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (placeId: string) => {
    try {
      const response = await fetch(`/api/saved?placeId=${placeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove place');
      setSavedPlaces(savedPlaces.filter(p => p.placeId !== placeId));
    } catch (err) {
      console.error('Error removing place:', err);
      alert('Failed to remove place. Please try again.');
    }
  };

  const priceDisplay = (level: number | null) => {
    if (!level) return 'N/A';
    return '$'.repeat(level);
  };

  // Loading state - Hodari style
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
        <p className="mt-4 text-text2 text-sm font-mono tracking-wide">Loading saved places...</p>
      </div>
    );
  }

  // Error state - Hodari style
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-danger text-lg mb-2 font-mono tracking-wide">⚠️ {error}</div>
        <Button variant="secondary" onClick={fetchSavedPlaces}>
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state - Hodari style
  if (savedPlaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="text-6xl mb-4 opacity-60">📍</div>
        <h2 className="text-xl font-display font-semibold text-text mb-2">No saved places yet</h2>
        <p className="text-text2 text-sm mb-6 font-mono tracking-wide">Start exploring and save places you like</p>
        <Link href="/">
          <Button variant="primary">Explore Places</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header - Hodari style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl font-display font-semibold text-text tracking-tight">Saved Places</h1>
        <div className="flex gap-2">
          <Link href="/saved/analytics">
            <Button variant="secondary" size="sm">Analytics</Button>
          </Link>
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            ⊞ Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            ☰ List
          </Button>
        </div>
      </div>

      {/* Saved Places - Grid View - Hodari style */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {savedPlaces.map((place) => (
            <Card key={place.id} interactive className="overflow-hidden p-0">
              {/* Photo */}
              <div className="relative h-48 bg-surface2">
                {place.photoRef ? (
                  <img
                    src={`/api/place-photo?ref=${place.photoRef}`}
                    alt={place.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-text3 text-sm font-mono">
                    No image
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-sans font-medium text-text truncate">{place.name}</h3>

                <div className="flex items-center gap-2 mt-1 text-sm">
                  {place.rating && (
                    <span className="flex items-center gap-1">
                      <span className="text-gold">★</span>
                      <span className="text-text2">{place.rating}</span>
                    </span>
                  )}
                  {place.priceLevel && (
                    <span className="text-text3 text-xs font-mono">{priceDisplay(place.priceLevel)}</span>
                  )}
                </div>

                {place.cuisine && (
                  <p className="text-text2 text-xs mt-1 font-mono tracking-wide">{place.cuisine}</p>
                )}

                {place.comment && (
                  <p className="text-text2 text-sm mt-2 line-clamp-2">{place.comment}</p>
                )}

                {/* Reminder indicator */}
                {place.reminderDate && (
                  <Badge tone="gold" mono className="mt-3 text-[10px]">
                    📅 Reminder set
                  </Badge>
                )}

                {/* Actions - Hodari style */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPlace(place)}>
                    Details
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setReminderPlace(place)}>
                    Reminder
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemove(place.placeId)}>
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        // List View - Hodari style
        <div className="space-y-3">
          {savedPlaces.map((place) => (
            <Card key={place.id} interactive className="p-4">
              <div className="flex gap-4">
                {/* Photo thumbnail */}
                <div className="w-20 h-20 bg-surface2 rounded-xl flex-shrink-0 overflow-hidden">
                  {place.photoRef ? (
                    <img
                      src={`/api/place-photo?ref=${place.photoRef}`}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-text3 text-xs font-mono">
                      No img
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-sans font-medium text-text">{place.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                    {place.rating && (
                      <span className="flex items-center gap-1">
                        <span className="text-gold">★</span>
                        <span className="text-text2">{place.rating}</span>
                      </span>
                    )}
                    {place.priceLevel && (
                      <span className="text-text3 text-xs font-mono">{priceDisplay(place.priceLevel)}</span>
                    )}
                    {place.cuisine && (
                      <span className="text-text2 text-xs font-mono">{place.cuisine}</span>
                    )}
                    {place.reminderDate && (
                      <Badge tone="gold" mono className="text-[10px]">📅 Reminder</Badge>
                    )}
                  </div>
                  {place.comment && (
                    <p className="text-text2 text-sm mt-1 line-clamp-1">{place.comment}</p>
                  )}
                </div>

                {/* Actions - Hodari style */}
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedPlace(place)}>
                    Details
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setReminderPlace(place)}>
                    Reminder
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemove(place.placeId)}>
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal - Hodari style */}
      {selectedPlace && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlace(null)}
        >
          <div
            className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-surface p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-display font-semibold text-text">{selectedPlace.name}</h2>
              <button
                onClick={() => setSelectedPlace(null)}
                className="text-text2 hover:text-gold text-2xl leading-none transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Photo */}
              <div className="aspect-video bg-surface2 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                {selectedPlace.photoRef ? (
                  <img
                    src={`/api/place-photo?ref=${selectedPlace.photoRef}`}
                    alt={selectedPlace.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-text3 font-mono text-sm">No photo available</span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  {selectedPlace.rating && (
                    <p>
                      <strong className="font-mono text-gold text-xs tracking-wide">RATING</strong>
                      <span className="ml-2 text-text">{selectedPlace.rating} ★</span>
                    </p>
                  )}
                  {selectedPlace.priceLevel && (
                    <p>
                      <strong className="font-mono text-gold text-xs tracking-wide">PRICE</strong>
                      <span className="ml-2 text-text">{priceDisplay(selectedPlace.priceLevel)}</span>
                    </p>
                  )}
                </div>

                {selectedPlace.cuisine && (
                  <p>
                    <strong className="font-mono text-gold text-xs tracking-wide">CUISINE</strong>
                    <span className="ml-2 text-text">{selectedPlace.cuisine}</span>
                  </p>
                )}

                <p>
                  <strong className="font-mono text-gold text-xs tracking-wide">SAVED</strong>
                  <span className="ml-2 text-text">{new Date(selectedPlace.createdAt).toLocaleDateString()}</span>
                </p>

                {selectedPlace.reminderDate && (
                  <p>
                    <strong className="font-mono text-gold text-xs tracking-wide">REMINDER</strong>
                    <span className="ml-2 text-text">{new Date(selectedPlace.reminderDate).toLocaleString()}</span>
                    {selectedPlace.reminderNotes && (
                      <span className="block text-text2 text-sm mt-1 ml-14">{selectedPlace.reminderNotes}</span>
                    )}
                  </p>
                )}

                {selectedPlace.comment && (
                  <div>
                    <strong className="font-mono text-gold text-xs tracking-wide">YOUR COMMENT</strong>
                    <p className="mt-1 p-3 bg-surface2 rounded-xl text-text2 text-sm">{selectedPlace.comment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {reminderPlace && (
        <ReminderModal
          place={reminderPlace}
          onClose={() => setReminderPlace(null)}
          onSave={fetchSavedPlaces}
        />
      )}
    </div>
  );
}