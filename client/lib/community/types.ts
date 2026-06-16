/** Who can see you on the map and in search. Default: private. */
export type Visibility = 'active' | 'private' | 'invisible'

export interface VisitedPlace {
  place_id: string
  place_name: string
  city: string
  rating?: number | null
  price_level?: number | null
  categories?: string[]
}

export interface PlaceAnalytics {
  total_visited: number
  avg_rating: number | null
  cities_count: number
  price_mix: Record<string, number>
}

/** Fields the AI recommender may read — never include private_profile. */
export interface PublicProfile {
  experience_comment?: string
  visited_places?: VisitedPlace[]
  analytics?: PlaceAnalytics
}

export interface PrivateProfile {
  email?: string
  home_country?: string
  dietary_preferences?: string[]
  notes?: string
}

export interface CommunityProfile {
  user_id: string
  display_name: string
  visibility: Visibility
  location?: { lat: number; lng: number } | null
  last_seen?: string
  public_profile: PublicProfile
  private_profile: PrivateProfile
}

export interface MapPresenceUser {
  user_id: string
  display_name: string
  location: { lat: number; lng: number }
  last_seen?: string
}

export interface SearchUserResult {
  user_id: string
  display_name: string
  visibility: Visibility
  connection_status: ConnectionStatus
}

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected'

export interface ConnectionRecord {
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted'
  created_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  from_user_id: string
  to_user_id: string
  text: string
  created_at: string
}

export interface ProfileView {
  user_id: string
  display_name: string
  visibility: Visibility
  connection_status: ConnectionStatus
  /** Public — safe for recommender + other users */
  public_profile: PublicProfile
  /** Only populated when viewer is the profile owner */
  private_profile?: PrivateProfile
  is_own_profile: boolean
}
