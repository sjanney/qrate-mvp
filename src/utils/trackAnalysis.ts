/**
 * Mock AI track analysis utilities
 * Provides simulated BPM, key, energy, and compatibility analysis
 */

export interface TrackAnalysis {
  bpm: number;
  key: string;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  genre?: string[];
  mood?: string[];
}

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'R&B', 'Country', 'Jazz', 
  'Classical', 'Latin', 'Reggae', 'Blues', 'Folk', 'Metal', 'Punk'
];
const MOODS = [
  'Happy', 'Energetic', 'Relaxed', 'Melancholic', 'Romantic', 
  'Aggressive', 'Peaceful', 'Uplifting', 'Somber', 'Playful'
];

/**
 * Analyze a track and return mock metadata
 */
export function analyzeTrack(trackName: string, artistName: string): TrackAnalysis {
  // Generate consistent but varied results based on track/artist hash
  const hash = hashString(`${trackName}${artistName}`);
  
  // BPM range: 60-180, weighted towards common ranges
  const bpm = 60 + (hash % 120) + (hash % 20); // 60-180 range
  const normalizedBPM = Math.min(180, Math.max(60, bpm));
  
  // Key selection
  const keyIndex = hash % MUSICAL_KEYS.length;
  const key = MUSICAL_KEYS[keyIndex];
  
  // Energy: 0-100, influenced by BPM
  const baseEnergy = Math.min(100, 30 + (normalizedBPM - 60) / 2 + (hash % 30));
  const energy = Math.min(100, Math.max(0, baseEnergy));
  
  // Danceability: 0-100, correlated with energy
  const danceability = Math.min(100, Math.max(0, energy * 0.8 + (hash % 20)));
  
  // Other audio features (0-1 scale)
  const valence = (hash % 80) / 100 + 0.2; // 0.2-1.0
  const acousticness = 1 - (energy / 120); // Inverse correlation
  const instrumentalness = (hash % 30) / 100; // 0-0.3 for most tracks
  const liveness = (hash % 20) / 100 + 0.1; // 0.1-0.3
  const speechiness = (hash % 15) / 100; // 0-0.15
  
  // Genre inference (mock - based on artist name patterns and hash)
  const genreCount = 1 + (hash % 3); // 1-3 genres
  const selectedGenres: string[] = [];
  for (let i = 0; i < genreCount; i++) {
    const genreIndex = (hash + i * 7) % GENRES.length;
    if (!selectedGenres.includes(GENRES[genreIndex])) {
      selectedGenres.push(GENRES[genreIndex]);
    }
  }
  
  // Mood inference
  const moodCount = 1 + (hash % 2); // 1-2 moods
  const selectedMoods: string[] = [];
  for (let i = 0; i < moodCount; i++) {
    const moodIndex = (hash + i * 11) % MOODS.length;
    if (!selectedMoods.includes(MOODS[moodIndex])) {
      selectedMoods.push(MOODS[moodIndex]);
    }
  }
  
  return {
    bpm: Math.round(normalizedBPM),
    key,
    energy: Math.round(energy),
    danceability: Math.round(danceability),
    valence: Math.round(valence * 100) / 100,
    acousticness: Math.round(acousticness * 100) / 100,
    instrumentalness: Math.round(instrumentalness * 100) / 100,
    liveness: Math.round(liveness * 100) / 100,
    speechiness: Math.round(speechiness * 100) / 100,
    genre: selectedGenres,
    mood: selectedMoods
  };
}

/**
 * Calculate compatibility score between two tracks (0-100)
 */
export function calculateCompatibility(track1: TrackAnalysis, track2: TrackAnalysis): number {
  let score = 0;
  let factors = 0;
  
  // BPM compatibility (within 10 BPM = high, 20 = medium, 30+ = low)
  const bpmDiff = Math.abs(track1.bpm - track2.bpm);
  const bpmScore = bpmDiff <= 10 ? 100 : bpmDiff <= 20 ? 80 : bpmDiff <= 30 ? 60 : 40;
  score += bpmScore * 0.3; factors += 0.3;
  
  // Key compatibility (same key = perfect, relative keys = good)
  const key1Index = MUSICAL_KEYS.indexOf(track1.key);
  const key2Index = MUSICAL_KEYS.indexOf(track2.key);
  const keyDiff = Math.min(Math.abs(key1Index - key2Index), 12 - Math.abs(key1Index - key2Index));
  const keyScore = keyDiff === 0 ? 100 : keyDiff <= 2 ? 80 : keyDiff <= 4 ? 60 : 40;
  score += keyScore * 0.2; factors += 0.2;
  
  // Energy compatibility (similar energy = good)
  const energyDiff = Math.abs(track1.energy - track2.energy);
  const energyScore = energyDiff <= 10 ? 100 : energyDiff <= 20 ? 80 : energyDiff <= 30 ? 60 : 40;
  score += energyScore * 0.2; factors += 0.2;
  
  // Genre overlap
  const genreOverlap = track1.genre?.some(g => track2.genre?.includes(g)) ? 1 : 0;
  score += genreOverlap * 100 * 0.15; factors += 0.15;
  
  // Danceability similarity
  const danceabilityDiff = Math.abs(track1.danceability - track2.danceability);
  const danceScore = danceabilityDiff <= 10 ? 100 : danceabilityDiff <= 20 ? 80 : 60;
  score += danceScore * 0.15; factors += 0.15;
  
  return Math.round(score / factors);
}

/**
 * Simple string hash function for consistent results
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get "best next track" from a pool of requests based on current track
 */
export function findBestNextTrack(
  currentTrack: TrackAnalysis | null,
  candidateRequests: Array<{ trackName: string; artistName: string; voteCount: number }>
): { track: { trackName: string; artistName: string }; compatibilityScore: number; reason: string } | null {
  if (candidateRequests.length === 0) return null;
  
  if (!currentTrack) {
    // No current track - return highest voted
    const sorted = [...candidateRequests].sort((a, b) => b.voteCount - a.voteCount);
    return {
      track: { trackName: sorted[0].trackName, artistName: sorted[0].artistName },
      compatibilityScore: 100,
      reason: 'Most popular request'
    };
  }
  
  // Analyze all candidates and find best match
  const candidatesWithScores = candidateRequests.map(request => {
    const analysis = analyzeTrack(request.trackName, request.artistName);
    const compatibility = calculateCompatibility(currentTrack, analysis);
    const popularityBonus = Math.min(request.voteCount * 5, 20); // Up to 20 point bonus
    const totalScore = compatibility + popularityBonus;
    
    return {
      track: { trackName: request.trackName, artistName: request.artistName },
      analysis,
      compatibility,
      popularityBonus,
      totalScore,
      voteCount: request.voteCount
    };
  });
  
  // Sort by total score
  candidatesWithScores.sort((a, b) => b.totalScore - a.totalScore);
  const best = candidatesWithScores[0];
  
  const reasons: string[] = [];
  if (best.compatibility >= 80) reasons.push('Perfect musical match');
  if (best.voteCount > 0) reasons.push(`${best.voteCount} crowd votes`);
  if (Math.abs(best.analysis.bpm - currentTrack.bpm) <= 5) reasons.push('Similar tempo');
  if (best.analysis.genre?.some(g => currentTrack.genre?.includes(g))) {
    reasons.push('Genre match');
  }
  
  return {
    track: best.track,
    compatibilityScore: best.compatibility,
    reason: reasons.join(', ') || 'Good fit for current vibe'
  };
}




