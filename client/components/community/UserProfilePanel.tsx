'use client'

import { Globe, Lock, Sparkles } from 'lucide-react'
import { Avatar, Badge, Card, CardLabel, Sheet, Skeleton } from '@/components/ui'
import { PlaceAnalyticsSummary } from '@/components/saved/PlaceAnalyticsSummary'
import { VisitedPlaceCard } from '@/components/saved/VisitedPlaceCard'
import { ConnectButton } from './ConnectButton'
import type { ProfileView } from '@/lib/community/types'

interface Props {
  open: boolean
  onClose: () => void
  profile: ProfileView | null
  loading: boolean
  userId: string
  onConnectionChange: (status: ProfileView['connection_status']) => void
  onExperienceCommentChange?: (comment: string) => void
  onOpenChat?: (peerId: string) => void
}

export function UserProfilePanel({
  open,
  onClose,
  profile,
  loading,
  userId,
  onConnectionChange,
  onExperienceCommentChange,
  onOpenChat,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={profile?.display_name ?? 'Profile'} side="right" className="max-w-md">
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <SkeletonText />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}

      {!loading && profile && (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <Avatar name={profile.display_name} size="lg" status={profile.visibility === 'active' ? 'online' : 'offline'} />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl font-semibold text-text">{profile.display_name}</h3>
              <Badge tone={profile.visibility === 'active' ? 'success' : profile.visibility === 'invisible' ? 'danger' : 'outline'} mono className="mt-2">
                {profile.visibility === 'active' ? 'Active & visible' : profile.visibility === 'invisible' ? 'Invisible' : 'Private'}
              </Badge>
            </div>
          </div>

          {!profile.is_own_profile && (
            <div className="flex gap-2 flex-wrap">
              <ConnectButton
                userId={userId}
                targetUserId={profile.user_id}
                status={profile.connection_status}
                onStatusChange={onConnectionChange}
              />
              {profile.connection_status === 'connected' && onOpenChat && (
                <button
                  type="button"
                  onClick={() => onOpenChat(profile.user_id)}
                  className="text-sm font-mono uppercase tracking-wider text-gold hover:underline"
                >
                  Open chat
                </button>
              )}
            </div>
          )}

          <PublicSection profile={profile} onExperienceCommentChange={onExperienceCommentChange} />

          {profile.is_own_profile && profile.private_profile && (
            <PrivateSection privateProfile={profile.private_profile} />
          )}
        </div>
      )}
    </Sheet>
  )
}

function PublicSection({
  profile,
  onExperienceCommentChange,
}: {
  profile: ProfileView
  onExperienceCommentChange?: (comment: string) => void
}) {
  const places = profile.public_profile.visited_places ?? []
  const analytics = profile.public_profile.analytics

  return (
    <section aria-labelledby="public-profile-heading">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-green" aria-hidden />
        <h4 id="public-profile-heading" className="font-mono text-[11px] uppercase tracking-wider text-green">
          Public — recommendable
        </h4>
        <Badge tone="success" mono>AI-safe</Badge>
      </div>
      <p className="text-xs text-text3 mb-3">
        Only these fields are shared with other fans and the Hodari recommender.
      </p>

      <Card padding="md" className="border-green/20 bg-green/5 mb-3">
        <CardLabel className="text-green">Experience</CardLabel>
        {profile.is_own_profile && onExperienceCommentChange ? (
          <textarea
            placeholder="Share your matchday food experience…"
            value={profile.public_profile.experience_comment ?? ''}
            onChange={(e) => onExperienceCommentChange(e.target.value)}
            rows={3}
            className="w-full mt-2 rounded-xl px-3.5 py-2.5 text-sm text-text bg-surface/80 border border-border focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none"
          />
        ) : (
          <p className="text-sm text-text mt-2 leading-relaxed">
            {profile.public_profile.experience_comment?.trim() || 'No experience comment yet.'}
          </p>
        )}
      </Card>

      {analytics && <PlaceAnalyticsSummary analytics={analytics} />}

      {places.length > 0 && (
        <div className="mt-4">
          <CardLabel>Restaurants visited</CardLabel>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-2 pb-1">
            {places.map((p) => (
              <VisitedPlaceCard key={p.place_id} place={p} />
            ))}
          </div>
        </div>
      )}

      {places.length === 0 && (
        <Card padding="md" className="mt-3 border-dashed">
          <div className="flex items-center gap-2 text-text3">
            <Sparkles className="w-4 h-4" />
            <p className="text-sm">No visited restaurants on public profile yet.</p>
          </div>
        </Card>
      )}
    </section>
  )
}

function PrivateSection({ privateProfile }: { privateProfile: NonNullable<ProfileView['private_profile']> }) {
  return (
    <section aria-labelledby="private-profile-heading" className="pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-danger" aria-hidden />
        <h4 id="private-profile-heading" className="font-mono text-[11px] uppercase tracking-wider text-danger">
          Private — never recommendable
        </h4>
      </div>
      <Card padding="md" className="border-danger/25 bg-danger/5 space-y-2">
        {privateProfile.email && <Row label="Email" value={privateProfile.email} />}
        {privateProfile.home_country && <Row label="Home country" value={privateProfile.home_country} />}
        {privateProfile.dietary_preferences?.length ? (
          <Row label="Dietary" value={privateProfile.dietary_preferences.join(', ')} />
        ) : null}
        {privateProfile.notes && <Row label="Notes" value={privateProfile.notes} />}
        {!privateProfile.email && !privateProfile.home_country && !privateProfile.dietary_preferences?.length && !privateProfile.notes && (
          <p className="text-sm text-text3">Add private details in settings — they never leave this section.</p>
        )}
      </Card>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-text3 uppercase">{label}</p>
      <p className="text-sm text-text">{value}</p>
    </div>
  )
}

function SkeletonText() {
  return (
    <>
      <div className="h-4 w-3/4 bg-surface2 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-surface2 rounded animate-pulse mt-2" />
    </>
  )
}
