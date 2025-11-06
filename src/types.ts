export type EventStatus = 'past' | 'live' | 'upcoming'

export interface GuestPreferences {
  userId: string
  artists: string[]
  genres: string[]
  recentTracks: string[]
  source?: 'manual' | 'spotify'
  spotifyPlaylists?: string[]
  tracksData?: any[]
  submittedAt?: string
  spotifyAnalyzed?: boolean
  stats?: {
    playlists?: number
    tracks?: number
    [key: string]: any
  }
}

export interface Event {
  id: string
  name: string
  theme: string
  code: string
  date: string
  time: string
  location?: string
  status: EventStatus
  guestCount: number
  preferences: GuestPreferences[]
  connectedPlaylist?: any
}

export interface Track {
  id: string
  name: string
  artist: string
  album?: string
  durationMs?: number
  spotifyId?: string
}

export interface Playlist {
  id: string
  name: string
  trackCount: number
  duration: string
  tracks: Track[]
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'played' | 'queued'
export type VoteType = 'upvote' | 'downvote'

export interface SongRequest {
  id: string
  eventCode: string
  guestId: string
  spotifyTrackId?: string
  trackName: string
  artistName: string
  albumName?: string
  previewUrl?: string
  durationMs?: number
  status: RequestStatus
  voteCount: number
  downvoteCount: number
  tipAmount: number
  requesterName?: string
  submittedAt: string
  playedAt?: string
  metadata?: {
    bpm?: number
    key?: string
    energy?: number
    danceability?: number
    compatibilityScore?: number
    genre?: string[]
    [key: string]: any
  }
}

export interface RequestVote {
  id: string
  requestId: string
  guestId: string
  voteType: VoteType
  createdAt: string
}

export interface RequestSettings {
  eventCode: string
  requestsEnabled: boolean
  votingEnabled: boolean
  paidRequestsEnabled: boolean
  genreRestrictions?: string[]
  artistRestrictions?: string[]
  openTime?: string
  closeTime?: string
  minVoteThreshold: number
  maxRequestsPerGuest: number
  autoAcceptThreshold: number
  createdAt: string
  updatedAt: string
}

export interface RequestAnalytics {
  id: string
  eventCode: string
  metricName: string
  metricValue: number
  timestamp: string
  metadata?: {
    [key: string]: any
  }
}

