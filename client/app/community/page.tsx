'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { ChatShell } from '@/components/community/ChatShell'
import { PresenceMap } from '@/components/community/PresenceMap'
import { UserProfilePanel } from '@/components/community/UserProfilePanel'
import { UserSearch } from '@/components/community/UserSearch'
import { VisibilityToggle } from '@/components/community/VisibilityToggle'
import { Badge, Button, Input, Tabs, TabsContent, TabsList, TabsTrigger, ToastProvider, useToast } from '@/components/ui'
import {
  fetchMapUsers,
  fetchMyProfile,
  fetchProfile,
  getCommunityUserId,
  syncVisitedPlaces,
  updateMyProfile,
} from '@/lib/community/client'
import type { CommunityProfile, MapPresenceUser, ProfileView, Visibility } from '@/lib/community/types'
import { requestUserLocation } from '@/lib/geo'
import type { Theme } from '@/lib/types'

function CommunityContent() {
  const { toast } = useToast()
  const userId = getCommunityUserId()

  const [theme] = useState<Theme>(() =>
    typeof window !== 'undefined' && localStorage.getItem('hodari_theme') === 'dark' ? 'dark' : 'light',
  )
  const [profile, setProfile] = useState<CommunityProfile | null>(null)
  const [mapUsers, setMapUsers] = useState<MapPresenceUser[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [visibilitySaving, setVisibilitySaving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [profileView, setProfileView] = useState<ProfileView | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [chatPeerId, setChatPeerId] = useState<string | null>(null)
  const [tab, setTab] = useState('map')
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [experienceDraft, setExperienceDraft] = useState('')

  const refreshMap = useCallback(async () => {
    try {
      const users = await fetchMapUsers(userId)
      setMapUsers(users)
    } catch {
      setMapUsers([])
    }
  }, [userId])

  const loadProfile = useCallback(async () => {
    try {
      const p = await fetchMyProfile(userId)
      setProfile(p)
      setDisplayNameDraft(p.display_name)
      setExperienceDraft(p.public_profile.experience_comment ?? '')
    } catch (err) {
      toast({ title: 'Could not load profile', description: String(err), tone: 'danger' })
    }
  }, [userId, toast])

  useEffect(() => {
    loadProfile()
    refreshMap()
    requestUserLocation().then(setUserLocation)
    syncVisitedPlaces(userId).catch(() => {})
  }, [loadProfile, refreshMap, userId])

  async function handleVisibilityChange(next: Visibility) {
    if (!profile) return
    const prev = profile.visibility
    const prevLocation = profile.location

    setProfile({ ...profile, visibility: next, location: next === 'active' ? userLocation : null })
    setVisibilitySaving(true)

    try {
      const updated = await updateMyProfile(userId, {
        visibility: next,
        location: next === 'active' ? userLocation : null,
      })
      setProfile(updated)
      await refreshMap()
      toast({
        title:
          next === 'active' ? 'You are visible on the map' : next === 'invisible' ? 'You are fully hidden' : 'You are private',
        tone: 'success',
      })
    } catch (err) {
      setProfile({ ...profile, visibility: prev, location: prevLocation })
      toast({ title: 'Visibility update failed', description: String(err), tone: 'danger' })
    } finally {
      setVisibilitySaving(false)
    }
  }

  async function openUserProfile(targetId: string) {
    setSelectedUserId(targetId)
    setProfileOpen(true)
    setProfileLoading(true)
    try {
      const view = await fetchProfile(userId, targetId)
      setProfileView(view)
      if (view.is_own_profile) {
        setExperienceDraft(view.public_profile.experience_comment ?? '')
      }
    } catch (err) {
      toast({ title: 'Profile unavailable', description: String(err), tone: 'danger' })
      setProfileView(null)
    } finally {
      setProfileLoading(false)
    }
  }

  async function saveOwnProfileFields() {
    try {
      const updated = await updateMyProfile(userId, {
        display_name: displayNameDraft,
        public_profile: { experience_comment: experienceDraft },
      })
      setProfile(updated)
      if (profileView?.is_own_profile) {
        setProfileView({
          ...profileView,
          display_name: updated.display_name,
          public_profile: updated.public_profile,
        })
      }
      toast({ title: 'Profile saved', tone: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), tone: 'danger' })
    }
  }

  async function closeProfile() {
    if (profileView?.is_own_profile && experienceDraft !== (profileView.public_profile.experience_comment ?? '')) {
      await saveOwnProfileFields()
    }
    setProfileOpen(false)
  }

  function handleOpenChat(peerId: string) {
    setProfileOpen(false)
    setChatPeerId(peerId)
    setTab('chat')
  }

  const onMapSelect = (id: string) => openUserProfile(id)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border/60 bg-surface/40 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-text2 hover:text-gold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Hodari
            </Link>
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-text">Community</h1>
            <Badge tone="gold" mono>Fans</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" pill onClick={() => openUserProfile(userId)} leftIcon={<User className="w-4 h-4" />}>
              My profile
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <VisibilityToggle
            value={profile?.visibility ?? 'private'}
            onChange={handleVisibilityChange}
            saving={visibilitySaving}
          />

          <CardSettings
            displayName={displayNameDraft}
            onDisplayNameChange={setDisplayNameDraft}
            onSave={saveOwnProfileFields}
          />

          <Tabs value={tab} onValueChange={setTab} className="lg:hidden">
            <TabsList>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="map">
              <MapSection
                users={mapUsers}
                userLocation={userLocation}
                selectedUserId={selectedUserId}
                onSelectUser={onMapSelect}
                theme={theme}
                visibility={profile?.visibility ?? 'private'}
              />
            </TabsContent>
            <TabsContent value="search">
              <Panel>
                <UserSearch userId={userId} onSelectUser={openUserProfile} />
              </Panel>
            </TabsContent>
            <TabsContent value="chat">
              <ChatShell userId={userId} activePeerId={chatPeerId} onSelectPeer={setChatPeerId} />
            </TabsContent>
          </Tabs>

          <div className="hidden lg:grid lg:grid-cols-[1fr_340px] gap-4 min-h-[520px]">
            <MapSection
              users={mapUsers}
              userLocation={userLocation}
              selectedUserId={selectedUserId}
              onSelectUser={onMapSelect}
              theme={theme}
              visibility={profile?.visibility ?? 'private'}
            />
            <div className="flex flex-col gap-4 min-h-0">
              <Panel className="flex-1 min-h-[240px]">
                <UserSearch userId={userId} onSelectUser={openUserProfile} />
              </Panel>
              <div className="h-[280px] shrink-0">
                <ChatShell userId={userId} activePeerId={chatPeerId} onSelectPeer={setChatPeerId} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <UserProfilePanel
        open={profileOpen}
        onClose={closeProfile}
        profile={profileView}
        loading={profileLoading}
        userId={userId}
        onConnectionChange={(status) => {
          if (profileView) setProfileView({ ...profileView, connection_status: status })
        }}
        onExperienceCommentChange={profileView?.is_own_profile ? setExperienceDraft : undefined}
        onOpenChat={handleOpenChat}
      />
    </div>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface/40 p-4 h-full min-h-[280px] flex flex-col ${className}`}>
      {children}
    </div>
  )
}

function MapSection({
  users,
  userLocation,
  selectedUserId,
  onSelectUser,
  theme,
  visibility,
}: {
  users: MapPresenceUser[]
  userLocation: { lat: number; lng: number } | null
  selectedUserId: string | null
  onSelectUser: (id: string) => void
  theme: Theme
  visibility: Visibility
}) {
  return (
    <div className="relative h-[360px] lg:h-[520px] rounded-2xl border border-border overflow-hidden">
      <PresenceMap
        users={users}
        userLocation={userLocation}
        selectedUserId={selectedUserId}
        onSelectUser={onSelectUser}
        theme={theme}
      />
      {visibility !== 'active' && (
        <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-xs">
          <div className="glass rounded-xl px-3 py-2 border border-gold/30 text-xs text-text2">
            You are not on the map — switch to <strong className="text-gold">Active & visible</strong> to appear.
          </div>
        </div>
      )}
      {users.length === 0 && (
        <div className="absolute bottom-3 left-3 right-3 text-center">
          <p className="text-xs text-text3 glass inline-block px-3 py-1.5 rounded-full">
            No fans on the map right now. Demo users appear when MongoDB MCP is running.
          </p>
        </div>
      )}
    </div>
  )
}

function CardSettings({
  displayName,
  onDisplayNameChange,
  onSave,
}: {
  displayName: string
  onDisplayNameChange: (v: string) => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <Input
        label="Display name"
        value={displayName}
        onChange={(e) => onDisplayNameChange(e.target.value)}
        hint="Shown in search and on your public profile."
        className="flex-1"
      />
      <Button variant="secondary" onClick={onSave} className="shrink-0">
        Save name
      </Button>
    </div>
  )
}

export default function CommunityPage() {
  return (
    <ToastProvider>
      <CommunityContent />
    </ToastProvider>
  )
}
