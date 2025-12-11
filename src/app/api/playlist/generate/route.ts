// app/api/playlist/generate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { featuresFromSection, estimateTrackCountForSection, Section, Intensity } from "../../../../../lib/music";
import { authOptions } from "../../auth/[...nextauth]/route";

const SPOTIFY_API = "https://api.spotify.com/v1";

// Comprehensive list of valid Spotify genre seeds
// The /recommendations/available-genre-seeds endpoint is deprecated, so we use a hardcoded list
const VALID_SPOTIFY_GENRE_SEEDS = [
    "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal", "bluegrass", "blues",
    "bossanova", "brazil", "breakbeat", "british", "cantopop", "chicago-house", "children", "chill", "classical",
    "club", "comedy", "country", "dance", "dancehall", "death-metal", "deep-house", "detroit-techno", "disco",
    "disney", "drum-and-bass", "dub", "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro",
    "french", "funk", "garage", "german", "gospel", "goth", "grindcore", "groove", "grunge", "guitar",
    "happy", "hard-rock", "hardcore", "hardstyle", "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house",
    "idm", "indian", "indie", "indie-pop", "industrial", "iranian", "j-dance", "j-idol", "j-pop", "j-rock",
    "jazz", "k-pop", "kids", "latin", "latino", "malay", "mandopop", "metal", "metal-misc", "metalcore",
    "minimal-techno", "movies", "new-age", "new-release", "opera", "pagode", "party", "philippines-opm",
    "piano", "pop", "pop-film", "post-dubstep", "power-pop", "progressive-house", "psych-rock", "punk", "punk-rock",
    "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip", "rock", "rock-n-roll", "rockabilly", "romance",
    "sad", "salsa", "samba", "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep", "songwriter",
    "soul", "soundtracks", "spanish", "study", "summer", "swedish", "synth-pop", "tango", "techno", "trance",
    "trip-hop", "turkish", "work-out", "world-music"
];

function getValidGenreSeeds(): string[] {
    return VALID_SPOTIFY_GENRE_SEEDS;
}

function extractValidGenresFromMultiWord(rawGenres: string[], validSeeds: string[]): string[] {
    const validGenres: string[] = [];
    const validSeedsSet = new Set(validSeeds.map(g => g.toLowerCase()));
    
    for (const rawGenre of rawGenres) {
        if (!rawGenre || typeof rawGenre !== "string") continue;
        
        const lowerGenre = rawGenre.toLowerCase();
        
        // If it's already a valid single-word genre, use it
        if (!rawGenre.includes(" ") && validSeedsSet.has(lowerGenre)) {
            if (!validGenres.includes(lowerGenre)) {
                validGenres.push(lowerGenre);
            }
            continue;
        }
        
        // For multi-word genres, first try the hyphenated version (Spotify's format)
        // e.g., "jazz rap" -> "jazz-rap", "alternative hip hop" -> "alternative-hip-hop"
        const hyphenated = lowerGenre.replace(/\s+/g, "-");
        if (validSeedsSet.has(hyphenated)) {
            if (!validGenres.includes(hyphenated)) {
                validGenres.push(hyphenated);
            }
            continue; // Found the hyphenated version, don't split
        }
        
        // If hyphenated version doesn't exist, try splitting into individual words
        // This is a fallback - we prefer the full hyphenated genre
        const words = lowerGenre.split(/\s+/);
        for (const word of words) {
            // Check if the word itself is a valid genre
            if (validSeedsSet.has(word)) {
                if (!validGenres.includes(word)) {
                    validGenres.push(word);
                }
            }
        }
    }
    
    return validGenres;
}

async function getAccessTokenForCurrentUser(): Promise<string> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            console.error("No session found");
            throw new Error("Not authenticated");
        }
        if (!session.user) {
            console.error("Session exists but no user found");
            throw new Error("Not authenticated");
        }
        const token = (session.user as { accessToken?: string }).accessToken;
        if (!token) {
            console.error("Session user exists but no access token found");
            throw new Error("Missing Spotify access token in session");
        }
        return token;
    } catch (error) {
        console.error("Error getting access token:", error);
        throw error;
    }
}

async function spotifyGET<T>(url: string, token: string): Promise<T> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        let errorText = "";
        try {
            errorText = await res.text();
        } catch (e) {
            errorText = `Could not read error response: ${e}`;
        }
        const errorJson = errorText ? (() => {
            try {
                return JSON.parse(errorText);
            } catch {
                return errorText;
            }
        })() : "No error details";
        console.error(`Spotify GET failed for ${url}:`, {
            status: res.status,
            statusText: res.statusText,
            error: errorJson,
            headers: Object.fromEntries(res.headers.entries())
        });
        throw new Error(`Spotify GET failed: ${res.status} ${JSON.stringify(errorJson)}`);
    }
    return res.json();
}

async function spotifyPOST<T>(url: string, token: string, body: any): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Spotify POST failed for ${url}: ${res.status} ${errorText}`);
        throw new Error(`Spotify POST failed: ${res.status} ${errorText}`);
    }
    return res.json();
}

export async function POST(req: Request) {
    try {
        const { workoutId } = await req.json();
        if (!workoutId) return NextResponse.json({ error: "workoutId required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("spotify-swiss");
        const workout = await db.collection("workouts").findOne({ _id: new ObjectId(workoutId) });
        if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

        const token = await getAccessTokenForCurrentUser();

        // Step 3: pull taste seeds
        console.log("Fetching user profile...");
        const me = await spotifyGET<{ id: string; display_name?: string }>(`${SPOTIFY_API}/me`, token);
        console.log("User profile:", { id: me.id, display_name: me.display_name });
        
        // Fetch top artists and tracks - these might return 404 if user has no listening history
        let topArtists: { items: Array<{ id: string; genres?: string[] }> } = { items: [] };
        let topTracks: { items: Array<{ id: string }> } = { items: [] };
        
        try {
            console.log("Fetching top artists...");
            topArtists = await spotifyGET<{ items: Array<{ id: string; genres?: string[] }> }>(
                `${SPOTIFY_API}/me/top/artists?limit=5`, token
            );
            console.log(`Found ${topArtists.items.length} top artists`);
        } catch (error: any) {
            console.warn("Could not fetch top artists (user may not have listening history):", error.message);
            // Continue with empty array
        }
        
        try {
            console.log("Fetching top tracks...");
            topTracks = await spotifyGET<{ items: Array<{ id: string }> }>(
                `${SPOTIFY_API}/me/top/tracks?limit=5`, token
            );
            console.log(`Found ${topTracks.items.length} top tracks`);
        } catch (error: any) {
            console.warn("Could not fetch top tracks (user may not have listening history):", error.message);
            // Continue with empty array
        }

        // Spotify allows maximum 5 seeds total across all types (artists + tracks + genres)
        // Prioritize: artists (2) > tracks (2) > genres (1) = 5 total
        let seed_artists: string[] = [];
        let seed_tracks: string[] = [];
        let seed_genres: string[] = [];
        
        if (topArtists.items.length > 0) {
            seed_artists = topArtists.items.slice(0, 2).map(a => a.id); // Max 2 artists
        }
        
        if (topTracks.items.length > 0) {
            seed_tracks = topTracks.items.slice(0, 2).map(t => t.id); // Max 2 tracks
        }
        
        // Extract valid Spotify genre seeds from artist genres (including multi-word genres)
        if (topArtists.items.length > 0) {
            const rawGenres = topArtists.items.flatMap(a => a.genres || []);
            console.log("Raw genres from artists:", rawGenres);
            
            // Get valid Spotify genre seeds (hardcoded list since API endpoint is deprecated)
            const validGenreSeeds = getValidGenreSeeds();
            console.log(`Using ${validGenreSeeds.length} valid Spotify genre seeds`);
            
            // Check if hyphenated versions of multi-word genres exist in Spotify's list
            const hyphenatedAttempts = rawGenres
                .filter(g => g && typeof g === "string" && g.includes(" "))
                .map(g => g.toLowerCase().replace(/\s+/g, "-"));
            console.log("Checking hyphenated versions:", hyphenatedAttempts);
            const foundHyphenated = hyphenatedAttempts.filter(g => validGenreSeeds.includes(g));
            console.log("Found hyphenated genres in Spotify's list:", foundHyphenated);
            
            // Extract valid genres from multi-word genres
            const extractedGenres = extractValidGenresFromMultiWord(rawGenres, validGenreSeeds);
            console.log("Extracted valid genres from multi-word genres:", extractedGenres);
            
            // Use remaining seed slots for genres (max 1 to stay under 5 total)
            const remainingSlots = 5 - seed_artists.length - seed_tracks.length;
            if (remainingSlots > 0 && extractedGenres.length > 0) {
                seed_genres = extractedGenres.slice(0, Math.min(remainingSlots, 1)); // Max 1 genre
            }
            console.log("Final genre seeds to use:", seed_genres);
        }
        
        // Fallback to valid default genres if no valid genres found and we have room
        if (seed_genres.length === 0) {
            const remainingSlots = 5 - seed_artists.length - seed_tracks.length;
            if (remainingSlots > 0) {
                // Use valid Spotify genres (not "workout" which might not be valid)
                seed_genres = ["electronic"]; // Single valid genre
                console.log("Using default genre:", seed_genres);
            }
        }
        
        // Final validation: ensure we have at least 1 seed and max 5 total
        const totalSeeds = seed_artists.length + seed_tracks.length + seed_genres.length;
        if (totalSeeds === 0) {
            seed_genres = ["electronic"]; // Fallback to at least one seed
        } else if (totalSeeds > 5) {
            console.warn(`Total seeds (${totalSeeds}) exceeds Spotify limit of 5, truncating...`);
            // This shouldn't happen with our logic, but just in case
        }
        
        console.log("Final seeds:", {
            artists: seed_artists.length,
            tracks: seed_tracks.length,
            genres: seed_genres.length,
            total: seed_artists.length + seed_tracks.length + seed_genres.length
        });

        // Step 4: Get tracks for each section using Search API + Audio Features filtering
        // (Replacing deprecated recommendations endpoint)
        const sections: Section[] = workout.sections ?? [];
        
        if (sections.length === 0) {
            return NextResponse.json({ error: "Workout has no sections. Please add sections before generating a playlist." }, { status: 400 });
        }
        
        const uris: string[] = [];

        // Get related artists to expand our pool of tracks
        const relatedArtists: string[] = [];
        if (seed_artists.length > 0) {
            try {
                for (const artistId of seed_artists.slice(0, 2)) {
                    const related = await spotifyGET<{ artists: Array<{ id: string }> }>(
                        `${SPOTIFY_API}/artists/${artistId}/related-artists`,
                        token
                    );
                    relatedArtists.push(...related.artists.slice(0, 3).map(a => a.id));
                }
                console.log(`Found ${relatedArtists.length} related artists`);
            } catch (error: any) {
                console.warn("Could not fetch related artists:", error.message);
            }
        }

        // Combine seed artists with related artists for broader search
        const allArtistIds = [...seed_artists, ...relatedArtists].slice(0, 10);

        for (const s of sections) {
            if (!s.intensity || !["low", "medium", "high"].includes(s.intensity)) {
                console.warn(`Section ${s.name} has invalid intensity: ${s.intensity}, defaulting to medium`);
                s.intensity = "medium" as Intensity;
            }
            const features = featuresFromSection(s);
            const estimatedLimit = estimateTrackCountForSection(s);
            const tracksNeeded = Math.max(5, Math.min(estimatedLimit, 20));

            console.log(`Finding ${tracksNeeded} tracks for section ${s.name} with features:`, features);

            // Strategy: Search for tracks by artist/genre, then filter by audio features
            const candidateTracks: Array<{ id: string; uri: string }> = [];

            // Search by artists - get top tracks from seed artists and related artists
            if (allArtistIds.length > 0) {
                for (const artistId of allArtistIds.slice(0, 5)) {
                    try {
                        const artistTracks = await spotifyGET<{ tracks: Array<{ id: string; uri: string }> }>(
                            `${SPOTIFY_API}/artists/${artistId}/top-tracks?market=US`,
                            token
                        );
                        if (artistTracks.tracks) {
                            candidateTracks.push(...artistTracks.tracks.map(t => ({ id: t.id, uri: t.uri })));
                        }
                    } catch (error: any) {
                        console.warn(`Could not fetch top tracks for artist ${artistId}:`, error.message);
                    }
                }
            }

            // Search by genre if we have one
            if (seed_genres.length > 0 && candidateTracks.length < tracksNeeded * 2) {
                try {
                    const genreQuery = seed_genres[0];
                    const searchResults = await spotifyGET<{ tracks: { items: Array<{ id: string; uri: string }> } }>(
                        `${SPOTIFY_API}/search?q=genre:${encodeURIComponent(genreQuery)}&type=track&limit=50&market=US`,
                        token
                    );
                    if (searchResults.tracks && searchResults.tracks.items) {
                        candidateTracks.push(...searchResults.tracks.items.map(t => ({ id: t.id, uri: t.uri })));
                    }
                } catch (error: any) {
                    console.warn(`Could not search by genre:`, error.message);
                }
            }

            // Remove duplicates
            const uniqueTracks = Array.from(
                new Map(candidateTracks.map(t => [t.id, t])).values()
            );

            if (uniqueTracks.length === 0) {
                console.warn(`No candidate tracks found for section ${s.name}`);
                continue;
            }

            console.log(`Found ${uniqueTracks.length} candidate tracks for section ${s.name}, filtering by audio features...`);

            // Get audio features for candidate tracks (batch of up to 100)
            const trackIds = uniqueTracks.slice(0, 100).map(t => t.id);
            let audioFeatures: Array<{ id: string; tempo: number; energy: number; valence: number }> = [];
            
            try {
                const featuresResponse = await spotifyGET<{ audio_features: Array<{ id: string; tempo: number; energy: number; valence: number } | null> }>(
                    `${SPOTIFY_API}/audio-features?ids=${trackIds.join(",")}`,
                    token
                );
                audioFeatures = featuresResponse.audio_features.filter(
                    (f): f is { id: string; tempo: number; energy: number; valence: number } => 
                        f !== null && f.tempo > 0
                );
            } catch (error: any) {
                console.warn(`Could not get audio features:`, error.message);
                // Fallback: use tracks without filtering
                const tracksToAdd = Math.min(uniqueTracks.length, tracksNeeded);
                for (let i = 0; i < tracksToAdd; i++) {
                    uris.push(uniqueTracks[i].uri);
                }
                console.log(`Added ${tracksToAdd} tracks for section ${s.name} (without audio feature filtering)`);
                continue;
            }

            // Filter tracks by audio features
            const matchingTracks = audioFeatures
                .filter(f => {
                    const tempo = f.tempo;
                    const energy = f.energy;
                    const valence = f.valence;
                    return (
                        tempo >= features.min_tempo &&
                        tempo <= features.max_tempo &&
                        energy >= features.target_energy - 0.2 && // Allow some flexibility
                        energy <= features.target_energy + 0.2 &&
                        valence >= features.min_valence &&
                        valence <= features.max_valence
                    );
                })
                .sort((a, b) => {
                    // Sort by how well they match target energy
                    const aEnergyDiff = Math.abs(a.energy - features.target_energy);
                    const bEnergyDiff = Math.abs(b.energy - features.target_energy);
                    return aEnergyDiff - bEnergyDiff;
                })
                .slice(0, tracksNeeded);

            console.log(`Filtered to ${matchingTracks.length} matching tracks for section ${s.name}`);

            // If we don't have enough matching tracks, relax the filters
            if (matchingTracks.length < tracksNeeded) {
                console.log(`Only found ${matchingTracks.length} tracks, relaxing filters...`);
                const relaxedTracks = audioFeatures
                    .filter(f => {
                        const tempo = f.tempo;
                        return (
                            tempo >= features.min_tempo &&
                            tempo <= features.max_tempo
                        );
                    })
                    .sort((a, b) => {
                        const aEnergyDiff = Math.abs(a.energy - features.target_energy);
                        const bEnergyDiff = Math.abs(b.energy - features.target_energy);
                        return aEnergyDiff - bEnergyDiff;
                    })
                    .slice(0, tracksNeeded);

                // Add relaxed tracks that aren't already included
                const existingIds = new Set(matchingTracks.map(t => t.id));
                for (const track of relaxedTracks) {
                    if (!existingIds.has(track.id) && matchingTracks.length < tracksNeeded) {
                        matchingTracks.push(track);
                    }
                }
            }

            // Get URIs for matching tracks
            const trackIdToUri = new Map(uniqueTracks.map(t => [t.id, t.uri]));
            for (const track of matchingTracks) {
                const uri = trackIdToUri.get(track.id);
                if (uri) {
                    uris.push(uri);
                }
            }

            console.log(`Added ${matchingTracks.length} tracks for section ${s.name}`);
        }

        // Step 5: create playlist and add tracks (batch in 100s)
        // Spotify API requires the user's Spotify username (display_name) for /users/{user_id}/playlists
        // If display_name is not available, we'll try using the ID, but it might fail
        // Alternative: Some accounts might need to use a different endpoint format
        const userId = me.display_name || me.id;
        const playlistUrl = `${SPOTIFY_API}/users/${encodeURIComponent(userId)}/playlists`;
        console.log(`Creating playlist for user: ${userId} (display_name: ${me.display_name}, id: ${me.id}) at ${playlistUrl}`);
        
        try {
            const playlist = await spotifyPOST<{ id: string; external_urls: { spotify: string } }>(
                playlistUrl,
                token,
                {
                    name: `${workout.name} • Auto-generated`,
                    description: `Generated for ${workout.type} workout via Spotify Swiss`,
                    public: false,
                }
            );
            console.log("Playlist created successfully:", playlist.id);
            
            // add tracks in batches
            for (let i = 0; i < uris.length; i += 100) {
                const slice = uris.slice(i, i + 100);
                await spotifyPOST(`${SPOTIFY_API}/playlists/${playlist.id}/tracks`, token, { uris: slice });
            }

            return NextResponse.json({ playlistId: playlist.id, playlistUrl: playlist.external_urls.spotify });
        } catch (playlistError: any) {
            // If using display_name failed and we have an ID, try with ID directly
            if (me.display_name && me.id !== me.display_name) {
                console.log("Retrying with user ID instead of display_name...");
                const retryUrl = `${SPOTIFY_API}/users/${encodeURIComponent(me.id)}/playlists`;
                const playlist = await spotifyPOST<{ id: string; external_urls: { spotify: string } }>(
                    retryUrl,
                    token,
                    {
                        name: `${workout.name} • Auto-generated`,
                        description: `Generated for ${workout.type} workout via Spotify Swiss`,
                        public: false,
                    }
                );
                console.log("Playlist created successfully with ID:", playlist.id);
                
                // add tracks in batches
                for (let i = 0; i < uris.length; i += 100) {
                    const slice = uris.slice(i, i + 100);
                    await spotifyPOST(`${SPOTIFY_API}/playlists/${playlist.id}/tracks`, token, { uris: slice });
                }

                return NextResponse.json({ playlistId: playlist.id, playlistUrl: playlist.external_urls.spotify });
            }
            throw playlistError;
        }

    } catch (err: any) {
        console.error("Full error object:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        const errorMessage = err.message || "Failed to generate playlist";
        return NextResponse.json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === "development" ? err.stack : undefined
        }, { status: 500 });
    }
}
