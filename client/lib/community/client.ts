import type {
  ChatMessage,
  CommunityProfile,
  ConnectionStatus,
  MapPresenceUser,
  ProfileView,
  SearchUserResult,
  Visibility,
} from './types'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

export function getCommunityUserId(): string {
  if (typeof window === 'undefined') return 'anon'
  const key = 'hodari_uid'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export async function fetchMyProfile(userId: string): Promise<CommunityProfile> {
  return api(`/api/community/me?userId=${encodeURIComponent(userId)}`)
}

export async function updateMyProfile(
  userId: string,
  patch: {
    display_name?: string
    visibility?: Visibility
    location?: { lat: number; lng: number } | null
    public_profile?: { experience_comment?: string }
    private_profile?: Record<string, unknown>
  },
): Promise<CommunityProfile> {
  return api('/api/community/me', { method: 'PUT', body: JSON.stringify({ userId, ...patch }) })
}

export async function fetchMapUsers(userId: string): Promise<MapPresenceUser[]> {
  return api(`/api/community/map?userId=${encodeURIComponent(userId)}`)
}

export async function searchCommunityUsers(userId: string, query: string): Promise<SearchUserResult[]> {
  return api(`/api/community/search?userId=${encodeURIComponent(userId)}&q=${encodeURIComponent(query)}`)
}

export async function fetchProfile(viewerId: string, targetId: string): Promise<ProfileView> {
  return api(`/api/community/profile/${encodeURIComponent(targetId)}?viewerId=${encodeURIComponent(viewerId)}`)
}

export async function connectToUser(fromUserId: string, toUserId: string): Promise<{ status: ConnectionStatus }> {
  return api('/api/community/connect', { method: 'POST', body: JSON.stringify({ fromUserId, toUserId }) })
}

export interface ConnectionsResponse {
  connected: { user_id: string; display_name: string; status: ConnectionStatus }[]
  pending: { user_id: string; display_name: string; direction: 'sent' | 'received' }[]
}

export async function fetchConnections(userId: string): Promise<ConnectionsResponse> {
  return api(`/api/community/connections?userId=${encodeURIComponent(userId)}`)
}

export async function fetchChatMessages(userId: string, peerId: string): Promise<ChatMessage[]> {
  return api(`/api/community/chat?userId=${encodeURIComponent(userId)}&peerId=${encodeURIComponent(peerId)}`)
}

export async function sendMessage(userId: string, peerId: string, text: string): Promise<ChatMessage> {
  return api('/api/community/chat', { method: 'POST', body: JSON.stringify({ userId, peerId, text }) })
}

export async function syncVisitedPlaces(userId: string): Promise<void> {
  await api('/api/community/sync-visited', { method: 'POST', body: JSON.stringify({ userId }) })
}
