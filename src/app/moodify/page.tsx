// app/moodify/page.tsx
"use client";

import {useEffect, useState, useMemo} from "react";
import MoodRing3D from "../../components/moodify/MoodRing3D";

type Track = {
    id: string;
    title: string;
    artist: string;
    mood: string;
    moodConfidence?: number;
    titlePos?: number; // Fallback if moodConfidence not available
    valence?: number;
    energy?: number;
};

// Color mapping for each mood
const MOOD_COLORS: Record<string, string> = {
    // Single word moods (from API)
    "happy": "#FFD700",                  // Gold/Yellow - joyful
    "energetic": "#FF6B35",             // Orange Red - high energy
    "sad": "#4A90E2",                   // Blue - melancholic
    "melancholic": "#5B7DB8",           // Slate Blue - melancholic
    "romantic": "#FF69B4",              // Hot Pink - romantic
    "chill": "#90EE90",                 // Light Green - relaxed
    "tense": "#FF4500",                 // Orange Red - intensity
    "intense": "#FF4500",               // Orange Red - intensity
    "wistful": "#87CEEB",               // Sky Blue - nostalgic
    "bittersweet": "#DDA0DD",           // Plum - mixed emotions
    "mixed": "#9370DB",                 // Medium Purple - balanced
    "neutral": "#9370DB",               // Medium Purple - balanced
    // Compound moods (if API returns them)
    "happy/energetic": "#FFD700",       // Gold/Yellow - energetic and joyful
    "happy/chill": "#90EE90",           // Light Green - relaxed happiness
    "tense/intense": "#FF4500",         // Orange Red - intensity
    "sad/chill": "#4169E1",             // Royal Blue - melancholic calm
    "mixed/neutral": "#9370DB",         // Medium Purple - balanced
    // Fallback for any unmapped moods
    "default": "#808080"                // Gray
};

// Function to determine overall mood label based on distribution
function getOverallMood(tracks: Track[]): { label: string; color: string } {
    if (tracks.length === 0) {
        return { label: "No Data", color: "#808080" };
    }

    // Count moods
    const moodCounts = tracks.reduce((acc, track) => {
        const mood = track.mood.toLowerCase();
        acc[mood] = (acc[mood] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Find dominant mood
    const sortedMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1]);

    if (sortedMoods.length === 0) {
        return { label: "Unknown", color: "#808080" };
    }

    const [dominantMood, count] = sortedMoods[0];
    const percentage = (count / tracks.length) * 100;

    // If one mood dominates (>50%), use that
    if (percentage > 50) {
        const color = MOOD_COLORS[dominantMood] || MOOD_COLORS["default"];
        return { 
            label: dominantMood.charAt(0).toUpperCase() + dominantMood.slice(1),
            color 
        };
    }

    // If top 2 moods together are >70%, describe as mixed
    if (sortedMoods.length >= 2) {
        const topTwoPercentage = ((sortedMoods[0][1] + sortedMoods[1][1]) / tracks.length) * 100;
        if (topTwoPercentage > 70) {
            // Blend the top two moods
            const color1 = MOOD_COLORS[sortedMoods[0][0]] || MOOD_COLORS["default"];
            const color2 = MOOD_COLORS[sortedMoods[1][0]] || MOOD_COLORS["default"];
            const rgb1 = hexToRgb(color1);
            const rgb2 = hexToRgb(color2);
            const blended = `rgb(${Math.round((rgb1.r + rgb2.r) / 2)}, ${Math.round((rgb1.g + rgb2.g) / 2)}, ${Math.round((rgb1.b + rgb2.b) / 2)})`;
            return { 
                label: `${sortedMoods[0][0].charAt(0).toUpperCase() + sortedMoods[0][0].slice(1)} / ${sortedMoods[1][0].charAt(0).toUpperCase() + sortedMoods[1][0].slice(1)}`,
                color: blended 
            };
        }
    }

    // Otherwise, use blended color from all tracks
    const blendedColor = blendMoodColors(tracks);
    return { 
        label: "Mixed Moods",
        color: blendedColor 
    };
}

// Function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 };
}

// Function to blend colors based on weighted confidence
function blendMoodColors(tracks: Track[]): string {
    if (tracks.length === 0) return "#808080";
    
    let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
    
    tracks.forEach(track => {
        const moodKey = track.mood.toLowerCase();
        const moodColor = MOOD_COLORS[moodKey] || MOOD_COLORS["default"];
        const rgb = hexToRgb(moodColor);
        // Use moodConfidence if available, otherwise use titlePos, or default to 1.0
        const weight = track.moodConfidence ?? track.titlePos ?? 1.0;
        
        totalR += rgb.r * weight;
        totalG += rgb.g * weight;
        totalB += rgb.b * weight;
        totalWeight += weight;
    });
    
    if (totalWeight === 0) return "#808080";
    
    const avgR = Math.round(totalR / totalWeight);
    const avgG = Math.round(totalG / totalWeight);
    const avgB = Math.round(totalB / totalWeight);
    
    return `rgb(${avgR}, ${avgG}, ${avgB})`;
}

// Function to get mood color
function getMoodColor(mood: string): string {
    return MOOD_COLORS[mood.toLowerCase()] || MOOD_COLORS["default"];
}

// Function to determine if a color is light (for text contrast)
function isLightColor(color: string): boolean {
    let r: number, g: number, b: number;
    
    // Handle RGB format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        [, r, g, b] = rgbMatch.map(Number);
    } else {
        // Handle hex format
        const rgb = hexToRgb(color);
        r = rgb.r;
        g = rgb.g;
        b = rgb.b;
    }
    
    // Calculate relative luminance (WCAG formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

// Function to create a conic gradient for mood ring segments
function createMoodRingGradient(tracks: Track[]): string {
    if (tracks.length === 0) return "conic-gradient(#808080 0deg 360deg)";
    
    // Calculate mood distribution
    const moodCounts = tracks.reduce((acc, track) => {
        const mood = track.mood.toLowerCase();
        acc[mood] = (acc[mood] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    // Sort moods by count (for consistent ordering)
    const sortedMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedMoods.length === 0) {
        return "conic-gradient(#808080 0deg 360deg)";
    }
    
    // Build conic gradient stops
    let currentAngle = 0;
    const gradientStops: string[] = [];
    
    sortedMoods.forEach(([mood, count]) => {
        const percentage = (count / tracks.length) * 100;
        const angle = (percentage / 100) * 360;
        const color = MOOD_COLORS[mood] || MOOD_COLORS["default"];
        const endAngle = currentAngle + angle;
        
        gradientStops.push(`${color} ${currentAngle}deg ${endAngle}deg`);
        currentAngle = endAngle;
    });
    
    // Ensure we complete the circle (handle rounding errors)
    if (currentAngle < 360) {
        const lastMood = sortedMoods[sortedMoods.length - 1][0];
        const lastColor = MOOD_COLORS[lastMood] || MOOD_COLORS["default"];
        gradientStops.push(`${lastColor} ${currentAngle}deg 360deg`);
    }
    
    return `conic-gradient(${gradientStops.join(", ")})`;
}

// Function to get dominant color for text contrast (from the largest segment)
function getDominantMoodColor(tracks: Track[]): string {
    if (tracks.length === 0) return "#808080";
    
    const moodCounts = tracks.reduce((acc, track) => {
        const mood = track.mood.toLowerCase();
        acc[mood] = (acc[mood] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const sortedMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedMoods.length === 0) return "#808080";
    
    const dominantMood = sortedMoods[0][0];
    return MOOD_COLORS[dominantMood] || MOOD_COLORS["default"];
}

export default function MoodifyPage() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(false);
    const [usePlaylist, setUsePlaylist] = useState(false);
    const [playlistId, setPlaylistId] = useState("");
    const [limit, setLimit] = useState(20);

    const analyze = async () => {
        setLoading(true);
        const res = await fetch("/api/moodify", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                use_playlist: usePlaylist,
                playlist_id: usePlaylist ? playlistId : null,
                limit,
            }),
        });
        const data = await res.json();
        setTracks(data?.tracks || []);
        setLoading(false);
    };

    useEffect(() => {
        analyze();
    }, []); // auto-run on load

    // Calculate overall mood and color
    const overallMood = useMemo(() => getOverallMood(tracks), [tracks]);
    const moodRingGradient = useMemo(() => createMoodRingGradient(tracks), [tracks]);
    const dominantColor = useMemo(() => getDominantMoodColor(tracks), [tracks]);

    // Calculate mood distribution
    const moodDistribution = useMemo(() => {
        const distribution = tracks.reduce((acc, track) => {
            const mood = track.mood.toLowerCase();
            if (!acc[mood]) {
                acc[mood] = { count: 0, totalConfidence: 0, color: getMoodColor(track.mood) };
            }
            acc[mood].count++;
            acc[mood].totalConfidence += track.moodConfidence ?? track.titlePos ?? 1.0;
            return acc;
        }, {} as Record<string, { count: number; totalConfidence: number; color: string }>);
        
        return Object.entries(distribution)
            .sort((a, b) => b[1].count - a[1].count);
    }, [tracks]);

    return (
        <main className="max-w-6xl mx-auto p-6 md:p-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Moodify</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <div className="flex flex-wrap gap-4 items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={usePlaylist}
                            onChange={e => setUsePlaylist(e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use playlist</span>
                    </label>
                    <input
                        className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-80 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Playlist ID or URL"
                        value={playlistId}
                        onChange={e => setPlaylistId(e.target.value)}
                        disabled={!usePlaylist}
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Limit:</label>
                        <input
                            type="number"
                            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-20 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            value={limit}
                            min={1} max={50}
                            onChange={e => setLimit(parseInt(e.target.value || "20", 10))}
                        />
                    </div>
                    <button
                        onClick={analyze}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                        disabled={loading}
                    >
                        {loading ? "Analyzing..." : "Analyze"}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Analyzing your tracks...</p>
                </div>
            )}

            {!loading && tracks.length > 0 && (
                <>
                    {/* Mood Ring Visualization */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
                        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                            Your Mood Ring
                        </h2>
                        <div className="flex items-center justify-center gap-8 flex-wrap">
                            {/* Main Mood Ring Circle - 3D Visualization */}
                            <MoodRing3D
                                tracks={tracks}
                                moodColors={MOOD_COLORS}
                                overallMoodLabel={overallMood.label}
                                trackCount={tracks.length}
                            />
                            
                            {/* Color Breakdown */}
                            <div className="flex-1 min-w-[200px]">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                    Mood Distribution
                                </h3>
                                <div className="space-y-2">
                                    {moodDistribution.map(([mood, data]) => {
                                        const percentage = (data.count / tracks.length) * 100;
                                        return (
                                            <div key={mood} className="flex items-center gap-3">
                                                <div 
                                                    className="w-5 h-5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: data.color }}
                                                ></div>
                                                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize flex-1">
                                                    {mood.replace("/", " / ")}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {data.count} ({percentage.toFixed(0)}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Track Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Artist</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Mood</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {tracks.map((t, index) => (
                                    <tr 
                                        key={t.id} 
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">{t.artist}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span 
                                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize text-white"
                                                style={{ 
                                                    backgroundColor: getMoodColor(t.mood),
                                                    opacity: 0.9
                                                }}
                                            >
                                                {t.mood}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                                                    <div 
                                                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                                                        style={{ width: `${((t.moodConfidence ?? t.titlePos ?? 1.0) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {((t.moodConfidence ?? t.titlePos ?? 1.0) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
            )}

            {!loading && tracks.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No tracks found. Click "Analyze" to get started.</p>
                </div>
            )}
        </main>
    );
}
