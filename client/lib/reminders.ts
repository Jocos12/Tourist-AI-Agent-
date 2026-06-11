/**
 * In-app visit reminders (no Google Calendar sync).
 *
 * Stored in MongoDB collection `reminders`.
 */

export type ReminderStatus = 'scheduled' | 'cancelled' | 'completed'

export interface PlaceReminder {
  /** Stable id (uuid or `${user_id}_${place_id}_${scheduled_at}`) */
  id: string
  user_id: string
  place_id: string
  place_name: string
  /** ISO 8601 local datetime from datetime-local input */
  scheduled_at: string
  /** IANA timezone when known; defaults to browser on create */
  timezone?: string | null
  notes?: string | null
  status: ReminderStatus
  /** `user` = UI; `agent` = Hodari tool (mock until agents wired) */
  source: 'user' | 'agent'
  created_at: string
  updated_at: string
}

export interface ReminderInput {
  placeId: string
  placeName: string
  scheduledAt: string
  notes?: string | null
  timezone?: string | null
}

/** Client view (camelCase). */
export interface ReminderView {
  id: string
  placeId: string
  placeName: string
  scheduledAt: string
  notes: string | null
  status: ReminderStatus
  source: 'user' | 'agent'
}

export function reminderFromDoc(doc: Record<string, unknown>): ReminderView {
  return {
    id: String(doc.id ?? doc._id),
    placeId: String(doc.place_id),
    placeName: String(doc.place_name ?? 'Place'),
    scheduledAt: String(doc.scheduled_at),
    notes: typeof doc.notes === 'string' ? doc.notes : null,
    status: (doc.status as ReminderStatus) ?? 'scheduled',
    source: doc.source === 'agent' ? 'agent' : 'user',
  }
}

export function reminderToDoc(userId: string, input: ReminderInput): PlaceReminder {
  const now = new Date().toISOString()
  const id = `${userId}_${input.placeId}_${Date.now()}`
  return {
    id,
    user_id: userId,
    place_id: input.placeId,
    place_name: input.placeName,
    scheduled_at: input.scheduledAt,
    timezone: input.timezone ?? null,
    notes: input.notes ?? null,
    status: 'scheduled',
    source: 'user',
    created_at: now,
    updated_at: now,
  }
}

/**
 * Mock Hodari agent action schema — do not wire to agents/hodari until approved.
 * Documented for Engineer (needs-agent) handoff.
 */
export const REMINDER_AGENT_ACTIONS = {
  create_reminder: {
    name: 'create_reminder',
    description: 'Schedule an in-app visit reminder for a saved place',
    parameters: {
      type: 'object',
      required: ['place_id', 'place_name', 'scheduled_at'],
      properties: {
        place_id: { type: 'string', description: 'Google Place ID' },
        place_name: { type: 'string' },
        scheduled_at: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
        timezone: { type: 'string' },
      },
    },
  },
  edit_reminder: {
    name: 'edit_reminder',
    description: 'Update scheduled_at or notes on an existing reminder',
    parameters: {
      type: 'object',
      required: ['reminder_id'],
      properties: {
        reminder_id: { type: 'string' },
        scheduled_at: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
      },
    },
  },
  cancel_reminder: {
    name: 'cancel_reminder',
    description: 'Mark a reminder as cancelled',
    parameters: {
      type: 'object',
      required: ['reminder_id'],
      properties: { reminder_id: { type: 'string' } },
    },
  },
} as const
