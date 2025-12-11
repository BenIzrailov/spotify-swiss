// lib/music.ts
export type Intensity = "low" | "medium" | "high";
export type Section = { name: string; duration?: number; intensity: Intensity; rounds?: number; work?: number; rest?: number };

export type FeatureTargets = {
    min_tempo: number;
    max_tempo: number;
    target_energy: number;        // Spotify allows target_*
    min_valence: number;
    max_valence: number;
};

const MAP: Record<Intensity, FeatureTargets> = {
    low:    { min_tempo: 80,  max_tempo:110, target_energy:0.3, min_valence:0.3, max_valence:0.6 },
    medium: { min_tempo:110,  max_tempo:130, target_energy:0.55, min_valence:0.4, max_valence:0.7 },
    high:   { min_tempo:130,  max_tempo:170, target_energy:0.9, min_valence:0.6, max_valence:1.0 },
};

export function featuresFromSection(s: Section): FeatureTargets {
    return MAP[s.intensity];
}

// Optional helpers:
export function sectionEffectiveSeconds(s: Section): number {
    // Supports both duration-based and HIIT rounds/work/rest
    if (typeof s.duration === "number" && s.duration > 0) return s.duration;
    if (s.rounds && s.work && s.rest !== undefined) return s.rounds * (s.work + s.rest);
    return 180; // sensible default
}

// rough #tracks: avg ~3.5min = 210s
export function estimateTrackCountForSection(s: Section, avgSecondsPerTrack = 210): number {
    const secs = sectionEffectiveSeconds(s);
    return Math.max(1, Math.ceil(secs / avgSecondsPerTrack));
}
