/**
 * Transition Helper Utilities
 * Provides functions for analyzing song transitions, BPM compatibility, and energy flow
 */

export type TransitionQuality = 'perfect' | 'seamless' | 'good' | 'acceptable' | 'challenging';
export type EnergyProgression = 'building' | 'maintaining' | 'winding_down';

export interface TransitionAnalysis {
  quality: TransitionQuality;
  qualityScore: number;
  bpmDifference: number;
  energyChange: number;
  progression: EnergyProgression;
  advice: string;
}

/**
 * Calculate transition quality between two tracks based on BPM and energy
 */
export function getTransitionQuality(
  currentBPM: number,
  nextBPM: number,
  currentEnergy: number = 75,
  nextEnergy: number = 75
): TransitionQuality {
  const bpmDiff = Math.abs(currentBPM - nextBPM);
  const energyDiff = nextEnergy - currentEnergy;
  
  // Perfect: Within ±5 BPM and energy change < 10
  if (bpmDiff <= 5 && Math.abs(energyDiff) <= 10) {
    return 'perfect';
  }
  
  // Seamless: Within ±10 BPM and gradual energy change
  if (bpmDiff <= 10 && Math.abs(energyDiff) <= 20) {
    return 'seamless';
  }
  
  // Good: Within ±15 BPM
  if (bpmDiff <= 15) {
    return 'good';
  }
  
  // Acceptable: Within ±25 BPM
  if (bpmDiff <= 25) {
    return 'acceptable';
  }
  
  // Challenging: > 25 BPM difference
  return 'challenging';
}

/**
 * Get numeric quality score (0-100) for a transition
 */
export function getTransitionScore(
  currentBPM: number,
  nextBPM: number,
  currentEnergy: number = 75,
  nextEnergy: number = 75,
  sameKey: boolean = false
): number {
  const bpmDiff = Math.abs(currentBPM - nextBPM);
  const energyDiff = Math.abs(nextEnergy - currentEnergy);
  
  // BPM score (max 40 points)
  let bpmScore = 0;
  if (bpmDiff <= 5) bpmScore = 40;
  else if (bpmDiff <= 10) bpmScore = 35;
  else if (bpmDiff <= 15) bpmScore = 30;
  else if (bpmDiff <= 25) bpmScore = 25;
  else bpmScore = Math.max(0, 30 - (bpmDiff - 15));
  
  // Energy score (max 30 points)
  let energyScore = 0;
  if (energyDiff <= 10) energyScore = 30;
  else if (energyDiff <= 20) energyScore = 25;
  else if (energyDiff <= 30) energyScore = 20;
  else energyScore = Math.max(0, 20 - (energyDiff - 20));
  
  // Key bonus (10 points)
  const keyScore = sameKey ? 10 : 0;
  
  // Base compatibility (20 points)
  const baseScore = 20;
  
  return Math.min(100, bpmScore + energyScore + keyScore + baseScore);
}

/**
 * Get color code for BPM difference indicator
 */
export function getBPMDifferenceColor(diff: number): string {
  if (diff <= 5) return 'green';
  if (diff <= 10) return 'lime';
  if (diff <= 15) return 'yellow';
  if (diff <= 25) return 'orange';
  return 'red';
}

/**
 * Determine energy progression type
 */
export function getEnergyProgression(
  currentEnergy: number,
  nextEnergy: number
): EnergyProgression {
  const diff = nextEnergy - currentEnergy;
  
  if (diff > 10) return 'building';
  if (diff < -10) return 'winding_down';
  return 'maintaining';
}

/**
 * Get full transition analysis with advice
 */
export function analyzeTransition(
  currentBPM: number,
  nextBPM: number,
  currentEnergy: number = 75,
  nextEnergy: number = 75,
  sameKey: boolean = false
): TransitionAnalysis {
  const bpmDiff = Math.abs(currentBPM - nextBPM);
  const energyChange = nextEnergy - currentEnergy;
  const quality = getTransitionQuality(currentBPM, nextBPM, currentEnergy, nextEnergy);
  const qualityScore = getTransitionScore(currentBPM, nextBPM, currentEnergy, nextEnergy, sameKey);
  const progression = getEnergyProgression(currentEnergy, nextEnergy);
  
  // Generate advice based on analysis
  let advice = '';
  const adviceParts: string[] = [];
  
  // BPM advice
  if (bpmDiff <= 5) {
    adviceParts.push('BPM nearly identical');
  } else if (bpmDiff <= 10) {
    adviceParts.push('BPM close match');
  } else if (bpmDiff <= 15) {
    adviceParts.push('BPM within acceptable range');
  } else if (bpmDiff <= 25) {
    adviceParts.push('BPM needs adjustment');
  } else {
    adviceParts.push('BPM jump - consider transition track');
  }
  
  // Energy advice
  if (Math.abs(energyChange) <= 10) {
    adviceParts.push('energy stays similar');
  } else if (energyChange > 10) {
    adviceParts.push(`${Math.round(energyChange)}% energy boost`);
  } else {
    adviceParts.push(`${Math.abs(Math.round(energyChange))}% energy drop`);
  }
  
  // Progression advice
  if (progression === 'building' && energyChange > 20) {
    adviceParts.push('big energy jump - good for peak moments');
  } else if (progression === 'winding_down' && energyChange < -20) {
    adviceParts.push('significant energy drop - better for set end');
  }
  
  // Key advice
  if (sameKey) {
    adviceParts.push('harmonic key match');
  }
  
  advice = adviceParts.join(' • ');
  
  return {
    quality,
    qualityScore,
    bpmDifference: bpmDiff,
    energyChange,
    progression,
    advice
  };
}

/**
 * Get transition quality badge styling
 */
export function getTransitionQualityBadge(quality: TransitionQuality): {
  label: string;
  className: string;
} {
  const badges: Record<TransitionQuality, { label: string; className: string }> = {
    perfect: { label: 'Perfect', className: 'bg-green-500/20 text-green-400 border-green-500/40' },
    seamless: { label: 'Seamless', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    good: { label: 'Good', className: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    acceptable: { label: 'Acceptable', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
    challenging: { label: 'Challenging', className: 'bg-orange-500/20 text-orange-400 border-orange-500/40' }
  };
  
  return badges[quality];
}

/**
 * Format a short transition advice string
 */
export function formatTransitionAdvice(analysis: TransitionAnalysis): string {
  return analysis.advice;
}




