import type { CommunityProfile, PublicProfile, ProfileView } from './types'

/**
 * Contract for the AI community recommender (agent engineer).
 * Only these fields may be passed to agent tools — never private_profile.
 */
export interface RecommendableUser {
  user_id: string
  display_name: string
  visibility: 'active' | 'private'
  public_profile: PublicProfile
}

export function toRecommendableUser(profile: CommunityProfile | ProfileView): RecommendableUser | null {
  if (profile.visibility === 'invisible') return null
  return {
    user_id: profile.user_id,
    display_name: profile.display_name,
    visibility: profile.visibility,
    public_profile: profile.public_profile,
  }
}

export function toRecommendableUsers(profiles: (CommunityProfile | ProfileView)[]): RecommendableUser[] {
  return profiles.map(toRecommendableUser).filter((p): p is RecommendableUser => p !== null)
}

/** Fields explicitly excluded from recommender input */
export const RECOMMENDER_EXCLUDED_FIELDS = [
  'private_profile',
  'private_profile.email',
  'private_profile.home_country',
  'private_profile.dietary_preferences',
  'private_profile.notes',
  'location',
] as const
