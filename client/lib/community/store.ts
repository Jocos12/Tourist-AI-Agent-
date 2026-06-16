import { mcpFind, mcpInsertOne, mcpUpdateOne } from '@/lib/mongo/mcpClient'
import type {
  ChatMessage,
  CommunityProfile,
  ConnectionRecord,
  ConnectionStatus,
  MapPresenceUser,
  PlaceAnalytics,
  ProfileView,
  PublicProfile,
  SearchUserResult,
  VisitedPlace,
  Visibility,
} from './types'

const PROFILES = 'community_profiles'
const CONNECTIONS = 'community_connections'
const MESSAGES = 'community_messages'

const DEMO_USERS: Omit<CommunityProfile, 'last_seen'>[] = [
  {
    user_id: 'demo-maria',
    display_name: 'Maria Santos',
    visibility: 'active',
    location: { lat: 41.3874, lng: 2.1686 },
    public_profile: {
      experience_comment: 'Camp Nou matchdays are magic — El Nacional for tapas after the game.',
      visited_places: [
        { place_id: 'demo-1', place_name: 'El Nacional', city: 'Barcelona', rating: 4.5, price_level: 2 },
        { place_id: 'demo-2', place_name: 'Tickets Bar', city: 'Barcelona', rating: 4.7, price_level: 2 },
      ],
      analytics: { total_visited: 2, avg_rating: 4.6, cities_count: 1, price_mix: { '€€': 2 } },
    },
    private_profile: { home_country: 'Brazil', dietary_preferences: ['vegetarian-friendly'] },
  },
  {
    user_id: 'demo-james',
    display_name: 'James Okonkwo',
    visibility: 'active',
    location: { lat: 40.758, lng: -73.9855 },
    public_profile: {
      experience_comment: 'NYC World Cup fan zones — Kalustyan’s for spices, then a slice in Murray Hill.',
      visited_places: [
        { place_id: 'demo-3', place_name: "Kalustyan's", city: 'New York', rating: 4.8, price_level: 2 },
      ],
      analytics: { total_visited: 1, avg_rating: 4.8, cities_count: 1, price_mix: { '€€': 1 } },
    },
    private_profile: { home_country: 'Nigeria' },
  },
  {
    user_id: 'demo-yuki',
    display_name: 'Yuki Tanaka',
    visibility: 'private',
    location: null,
    public_profile: {
      experience_comment: 'Exploring ramen spots between matches — recommendations welcome.',
      visited_places: [],
      analytics: { total_visited: 0, avg_rating: null, cities_count: 0, price_mix: {} },
    },
    private_profile: { home_country: 'Japan', dietary_preferences: ['pescatarian'] },
  },
]

let demoSeeded = false

function nowIso(): string {
  return new Date().toISOString()
}

function docToProfile(doc: Record<string, unknown>): CommunityProfile {
  return {
    user_id: String(doc.user_id),
    display_name: String(doc.display_name ?? 'Traveler'),
    visibility: (doc.visibility as Visibility) ?? 'private',
    location: (doc.location as CommunityProfile['location']) ?? null,
    last_seen: doc.last_seen ? String(doc.last_seen) : undefined,
    public_profile: (doc.public_profile as PublicProfile) ?? {},
    private_profile: (doc.private_profile as CommunityProfile['private_profile']) ?? {},
  }
}

function priceLabel(level?: number | null): string {
  if (!level || level < 1) return '—'
  return '€'.repeat(Math.min(level, 4))
}

function computeAnalytics(places: VisitedPlace[]): PlaceAnalytics {
  const ratings = places.map((p) => p.rating).filter((r): r is number => typeof r === 'number')
  const cities = new Set(places.map((p) => p.city).filter(Boolean))
  const price_mix: Record<string, number> = {}
  for (const p of places) {
    const label = priceLabel(p.price_level)
    price_mix[label] = (price_mix[label] ?? 0) + 1
  }
  return {
    total_visited: places.length,
    avg_rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    cities_count: cities.size,
    price_mix,
  }
}

async function ensureDemoUsers(): Promise<void> {
  if (demoSeeded) return
  const existing = await mcpFind(PROFILES, {}, { limit: 1 })
  if (existing.length > 0) {
    demoSeeded = true
    return
  }
  for (const user of DEMO_USERS) {
    await mcpUpdateOne(
      PROFILES,
      { user_id: user.user_id },
      { $set: { ...user, last_seen: nowIso() } },
      true,
    )
  }
  demoSeeded = true
}

export async function getOrCreateProfile(userId: string, displayName?: string): Promise<CommunityProfile> {
  await ensureDemoUsers()
  const docs = await mcpFind(PROFILES, { user_id: userId }, { limit: 1 })
  if (docs.length > 0) return docToProfile(docs[0])

  const profile: CommunityProfile = {
    user_id: userId,
    display_name: displayName?.trim() || `Fan ${userId.slice(0, 6)}`,
    visibility: 'private',
    location: null,
    last_seen: nowIso(),
    public_profile: {
      experience_comment: '',
      visited_places: [],
      analytics: { total_visited: 0, avg_rating: null, cities_count: 0, price_mix: {} },
    },
    private_profile: {},
  }
  await mcpUpdateOne(PROFILES, { user_id: userId }, { $set: profile }, true)
  return profile
}

export async function syncVisitedFromInteractions(userId: string): Promise<PublicProfile> {
  const interactions = await mcpFind(
    'interactions',
    { user_id: userId, action: { $in: ['visited', 'liked', 'booked'] } },
    { limit: 50 },
  )

  const seen = new Set<string>()
  const visited: VisitedPlace[] = []
  for (const row of interactions) {
    const placeId = String(row.place_id ?? '')
    if (!placeId || seen.has(placeId)) continue
    seen.add(placeId)
    visited.push({
      place_id: placeId,
      place_name: String(row.place_name ?? 'Unknown place'),
      city: String(row.city ?? ''),
      rating: typeof row.rating === 'number' ? row.rating : null,
      price_level: typeof row.price_level === 'number' ? row.price_level : null,
    })
  }

  const analytics = computeAnalytics(visited)
  const publicProfile: PublicProfile = { visited_places: visited, analytics }

  const existing = await getOrCreateProfile(userId)
  await mcpUpdateOne(
    PROFILES,
    { user_id: userId },
    {
      $set: {
        'public_profile.visited_places': visited,
        'public_profile.analytics': analytics,
        'public_profile.experience_comment': existing.public_profile.experience_comment ?? '',
      },
    },
  )

  return publicProfile
}

export async function updateProfile(
  userId: string,
  patch: {
    display_name?: string
    visibility?: Visibility
    location?: { lat: number; lng: number } | null
    public_profile?: Partial<PublicProfile>
    private_profile?: Partial<CommunityProfile['private_profile']>
  },
): Promise<CommunityProfile> {
  await getOrCreateProfile(userId)
  const set: Record<string, unknown> = { last_seen: nowIso() }

  if (patch.display_name !== undefined) set.display_name = patch.display_name.trim()
  if (patch.visibility !== undefined) {
    set.visibility = patch.visibility
    if (patch.visibility !== 'active') set.location = null
  }
  if (patch.location !== undefined) set.location = patch.location
  if (patch.public_profile?.experience_comment !== undefined) {
    set['public_profile.experience_comment'] = patch.public_profile.experience_comment
  }
  if (patch.private_profile) {
    for (const [k, v] of Object.entries(patch.private_profile)) {
      set[`private_profile.${k}`] = v
    }
  }

  await mcpUpdateOne(PROFILES, { user_id: userId }, { $set: set })
  return getOrCreateProfile(userId)
}

export async function getMapUsers(excludeUserId?: string): Promise<MapPresenceUser[]> {
  await ensureDemoUsers()
  const filter: Record<string, unknown> = {
    visibility: 'active',
    location: { $ne: null },
  }
  if (excludeUserId) filter.user_id = { $ne: excludeUserId }

  const docs = await mcpFind(PROFILES, filter, { limit: 100 })
  return docs
    .filter((d) => d.location && typeof d.location === 'object')
    .map((d) => ({
      user_id: String(d.user_id),
      display_name: String(d.display_name),
      location: d.location as { lat: number; lng: number },
      last_seen: d.last_seen ? String(d.last_seen) : undefined,
    }))
}

export async function searchUsers(query: string, viewerId: string): Promise<SearchUserResult[]> {
  await ensureDemoUsers()
  const q = query.trim()
  if (!q) return []

  const docs = await mcpFind(
    PROFILES,
    {
      display_name: { $regex: q, $options: 'i' },
      visibility: { $ne: 'invisible' },
      user_id: { $ne: viewerId },
    },
    { limit: 20 },
  )

  const results: SearchUserResult[] = []
  for (const doc of docs) {
    const userId = String(doc.user_id)
    results.push({
      user_id: userId,
      display_name: String(doc.display_name),
      visibility: (doc.visibility as Visibility) ?? 'private',
      connection_status: await getConnectionStatus(viewerId, userId),
    })
  }
  return results
}

async function findConnection(a: string, b: string): Promise<ConnectionRecord | null> {
  const docs = await mcpFind(
    CONNECTIONS,
    {
      $or: [
        { from_user_id: a, to_user_id: b },
        { from_user_id: b, to_user_id: a },
      ],
    },
    { limit: 1 },
  )
  if (!docs.length) return null
  const d = docs[0]
  return {
    from_user_id: String(d.from_user_id),
    to_user_id: String(d.to_user_id),
    status: d.status as 'pending' | 'accepted',
    created_at: String(d.created_at),
  }
}

export async function getConnectionStatus(viewerId: string, targetId: string): Promise<ConnectionStatus> {
  if (viewerId === targetId) return 'none'
  const conn = await findConnection(viewerId, targetId)
  if (!conn) return 'none'
  if (conn.status === 'accepted') return 'connected'
  if (conn.from_user_id === viewerId) return 'pending_sent'
  return 'pending_received'
}

export async function getProfileView(viewerId: string, targetId: string): Promise<ProfileView | null> {
  await ensureDemoUsers()
  const docs = await mcpFind(PROFILES, { user_id: targetId }, { limit: 1 })
  if (!docs.length) return null

  const profile = docToProfile(docs[0])
  const isOwn = viewerId === targetId

  if (!isOwn && profile.visibility === 'invisible') return null

  return {
    user_id: profile.user_id,
    display_name: profile.display_name,
    visibility: profile.visibility,
    connection_status: await getConnectionStatus(viewerId, targetId),
    public_profile: profile.public_profile,
    private_profile: isOwn ? profile.private_profile : undefined,
    is_own_profile: isOwn,
  }
}

export async function requestConnection(fromUserId: string, toUserId: string): Promise<ConnectionStatus> {
  if (fromUserId === toUserId) return 'none'

  const existing = await findConnection(fromUserId, toUserId)
  if (existing) {
    if (existing.status === 'accepted') return 'connected'
    if (existing.from_user_id === fromUserId) return 'pending_sent'
    // Accept incoming request when user clicks connect back
    await mcpUpdateOne(
      CONNECTIONS,
      { from_user_id: existing.from_user_id, to_user_id: existing.to_user_id },
      { $set: { status: 'accepted' } },
    )
    return 'connected'
  }

  await mcpInsertOne(CONNECTIONS, {
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: 'pending',
    created_at: nowIso(),
  })
  return 'pending_sent'
}

export async function listConnections(userId: string): Promise<
  { user_id: string; display_name: string; status: ConnectionStatus }[]
> {
  const docs = await mcpFind(
    CONNECTIONS,
    {
      $or: [{ from_user_id: userId }, { to_user_id: userId }],
      status: 'accepted',
    },
    { limit: 50 },
  )

  const peers: { user_id: string; display_name: string; status: ConnectionStatus }[] = []
  for (const d of docs) {
    const peerId = d.from_user_id === userId ? String(d.to_user_id) : String(d.from_user_id)
    const profiles = await mcpFind(PROFILES, { user_id: peerId }, { limit: 1 })
    peers.push({
      user_id: peerId,
      display_name: profiles.length ? String(profiles[0].display_name) : peerId.slice(0, 8),
      status: 'connected',
    })
  }
  return peers
}

function conversationId(a: string, b: string): string {
  return [a, b].sort().join(':')
}

export async function getChatMessages(userId: string, peerId: string): Promise<ChatMessage[]> {
  const cid = conversationId(userId, peerId)
  const docs = await mcpFind(MESSAGES, { conversation_id: cid }, { limit: 100 })
  return docs
    .map((d) => ({
      id: String(d.id ?? d._id ?? `${d.created_at}`),
      conversation_id: cid,
      from_user_id: String(d.from_user_id),
      to_user_id: String(d.to_user_id),
      text: String(d.text),
      created_at: String(d.created_at),
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export async function sendChatMessage(userId: string, peerId: string, text: string): Promise<ChatMessage> {
  const status = await getConnectionStatus(userId, peerId)
  if (status !== 'connected') {
    throw new Error('You must be connected to send messages')
  }

  const msg: ChatMessage = {
    id: `msg-${Date.now()}`,
    conversation_id: conversationId(userId, peerId),
    from_user_id: userId,
    to_user_id: peerId,
    text: text.trim(),
    created_at: nowIso(),
  }

  await mcpInsertOne(MESSAGES, msg)
  return msg
}

export async function listPendingConnections(userId: string): Promise<
  { user_id: string; display_name: string; direction: 'sent' | 'received' }[]
> {
  const docs = await mcpFind(CONNECTIONS, { status: 'pending', $or: [{ from_user_id: userId }, { to_user_id: userId }] }, { limit: 20 })
  const out: { user_id: string; display_name: string; direction: 'sent' | 'received' }[] = []
  for (const d of docs) {
    const peerId = d.from_user_id === userId ? String(d.to_user_id) : String(d.from_user_id)
    const profiles = await mcpFind(PROFILES, { user_id: peerId }, { limit: 1 })
    out.push({
      user_id: peerId,
      display_name: profiles.length ? String(profiles[0].display_name) : peerId.slice(0, 8),
      direction: d.from_user_id === userId ? 'sent' : 'received',
    })
  }
  return out
}
