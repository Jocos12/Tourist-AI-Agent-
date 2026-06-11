// client/app/saved/components/ReminderModal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ReminderModalProps {
  place: {
    id: string;
    placeId: string;
    name: string;
    reminderDate: string | null;
    reminderNotes: string | null;
  };
  onClose: () => void;
  onSave: () => void;
}

export function ReminderModal({ place, onClose, onSave }: ReminderModalProps) {
  const [reminderDate, setReminderDate] = useState(place.reminderDate || '');
  const [reminderNotes, setReminderNotes] = useState(place.reminderNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/saved?placeId=${place.placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderDate, reminderNotes }),
      });
      if (response.ok) {
        onSave();
        onClose();
      } else {
        alert('Failed to save reminder');
      }
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-display font-semibold text-text">
            Set Reminder for <span className="text-gold">{place.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-text2 hover:text-gold text-2xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-text2 text-xs font-mono tracking-wide mb-1.5 uppercase">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-text2 text-xs font-mono tracking-wide mb-1.5 uppercase">
              Notes (optional)
            </label>
            <textarea
              value={reminderNotes}
              onChange={(e) => setReminderNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all resize-none"
              placeholder="Add any notes about your visit..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            loading={saving}
          >
            {saving ? 'Saving...' : 'Save Reminder'}
          </Button>
        </div>
      </Card>
    </div>
  );
}